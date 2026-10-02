import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import {
  createEarning,
  createEscrowTransaction,
  createNotification,
  createOffer,
  createProblem,
  createSolution,
  getClientProblems,
  getCrawledProblemById,
  getEarningStats,
  getEarningsForSolver,
  getEscrowByProblemId,
  getOfferById,
  getOffersByProblem,
  getOffersByUser,
  getNotificationsForUser,
  getProblemById,
  getProblemStats,
  getSolutionById,
  getSolutionsByProblemId,
  getUnreadNotificationCount,
  getUserById,
  incrementProblemViewCount,
  listCrawledProblems,
  listProblems,
  markAllNotificationsRead,
  markCrawledProblemImported,
  markNotificationRead,
  updateEscrowStatus,
  updateOfferCounterOffer,
  updateOfferStatus,
  updateProblemStatus,
  updateSolution,
} from "./db";
import { PROBLEM_CATEGORIES } from "../drizzle/schema";
import { runAICrawler } from "./crawler.ts";
import { verifyWithAI } from "./verifier.ts";
import { createEscrowPaymentIntent } from "./stripe.ts";

// Helper: check if user is owner/admin
function requireAdmin(ctx: any) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Problems ───────────────────────────────────────────────────────────
  problems: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.enum(PROBLEM_CATEGORIES).optional(),
          status: z
            .enum(["open", "in_review", "solution_submitted", "verifying", "solved", "closed", "refunded"])
            .optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return listProblems(input);
      }),

    stats: publicProcedure.query(async () => {
      return getProblemStats();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const problem = await getProblemById(input.id);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });
        await incrementProblemViewCount(input.id);
        const sols = await getSolutionsByProblemId(input.id);
        const escrow = await getEscrowByProblemId(input.id);
        return { problem, solutions: sols, escrow };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(10).max(512),
          description: z.string().min(20),
          category: z.enum(PROBLEM_CATEGORIES),
          paymentOffer: z.number().min(1),
          deadline: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const problem = await createProblem({
          title: input.title,
          description: input.description,
          category: input.category,
          paymentOffer: String(input.paymentOffer),
          clientId: ctx.user.id,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
          tags: input.tags ? JSON.stringify(input.tags) : undefined,
          source: "direct",
        });

        // Notify owner of new problem
        const ownerUser = await getUserById(1);
        if (ownerUser) {
          await createNotification({
            userId: ownerUser.id,
            type: "new_problem",
            title: "New Problem Posted",
            message: `"${input.title}" — $${input.paymentOffer} offered`,
            problemId: undefined,
          });
        }
        await notifyOwner({
          title: "🆕 New Problem on SolveX",
          content: `"${input.title}" — $${input.paymentOffer} offered by ${ctx.user.name ?? "a client"}`,
        });

        return problem;
      }),

    myProblems: protectedProcedure.query(async ({ ctx }) => {
      return getClientProblems(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["closed", "refunded"]) }))
      .mutation(async ({ ctx, input }) => {
        const problem = await getProblemById(input.id);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });
        if (problem.clientId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateProblemStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ─── Solutions ──────────────────────────────────────────────────────────
  solutions: router({
    submit: protectedProcedure
      .input(
        z.object({
          problemId: z.number(),
          content: z.string().min(20),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const problem = await getProblemById(input.problemId);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });
        if (problem.status === "solved") throw new TRPCError({ code: "BAD_REQUEST", message: "Already solved" });

        const solution = await createSolution({
          problemId: input.problemId,
          solverId: ctx.user.id,
          content: input.content,
          status: "pending",
        });

        await updateProblemStatus(input.problemId, "solution_submitted");

        // Notify client if they exist
        if (problem.clientId) {
          await createNotification({
            userId: problem.clientId,
            type: "solution_submitted",
            title: "Solution Submitted",
            message: `A solution has been submitted for your problem: "${problem.title}"`,
            problemId: input.problemId,
          });
        }

        return solution;
      }),

    getByProblem: publicProcedure
      .input(z.object({ problemId: z.number() }))
      .query(async ({ input }) => {
        return getSolutionsByProblemId(input.problemId);
      }),
  }),

  // ─── Verification ───────────────────────────────────────────────────────
  verification: router({
    verify: protectedProcedure
      .input(z.object({ solutionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const solution = await getSolutionById(input.solutionId);
        if (!solution) throw new TRPCError({ code: "NOT_FOUND" });

        const problem = await getProblemById(solution.problemId);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });

        // Update to verifying state
        await updateSolution(input.solutionId, { status: "verifying" });
        await updateProblemStatus(problem.id, "verifying");

        // Run AI verification
        const result = await verifyWithAI(problem.description, solution.content);

        const isApproved = result.score >= 70;
        await updateSolution(input.solutionId, {
          status: isApproved ? "approved" : "rejected",
          verificationScore: String(result.score),
          verificationNotes: result.notes,
          verifiedAt: new Date(),
        });

        if (isApproved) {
          await updateProblemStatus(problem.id, "solved");

          // Release escrow
          const escrow = await getEscrowByProblemId(problem.id);
          if (escrow && escrow.status === "held") {
            await updateEscrowStatus(escrow.id, {
              status: "released",
              releasedAt: new Date(),
            });
            // Record earning
            await createEarning({
              solverId: ctx.user.id,
              problemId: problem.id,
              solutionId: input.solutionId,
              amount: escrow.amount,
              currency: escrow.currency,
              status: "pending",
            });
          }

          // Notify client
          if (problem.clientId) {
            await createNotification({
              userId: problem.clientId,
              type: "solution_verified",
              title: "Solution Verified ✓",
              message: `Your problem "${problem.title}" has been solved and verified! Payment released.`,
              problemId: problem.id,
            });
          }
        } else {
          await updateProblemStatus(problem.id, "open");
          if (problem.clientId) {
            await createNotification({
              userId: problem.clientId,
              type: "solution_submitted",
              title: "Solution Under Review",
              message: `The solution for "${problem.title}" did not pass verification. We are working on a better solution.`,
              problemId: problem.id,
            });
          }
        }

        return { approved: isApproved, score: result.score, notes: result.notes };
      }),
  }),

  // ─── Escrow ─────────────────────────────────────────────────────────────
  escrow: router({
    create: protectedProcedure
      .input(
        z.object({
          problemId: z.number(),
          amount: z.number().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const problem = await getProblemById(input.problemId);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });
        if (problem.clientId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const existing = await getEscrowByProblemId(input.problemId);
        if (existing && (existing.status === "held" || existing.status === "released")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escrow already exists for this problem" });
        }

        const escrow = await createEscrowTransaction({
          problemId: input.problemId,
          clientId: ctx.user.id,
          amount: String(input.amount),
          status: "pending",
        });

        return escrow;
      }),

    confirmPayment: protectedProcedure
      .input(z.object({ escrowId: z.number(), paymentIntentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateEscrowStatus(input.escrowId, {
          status: "held",
          stripePaymentIntentId: input.paymentIntentId,
        });
        return { success: true };
      }),

    createPaymentIntent: protectedProcedure
      .input(z.object({ problemId: z.number(), amount: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const problem = await getProblemById(input.problemId);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });
        if (problem.clientId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        const pi = await createEscrowPaymentIntent({
          amount: input.amount,
          problemId: input.problemId,
          problemTitle: problem.title,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? undefined,
        });

        // Create escrow record in pending state
        const existing = await getEscrowByProblemId(input.problemId);
        if (!existing) {
          await createEscrowTransaction({
            problemId: input.problemId,
            clientId: ctx.user.id,
            amount: String(input.amount),
            status: "pending",
            stripePaymentIntentId: pi.id,
          });
        } else {
          await updateEscrowStatus(existing.id, { stripePaymentIntentId: pi.id });
        }

        return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
      }),

    getByProblem: protectedProcedure
      .input(z.object({ problemId: z.number() }))
      .query(async ({ input }) => {
        return getEscrowByProblemId(input.problemId);
      }),
  }),

  // ─── Crawler ────────────────────────────────────────────────────────────
  crawler: router({
    run: protectedProcedure
      .input(
        z.object({
          platforms: z.array(z.enum(["reddit", "quora", "stackoverflow", "hackernews"])).optional(),
          category: z.enum(PROBLEM_CATEGORIES).optional(),
          limit: z.number().min(1).max(20).default(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const results = await runAICrawler({
          platforms: input.platforms ?? ["reddit", "stackoverflow", "quora", "hackernews"],
          category: input.category,
          limit: input.limit,
        });
        return { found: results.length, problems: results };
      }),

    list: protectedProcedure
      .input(
        z.object({
          platform: z.string().optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        return listCrawledProblems(input);
      }),

    import: protectedProcedure
      .input(z.object({ crawledId: z.number(), paymentOffer: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const crawled = await getCrawledProblemById(input.crawledId);
        if (!crawled) throw new TRPCError({ code: "NOT_FOUND" });
        if (crawled.isImported) throw new TRPCError({ code: "BAD_REQUEST", message: "Already imported" });

        const problem = await createProblem({
          title: crawled.title,
          description: crawled.description,
          category: crawled.suggestedCategory,
          paymentOffer: String(input.paymentOffer),
          source: crawled.platform,
          sourceUrl: crawled.sourceUrl,
        });

        await markCrawledProblemImported(input.crawledId, (problem as any).insertId ?? 0);
        return { success: true };
      }),
  }),

  // ─── Notifications ──────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsForUser(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markNotificationRead(input.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Earnings (Owner Only) ──────────────────────────────────────────────
  earnings: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      return getEarningStats(ctx.user.id);
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);
      return getEarningsForSolver(ctx.user.id);
    }),
  }),

  offers: router({
    create: protectedProcedure
      .input(
        z.object({
          problemId: z.number(),
          amount: z.number().min(1),
          message: z.string().optional(),
          expiresAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const problem = await getProblemById(input.problemId);
        if (!problem) throw new TRPCError({ code: "NOT_FOUND" });

        if (!problem.clientId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Problem has no client" });
        }

        const offer = await createOffer({
          problemId: input.problemId,
          fromUserId: ctx.user.id,
          toUserId: problem.clientId,
          amount: String(input.amount),
          message: input.message,
          expiresAt: input.expiresAt,
        });

        if (offer) {
          await createNotification({
            userId: problem.clientId,
            type: "new_problem",
            title: "New Offer Received",
            message: `A solver made an offer of $${input.amount} for: ${problem.title}`,
            problemId: input.problemId,
          });
        }

        return offer;
      }),

    counter: protectedProcedure
      .input(
        z.object({
          offerId: z.number(),
          amount: z.number().min(1),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const originalOffer = await getOfferById(input.offerId);
        if (!originalOffer) throw new TRPCError({ code: "NOT_FOUND" });

        if (originalOffer.toUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const counterOffer = await createOffer({
          problemId: originalOffer.problemId,
          fromUserId: ctx.user.id,
          toUserId: originalOffer.fromUserId,
          amount: String(input.amount),
          message: input.message,
        });

        if (counterOffer) {
          await updateOfferCounterOffer(input.offerId, counterOffer.id);
        }

        const problem = await getProblemById(originalOffer.problemId);
        if (problem) {
          await createNotification({
            userId: originalOffer.fromUserId,
            type: "new_problem",
            title: "Counter-Offer Received",
            message: `Client countered with $${input.amount}`,
            problemId: originalOffer.problemId,
          });
        }

        return counterOffer;
      }),

    accept: protectedProcedure
      .input(z.object({ offerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const offer = await getOfferById(input.offerId);
        if (!offer) throw new TRPCError({ code: "NOT_FOUND" });

        if (offer.toUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await updateOfferStatus(input.offerId, "accepted");

        const problem = await getProblemById(offer.problemId);
        if (problem && problem.clientId) {
          await createEscrowTransaction({
            problemId: offer.problemId,
            clientId: problem.clientId,
            amount: offer.amount,
            status: "pending",
          });

          await createNotification({
            userId: offer.fromUserId,
            type: "new_problem",
            title: "Offer Accepted",
            message: `Your offer of $${offer.amount} was accepted!`,
            problemId: offer.problemId,
          });

          await createNotification({
            userId: offer.toUserId,
            type: "new_problem",
            title: "Offer Accepted",
            message: `You accepted $${offer.amount}. Escrow active.`,
            problemId: offer.problemId,
          });
        }

        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ offerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const offer = await getOfferById(input.offerId);
        if (!offer) throw new TRPCError({ code: "NOT_FOUND" });

        if (offer.toUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await updateOfferStatus(input.offerId, "rejected");

        await createNotification({
          userId: offer.fromUserId,
          type: "new_problem",
          title: "Offer Rejected",
          message: `Your offer of $${offer.amount} was declined.`,
          problemId: offer.problemId,
        });

        return { success: true };
      }),

    getByProblem: publicProcedure
      .input(z.object({ problemId: z.number() }))
      .query(async ({ input }) => {
        return getOffersByProblem(input.problemId);
      }),

    getByUser: protectedProcedure
      .input(z.object({ type: z.enum(["sent", "received"]).default("received") }))
      .query(async ({ ctx, input }) => {
        return getOffersByUser(ctx.user.id, input.type);
      }),
  }),
});

export type AppRouter = typeof appRouter;
