import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Problem categories
export const PROBLEM_CATEGORIES = [
  "technical",
  "legal",
  "business",
  "medical",
  "financial",
  "academic",
  "creative",
  "general",
  "science",
  "engineering",
  "other",
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const PROBLEM_STATUS = [
  "open",
  "in_review",
  "solution_submitted",
  "verifying",
  "solved",
  "closed",
  "refunded",
] as const;

export type ProblemStatus = (typeof PROBLEM_STATUS)[number];

export const PROBLEM_SOURCE = ["direct", "reddit", "quora", "stackoverflow", "hackernews", "other"] as const;
export type ProblemSource = (typeof PROBLEM_SOURCE)[number];

// Main problems table
export const problems = mysqlTable("problems", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", PROBLEM_CATEGORIES).default("general").notNull(),
  status: mysqlEnum("status", PROBLEM_STATUS).default("open").notNull(),
  source: mysqlEnum("source", PROBLEM_SOURCE).default("direct").notNull(),
  sourceUrl: text("sourceUrl"),
  paymentOffer: decimal("paymentOffer", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  deadline: timestamp("deadline"),
  clientId: int("clientId"), // null for crawled problems (no client yet)
  tags: text("tags"), // JSON array of tags
  viewCount: int("viewCount").default(0).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Problem = typeof problems.$inferSelect;
export type InsertProblem = typeof problems.$inferInsert;

// Solutions submitted by the owner/solver
export const solutions = mysqlTable("solutions", {
  id: int("id").autoincrement().primaryKey(),
  problemId: int("problemId").notNull(),
  solverId: int("solverId").notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "verifying", "approved", "rejected"]).default("pending").notNull(),
  verificationScore: decimal("verificationScore", { precision: 5, scale: 2 }),
  verificationNotes: text("verificationNotes"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Solution = typeof solutions.$inferSelect;
export type InsertSolution = typeof solutions.$inferInsert;

// Escrow transactions
export const escrowTransactions = mysqlTable("escrow_transactions", {
  id: int("id").autoincrement().primaryKey(),
  problemId: int("problemId").notNull(),
  clientId: int("clientId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "held", "released", "refunded", "failed"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  stripeTransferId: varchar("stripeTransferId", { length: 256 }),
  releasedAt: timestamp("releasedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = typeof escrowTransactions.$inferInsert;

// AI-crawled problems from external platforms
export const crawledProblems = mysqlTable("crawled_problems", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 256 }).notNull(),
  platform: mysqlEnum("platform", ["reddit", "quora", "stackoverflow", "hackernews", "other"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  suggestedCategory: mysqlEnum("category", PROBLEM_CATEGORIES).default("general").notNull(),
  suggestedPayment: decimal("suggestedPayment", { precision: 10, scale: 2 }).default("25.00"),
  isImported: boolean("isImported").default(false).notNull(),
  importedProblemId: int("importedProblemId"),
  aiSummary: text("aiSummary"),
  upvotes: int("upvotes").default(0),
  crawledAt: timestamp("crawledAt").defaultNow().notNull(),
});

export type CrawledProblem = typeof crawledProblems.$inferSelect;
export type InsertCrawledProblem = typeof crawledProblems.$inferInsert;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "new_problem",
    "solution_submitted",
    "solution_verified",
    "payment_released",
    "payment_refunded",
    "problem_closed",
    "crawler_found",
  ]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  problemId: int("problemId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Earnings record for solver payouts
export const earnings = mysqlTable("earnings", {
  id: int("id").autoincrement().primaryKey(),
  solverId: int("solverId").notNull(),
  problemId: int("problemId").notNull(),
  solutionId: int("solutionId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = typeof earnings.$inferInsert;


// Offers for bidding and counter-offer negotiation
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  problemId: int("problemId").notNull(),
  fromUserId: int("fromUserId").notNull(), // client or solver making the offer
  toUserId: int("toUserId").notNull(), // recipient of the offer
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  message: text("message"), // optional negotiation message
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "countered"]).default("pending").notNull(),
  counterOfferId: int("counterOfferId"), // reference to the counter-offer if this was countered
  expiresAt: timestamp("expiresAt"), // offer expiration time
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;
