import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { userRouter } from "./routers-user";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import {
  getAllParadoxProducts,
  getParadoxProductById,
  seedParadoxProducts,
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  confirmOrder,
  deliverOrder,
  createVaultEntry,
  getVaultLedgerByOrderId,
  getAllVaultEntries,
  getAvailableVaultFunds,
  markVaultEntryAsHeld,
  markVaultEntryAsAvailable,
  markVaultEntryAsWithdrawn,
  createUserPurchase,
  getUserPurchases,
  unlockUserPurchase,
  getUserPurchaseByParadoxId,
  getVaultConfig,
  updateVaultConfig,
} from "./db";

export const appRouter = router({
  user: userRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ MARKETPLACE ============
  marketplace: router({
    // Get all paradox products
    getProducts: publicProcedure.query(async () => {
      return await getAllParadoxProducts();
    }),

    // Get single product by ID
    getProduct: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const product = await getParadoxProductById(input.id);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        }
        return product;
      }),

    // Initialize products (admin only, called once)
    seedProducts: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      await seedParadoxProducts();
      return { success: true };
    }),
  }),

  // ============ ORDERS ============
  orders: router({
    // Create a new order
    createOrder: protectedProcedure
      .input(
        z.object({
          paradoxId: z.string(),
          paymentMethod: z.enum(["eth", "usdc", "btc"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const product = await getParadoxProductById(input.paradoxId);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        }

        // Check if user already purchased this paradox
        const existingPurchase = await getUserPurchaseByParadoxId(ctx.user.id, input.paradoxId);
        if (existingPurchase) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already purchased this paradox",
          });
        }

        // Get the price based on payment method
        let amount: string;
        switch (input.paymentMethod) {
          case "eth":
            amount = product.priceEth.toString();
            break;
          case "usdc":
            amount = product.priceUsdc.toString();
            break;
          case "btc":
            amount = product.priceBtc.toString();
            break;
        }

        // Generate a unique vault address per order (format: solvex-vault-{orderId})
        // In production, this would be a real blockchain address managed by a payment processor
        const orderId = nanoid();
        const walletAddress = `solvex-vault-${orderId}`;

        await createOrder(
          ctx.user.id,
          input.paradoxId,
          input.paymentMethod,
          amount,
          walletAddress
        );

        // Create vault entry with hold period (minimum 72 hours)
        const config = await getVaultConfig();
        const holdUntil = new Date(Date.now() + Math.max(config.holdPeriodHours, 72) * 60 * 60 * 1000);

        await createVaultEntry(orderId, ctx.user.id, amount, input.paymentMethod, holdUntil);

        return {
          orderId,
          walletAddress,
          amount,
          paymentMethod: input.paymentMethod,
          holdUntil,
        };
      }),

    // Get user's orders
    getMyOrders: protectedProcedure.query(async ({ ctx }) => {
      return await getUserOrders(ctx.user.id);
    }),

    // Get order by ID
    getOrder: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const order = await getOrderById(input.id);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }
        return order;
      }),

    // Confirm payment (admin only - in production, automatic via blockchain verification)
    confirmPayment: protectedProcedure
      .input(
        z.object({
          orderId: z.string(),
          transactionHash: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // Only admin can confirm payments (in production, automatic blockchain verification)
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admin can confirm payments. In production, this is automatic via blockchain.",
          });
        }

        if (order.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Order is already ${order.status}`,
          });
        }

        await confirmOrder(input.orderId, input.transactionHash);

        // Mark vault entry as held
        const vaultEntry = await getVaultLedgerByOrderId(input.orderId);
        if (vaultEntry && vaultEntry.status === "pending") {
          await markVaultEntryAsHeld(vaultEntry.id);
        }

        return { success: true };
      }),

    // Get all orders (admin only)
    getAllOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return await getAllOrders();
    }),
  }),

  // ============ VAULT ============
  vault: router({
    // Get vault configuration
    getConfig: publicProcedure.query(async () => {
      return await getVaultConfig();
    }),

    // Update vault hold period (admin only) - minimum 72 hours (3 days)
    updateConfig: protectedProcedure
      .input(z.object({ holdPeriodHours: z.number().min(72, "Minimum hold period is 72 hours (3 days)") }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        await updateVaultConfig(input.holdPeriodHours);
        return { success: true };
      }),

    // Get all vault entries (admin only)
    getAllEntries: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return await getAllVaultEntries();
    }),

    // Get available funds for withdrawal (admin only)
    getAvailableFunds: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      return await getAvailableVaultFunds();
    }),

    // Withdraw funds (admin only) - only available funds can be withdrawn
    withdraw: protectedProcedure
      .input(z.object({ entryIds: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        // Validate all entries are available before withdrawing
        const entries = await getAllVaultEntries();
        const selectedEntries = entries.filter((e) => input.entryIds.includes(e.id));

        for (const entry of selectedEntries) {
          if (entry.status !== "available") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Entry ${entry.id} is not available for withdrawal (status: ${entry.status})`,
            });
          }
        }

        // Withdraw all validated entries
        for (const entryId of input.entryIds) {
          await markVaultEntryAsWithdrawn(entryId);
        }

        return { success: true, count: input.entryIds.length };
      }),

    // Process vault holds - mark as available when hold period expires and deliver products
    processHolds: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const entries = await getAllVaultEntries();
      const now = new Date();
      let processed = 0;

      for (const entry of entries) {
        if (entry.status === "held" && entry.holdUntil <= now) {
          // Mark as available
          await markVaultEntryAsAvailable(entry.id);

          // Deliver the product
          const order = await getOrderById(entry.orderId);
          if (order) {
            // Ensure order is confirmed before delivery
            if (order.status === "confirmed") {
              await deliverOrder(entry.orderId);
            } else if (order.status === "pending") {
              // Auto-confirm if still pending (in production, this would be verified on-chain)
              await confirmOrder(entry.orderId, "auto-confirmed-by-vault-processor");
              await deliverOrder(entry.orderId);
            }

            // Create and unlock user purchase
            const existingPurchase = await getUserPurchaseByParadoxId(entry.userId, order.paradoxId);
            if (!existingPurchase) {
              const purchaseId = await createUserPurchase(entry.userId, order.paradoxId, entry.orderId);
              await unlockUserPurchase(purchaseId);
            } else if (!existingPurchase.unlockedAt) {
              await unlockUserPurchase(existingPurchase.id);
            }
          }

          processed++;
        }
      }

      return { success: true, processed };
    }),
  }),

  // ============ USER LIBRARY ============
  library: router({
    // Get user's purchased paradoxes
    getMyLibrary: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPurchases(ctx.user.id);
    }),

    // Check if user has purchased a specific paradox
    hasPurchased: protectedProcedure
      .input(z.object({ paradoxId: z.string() }))
      .query(async ({ ctx, input }) => {
        const purchase = await getUserPurchaseByParadoxId(ctx.user.id, input.paradoxId);
        return !!purchase && !!purchase.unlockedAt;
      }),
  }),

  // ============ OWNER DASHBOARD ============
  owner: router({
    // Get owner settings (admin only)
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const { getOwnerSettings } = await import("./db-extended");
      return await getOwnerSettings();
    }),

    // Get all payment notifications (admin only)
    getNotifications: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const { getPaymentNotifications } = await import("./db-extended");
      return await getPaymentNotifications();
    }),

    // Get audit log (admin only)
    getAuditLog: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(100),
          offset: z.number().default(0),
          eventType: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { getAuditLog } = await import("./db-extended");
        return await getAuditLog(input.limit, input.offset, input.eventType);
      }),

    // Get system statistics (admin only)
    getSystemStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const { getLatestSystemStats } = await import("./db-extended");
      return await getLatestSystemStats();
    }),

    // Get system stats history (admin only)
    getStatsHistory: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { getSystemStatsHistory } = await import("./db-extended");
        return await getSystemStatsHistory(input.days);
      }),

    // Initiate withdrawal (admin only)
    initiateWithdrawal: protectedProcedure
      .input(
        z.object({
          entryIds: z.array(z.string()),
          withdrawalAddress: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        if (!input.withdrawalAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Withdrawal address is required",
          });
        }

        const { updateOwnerTotalWithdrawn, logAuditEvent, createPaymentNotification } = await import("./db-extended");

        // Validate all entries are available
        const entries = await getAllVaultEntries();
        const selectedEntries = entries.filter((e) => input.entryIds.includes(e.id));

        for (const entry of selectedEntries) {
          if (entry.status !== "available") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Entry ${entry.id} is not available for withdrawal`,
            });
          }
        }

        // Calculate total withdrawal amount
        const totalAmount = selectedEntries
          .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0)
          .toFixed(8);

        // Mark entries as withdrawn
        for (const entryId of input.entryIds) {
          await markVaultEntryAsWithdrawn(entryId);
        }

        // Update owner total withdrawn
        await updateOwnerTotalWithdrawn(totalAmount);

        // Log the withdrawal
        await logAuditEvent(
          "withdrawal_initiated",
          "success",
          {
            entryCount: input.entryIds.length,
            totalAmount,
            withdrawalAddress: input.withdrawalAddress,
          },
          ctx.user.id
        );

        // Create notification
        await createPaymentNotification(
          "",
          "payment_confirmed",
          `Withdrawal of ${totalAmount} initiated to ${input.withdrawalAddress}`,
          undefined,
          { entryCount: input.entryIds.length, totalAmount }
        );

        return { success: true, totalAmount, entryCount: input.entryIds.length };
      }),
  }),

  // ============ BLOCKCHAIN PAYMENT DETECTION ============
  blockchain: router({
    checkPayment: publicProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input }) => {
        const { checkPaymentForVaultAddress } = await import("./blockchain");
        const order = await getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }
        const vaultAddress = `solvex-vault-${input.orderId}`;
        const payment = await checkPaymentForVaultAddress(
          vaultAddress,
          order.amount.toString(),
          order.paymentMethod as "eth" | "usdc" | "btc"
        );
        return payment;
      }),

    getTransactionDetails: publicProcedure
      .input(z.object({ transactionHash: z.string() }))
      .query(async ({ input }) => {
        const { getTransactionDetails } = await import("./blockchain");
        return await getTransactionDetails(input.transactionHash);
      }),
  }),

});

export type AppRouter = typeof appRouter;
