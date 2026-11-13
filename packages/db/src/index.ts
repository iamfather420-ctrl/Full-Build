import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, bigserial, bigint, text, integer, boolean, timestamp, numeric, index, uniqueIndex, jsonb, varchar } from "drizzle-orm/pg-core";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL or NEON_DATABASE_URL must be configured for the outreach worker");

export const db = drizzle(neon(databaseUrl));
const authSql = neon(databaseUrl);

export interface OidcTenantIdentity {
  user_id: string;
  email: string;
  display_name: string | null;
  tenant_id: string;
  role: "OWNER" | "ADMIN" | "VERIFIER" | "CUSTOMER";
  signed_token: string;
}

/** Issues a short-lived claim only for an existing active OIDC user and membership. */
export async function resolveOidcTenantIdentity(subject: string, email: string, databaseUrl?: string): Promise<OidcTenantIdentity> {
  const sql = databaseUrl ? neon(databaseUrl) : authSql;
  const rows = await sql`
    SELECT * FROM solvex_private.issue_oidc_session_claim(${subject}, ${email})
  `;
  if (rows.length !== 1) throw new Error("OIDC identity did not resolve to exactly one active tenant membership.");
  const row = rows[0] as OidcTenantIdentity;
  if (!row.user_id || !row.tenant_id || !row.signed_token ||
      !["OWNER", "ADMIN", "VERIFIER", "CUSTOMER"].includes(row.role)) {
    throw new Error("OIDC tenant identity response is incomplete or invalid.");
  }
  return row;
}

/**
 * Resolve exactly one active OWNER OIDC identity from a disposable validation database.
 * This deliberately does not select identities from the normal production URL.
 */
export async function resolveUniqueActiveOidcOwnerIdentity(databaseUrl: string): Promise<OidcTenantIdentity> {
  if (!databaseUrl) throw new Error("A disposable Neon validation database URL is required.");
  const sql = neon(databaseUrl);
  const owners = await sql`
    SELECT u.oidc_subject, u.email
      FROM public.users u
      JOIN public.tenant_memberships m ON m.user_id = u.id AND m.tenant_id = u.tenant_id
      JOIN public.roles r ON r.id = m.role_id AND r.tenant_id = m.tenant_id
      JOIN public.tenants t ON t.id = u.tenant_id
     WHERE u.status = 'ACTIVE'
       AND m.status = 'ACTIVE'
       AND r.status = 'ACTIVE'
       AND upper(r.name) = 'OWNER'
       AND t.status = 'ACTIVE'
       AND u.oidc_subject IS NOT NULL
     ORDER BY u.created_at
     LIMIT 2
  `;
  if (owners.length !== 1 || !owners[0].oidc_subject || !owners[0].email) {
    throw new Error("Disposable Neon database must resolve to exactly one active OWNER OIDC identity.");
  }
  return resolveOidcTenantIdentity(String(owners[0].oidc_subject), String(owners[0].email), databaseUrl);
}

/** Verifies signature, expiry, and current active membership on every authenticated request. */
export async function verifyOidcTenantToken(token: string, databaseUrl?: string): Promise<Record<string, unknown> | null> {
  if (!token || token.length > 8192) return null;
  const sql = databaseUrl ? neon(databaseUrl) : authSql;
  const rows = await sql`
    WITH token_context AS MATERIALIZED (
      SELECT set_config('app.auth_token', ${token}, true) AS configured
    ),
    claims AS MATERIALIZED (
      SELECT solvex_private.current_claims() AS value FROM token_context
    )
    SELECT c.value
      FROM claims c
      JOIN public.users u
        ON u.id = c.value->>'user_id'
       AND u.email = c.value->>'email'
       AND u.status = 'ACTIVE'
      JOIN public.tenant_memberships m
        ON m.user_id = u.id
       AND m.tenant_id = c.value->>'tenant_id'
       AND m.status = 'ACTIVE'
      JOIN public.tenants t
        ON t.id = m.tenant_id
       AND t.status = 'ACTIVE'
      JOIN public.roles r
        ON r.id = m.role_id
       AND r.tenant_id = m.tenant_id
       AND r.status = 'ACTIVE'
       AND upper(r.name) = c.value->>'role'
     WHERE c.value IS NOT NULL
       AND (SELECT count(*) FROM public.tenant_memberships m2
            JOIN public.tenants t2 ON t2.id=m2.tenant_id AND t2.status='ACTIVE'
            JOIN public.roles r2 ON r2.id=m2.role_id AND r2.tenant_id=m2.tenant_id AND r2.status='ACTIVE'
            WHERE m2.user_id=u.id AND m2.status='ACTIVE'
              AND upper(r2.name) IN ('OWNER','ADMIN','VERIFIER','CUSTOMER')) = 1
  `;
  return rows.length === 1 && rows[0].value && typeof rows[0].value === "object"
    ? rows[0].value as Record<string, unknown>
    : null;
}

export const outreachProspects = pgTable("outreach_prospects", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  company: text("company").notNull(),
  sector: text("sector").notNull(),
  region: text("region").notNull(),
  contactRole: text("contact_role"),
  stage: text("stage").notNull().default("discovered"),
  platform: text("platform"),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  sourceAuthor: text("source_author"),
  snippet: text("snippet"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  unanswered: boolean("unanswered").notNull().default(false),
  fitScore: integer("fit_score").notNull().default(0),
  productId: text("product_id"),
  productName: text("product_name"),
  listPriceEth: numeric("list_price_eth", { precision: 18, scale: 8 }),
  draftMessage: text("draft_message"),
  lastAction: text("last_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sourceUrlUnique: uniqueIndex("outreach_prospects_source_url_key").on(t.sourceUrl),
  stageIdx: index("idx_outreach_prospects_stage").on(t.stage),
  updatedIdx: index("idx_outreach_prospects_updated").on(t.updatedAt),
}));

export const outreachEvents = pgTable("outreach_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  prospectId: bigint("prospect_id", { mode: "number" }).notNull(),
  company: text("company").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ createdIdx: index("idx_outreach_events_created").on(t.createdAt) }));


// API login sessions are separate from the outreach prospect/event tables.
// The matching SQL migration creates this table in the shared Neon database.
export const sessionsTable = pgTable("auth_sessions", {
  sid: varchar("sid", { length: 64 }).primaryKey(),
  sess: jsonb("sess").$type<Record<string, unknown>>().notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
}, (t) => ({
  expireIdx: index("auth_sessions_expire_idx").on(t.expire),
}));
