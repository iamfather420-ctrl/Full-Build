import { pgTable, text, uuid, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const challengeHubTable = pgTable("challenge_hub", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformId: text("platform_id").notNull(),
  platformName: text("platform_name").notNull(),
  externalId: text("external_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  prizeValue: text("prize_value"),
  deadline: text("deadline"),
  requirements: text("requirements"),
  category: text("category"),
  sourceUrl: text("source_url"),
  feasibilityScore: integer("feasibility_score").default(0),
  paradoxMatches: jsonb("paradox_matches").$type<string[]>().default(sql`'[]'::jsonb`),
  complianceFlags: jsonb("compliance_flags").$type<string[]>().default(sql`'[]'::jsonb`),
  submissionStatus: text("submission_status").default("DISCOVERED"),
  scrapedAt: timestamp("scraped_at").defaultNow(),
});

export type ChallengeHub = typeof challengeHubTable.$inferSelect;
export type NewChallengeHub = typeof challengeHubTable.$inferInsert;
