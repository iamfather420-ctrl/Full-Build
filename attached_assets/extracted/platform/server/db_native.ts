import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  crawledProblems,
  earnings,
  escrowTransactions,
  notifications,
  offers,
  problems,
  solutions,
  users,
  type InsertCrawledProblem,
  type InsertEarning,
  type InsertEscrowTransaction,
  type InsertNotification,
  type InsertOffer,
  type InsertProblem,
  type InsertSolution,
  type ProblemCategory,
  type ProblemStatus,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ─── Problems ────────────────────────────────────────────────────────────────

export async function createProblem(data: InsertProblem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(problems).values(data);
  return result[0];
}

export async function getProblemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(problems).where(eq(problems.id, id)).limit(1);
  return result[0];
}

export async function listProblems(opts: {
  category?: ProblemCategory;
  status?: ProblemStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.category) conditions.push(eq(problems.category, opts.category));
  if (opts.status) conditions.push(eq(problems.status, opts.status));
  if (opts.search) {
    conditions.push(
      or(
        like(problems.title, `%${opts.search}%`),
        like(problems.description, `%${opts.search}%`)
      )
    );
  }
  const query = db
    .select()
    .from(problems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(problems.createdAt))
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);
  return query;
}

export async function updateProblemStatus(id: number, status: ProblemStatus) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(problems).set({ status }).where(eq(problems.id, id));
}

export async function incrementProblemViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(problems)
    .set({ viewCount: sql`${problems.viewCount} + 1` })
    .where(eq(problems.id, id));
}

export async function getClientProblems(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(problems).where(eq(problems.clientId, clientId)).orderBy(desc(problems.createdAt));
}

export async function getProblemStats() {
  const db = await getDb();
  if (!db) return { total: 0, open: 0, solved: 0, inReview: 0 };
  const [total, open, solved, inReview] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(problems),
    db.select({ count: sql<number>`count(*)` }).from(problems).where(eq(problems.status, "open")),
    db.select({ count: sql<number>`count(*)` }).from(problems).where(eq(problems.status, "solved")),
    db.select({ count: sql<number>`count(*)` }).from(problems).where(eq(problems.status, "in_review")),
  ]);
  return {
    total: Number(total[0]?.count ?? 0),
    open: Number(open[0]?.count ?? 0),
    solved: Number(solved[0]?.count ?? 0),
    inReview: Number(inReview[0]?.count ?? 0),
  };
}

// ─── Solutions ───────────────────────────────────────────────────────────────

export async function createSolution(data: InsertSolution) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(solutions).values(data);
  return result[0];
}

export async function getSolutionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
  return result[0];
}

export async function getSolutionsByProblemId(problemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(solutions).where(eq(solutions.problemId, problemId)).orderBy(desc(solutions.createdAt));
}

export async function updateSolution(
  id: number,
  data: Partial<Pick<InsertSolution, "status" | "verificationScore" | "verificationNotes" | "verifiedAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(solutions).set(data).where(eq(solutions.id, id));
}

// ─── Escrow ──────────────────────────────────────────────────────────────────

export async function createEscrowTransaction(data: InsertEscrowTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(escrowTransactions).values(data);
  return result[0];
}

export async function getEscrowByProblemId(problemId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(escrowTransactions)
    .where(eq(escrowTransactions.problemId, problemId))
    .orderBy(desc(escrowTransactions.createdAt))
    .limit(1);
  return result[0];
}

export async function updateEscrowStatus(
  id: number,
  data: Partial<Pick<InsertEscrowTransaction, "status" | "stripePaymentIntentId" | "stripeTransferId" | "releasedAt" | "refundedAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(escrowTransactions).set(data).where(eq(escrowTransactions.id, id));
}

// ─── Crawled Problems ────────────────────────────────────────────────────────

export async function saveCrawledProblem(data: InsertCrawledProblem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Avoid duplicates by externalId
  const existing = await db
    .select()
    .from(crawledProblems)
    .where(eq(crawledProblems.externalId, data.externalId))
    .limit(1);
  if (existing.length > 0) return null;
  const result = await db.insert(crawledProblems).values(data);
  return result[0];
}

export async function listCrawledProblems(opts: { limit?: number; offset?: number; platform?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(crawledProblems.isImported, false)];
  if (opts.platform && opts.platform !== "all") {
    conditions.push(eq(crawledProblems.platform, opts.platform as any));
  }
  return db
    .select()
    .from(crawledProblems)
    .where(and(...conditions))
    .orderBy(desc(crawledProblems.crawledAt))
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);
}

export async function getCrawledProblemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(crawledProblems).where(eq(crawledProblems.id, id)).limit(1);
  return result[0];
}

export async function markCrawledProblemImported(id: number, problemId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(crawledProblems)
    .set({ isImported: true, importedProblemId: problemId })
    .where(eq(crawledProblems.id, id));
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(result[0]?.count ?? 0);
}

// ─── Earnings ────────────────────────────────────────────────────────────────

export async function createEarning(data: InsertEarning) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(earnings).values(data);
}

export async function getEarningsForSolver(solverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(earnings)
    .where(eq(earnings.solverId, solverId))
    .orderBy(desc(earnings.createdAt));
}

export async function getEarningStats(solverId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, paid: 0, count: 0 };
  const [allEarnings, pendingEarnings, paidEarnings] = await Promise.all([
    db.select({ sum: sql<string>`COALESCE(SUM(amount), 0)`, count: sql<number>`count(*)` }).from(earnings).where(eq(earnings.solverId, solverId)),
    db.select({ sum: sql<string>`COALESCE(SUM(amount), 0)` }).from(earnings).where(and(eq(earnings.solverId, solverId), eq(earnings.status, "pending"))),
    db.select({ sum: sql<string>`COALESCE(SUM(amount), 0)` }).from(earnings).where(and(eq(earnings.solverId, solverId), eq(earnings.status, "paid"))),
  ]);
  return {
    total: parseFloat(allEarnings[0]?.sum ?? "0"),
    pending: parseFloat(pendingEarnings[0]?.sum ?? "0"),
    paid: parseFloat(paidEarnings[0]?.sum ?? "0"),
    count: Number(allEarnings[0]?.count ?? 0),
  };
}

// --- Offers ---

export async function createOffer(data: InsertOffer) {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.insert(offers).values(data);
    // Fetch the most recently created offer
    const created = await db.select().from(offers).orderBy(desc(offers.createdAt)).limit(1);
    return created[0] ?? null;
  } catch (error) {
    console.error("[createOffer] Error:", error);
    return null;
  }
}

export async function getOfferById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getOffersByProblem(problemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offers).where(eq(offers.problemId, problemId)).orderBy(desc(offers.createdAt));
}

export async function getOffersByUser(userId: number, type: "sent" | "received" = "received") {
  const db = await getDb();
  if (!db) return [];
  const field = type === "sent" ? offers.fromUserId : offers.toUserId;
  return db.select().from(offers).where(eq(field, userId)).orderBy(desc(offers.createdAt));
}

export async function updateOfferStatus(offerId: number, status: "pending" | "accepted" | "rejected" | "countered") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(offers).set({ status }).where(eq(offers.id, offerId));
  return result;
}

export async function updateOfferCounterOffer(offerId: number, counterOfferId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(offers).set({ status: "countered", counterOfferId }).where(eq(offers.id, offerId));
  return result;
}
