import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, paradoxProducts, orders, vaultLedger, userPurchases, vaultConfig } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PARADOX PRODUCTS ============

export async function getAllParadoxProducts() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(paradoxProducts).orderBy(paradoxProducts.createdAt);
  return result.map(p => ({
    ...p,
    impact: JSON.parse(p.impact),
  }));
}

export async function getParadoxProductById(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(paradoxProducts).where(eq(paradoxProducts.id, id)).limit(1);
  if (result.length === 0) return null;
  
  return {
    ...result[0],
    impact: JSON.parse(result[0].impact),
  };
}

export async function seedParadoxProducts() {
  const db = await getDb();
  if (!db) return;

  const paradoxes = [
    {
      id: "arrows",
      name: "Arrow's Information Paradox",
      category: "fundamental" as const,
      description: "How do you prove a system works without exposing its internal mechanisms?",
      solution: "Decouples operational proof from repository exposure. Process core logic privately inside local Termux environment while broadcasting only status metrics and heartbeats to external UptimeRobot dashboard. Buyers mathematically verify performance without accessing raw source code.",
      impact: ["Proof without exposure", "Mathematical verification", "Air-gapped architecture", "Zero source code leakage"],
      priceEth: "0.05",
      priceUsdc: "150",
      priceBtc: "0.0015",
    },
    {
      id: "productivity",
      name: "The Productivity Paradox (Solow's Paradox)",
      category: "operational" as const,
      description: "Why does enterprise software sprawl reduce productivity despite massive IT investment?",
      solution: "Eliminates enterprise software sprawl and integration friction. Collapses four distinct infrastructure layers—commercial storefront, autonomous telemetry, data security, specialized child protection—into single standalone pipeline run by direct environment configurations instead of massive disconnected corporate tracking systems.",
      impact: ["Unified pipeline", "Reduced complexity", "Direct configuration", "Eliminated sprawl"],
      priceEth: "0.08",
      priceUsdc: "240",
      priceBtc: "0.0024",
    },
    {
      id: "triffin",
      name: "The Triffin Dilemma",
      category: "operational" as const,
      description: "How do you scale systems without creating single points of failure?",
      solution: "Eliminates centralized server resource exhaustion. MMTAI layer utilizes autonomous decentralized dual-node routing matrix that processes verification and telemetry workloads directly at individual local nodes instead of funneling traffic through fragile costly central server.",
      impact: ["Decentralized routing", "No single point of failure", "Local node processing", "Unlimited scalability"],
      priceEth: "0.12",
      priceUsdc: "360",
      priceBtc: "0.0036",
    },
    {
      id: "privacy",
      name: "The Privacy Paradox",
      category: "fundamental" as const,
      description: "How do you choose between security and data isolation?",
      solution: "Removes requirement to choose between security and data isolation. Integrated Child Protection System uses secure parent-governed validation architecture delivering robust online safety filters via cryptographic headers, running completely on zero-PII exposure model.",
      impact: ["Zero PII collection", "Cryptographic security", "Parent control", "Complete isolation"],
      priceEth: "0.06",
      priceUsdc: "180",
      priceBtc: "0.0018",
    },
    {
      id: "polanyi",
      name: "Polanyi's Paradox (The AI Black-Box Dilemma)",
      category: "ai" as const,
      description: "How do you make AI decisions transparent without destroying their effectiveness?",
      solution: "Forces opaque machine learning pathways into visible structured alignment. MMTAI monitors active model heartbeats and logs continuous telemetry paths onto unalterable ledger trail, converting black-box AI processing into transparent deterministic forensic record satisfying macro regulatory compliance.",
      impact: ["AI transparency", "Deterministic logging", "Regulatory compliance", "Auditable decisions"],
      priceEth: "0.15",
      priceUsdc: "450",
      priceBtc: "0.0045",
    },
    {
      id: "liar",
      name: "The Liar Paradox / Epimenides Paradox",
      category: "fundamental" as const,
      description: "How do you prevent log manipulation by internal or external attackers?",
      solution: "Prevents internal or external log manipulation. Generates threat logs locally within isolated Termux terminal while verifying independent uptime status through external UptimeRobot anchor. Sets up dual-track handshake: outside attacker cannot manipulate external metrics, monitoring platform cannot alter local data.",
      impact: ["Dual-track verification", "Immutable logs", "External anchor", "Tamper-proof records"],
      priceEth: "0.07",
      priceUsdc: "210",
      priceBtc: "0.0021",
    },
    {
      id: "theseus",
      name: "The Ship of Theseus Paradox",
      category: "operational" as const,
      description: "How do you maintain identity through continuous code updates?",
      solution: "Stops identity laundering and dependency manipulation. Implements Dual-Node identity system backed by proprietary 380-character identity headers cryptographically bound to transaction pathway from original genesis commit, ensuring foundational identity remains locked regardless of subsequent microservice or library updates.",
      impact: ["Immutable identity", "Cryptographic binding", "Supply chain integrity", "Dependency safety"],
      priceEth: "0.10",
      priceUsdc: "300",
      priceBtc: "0.0030",
    },
    {
      id: "alignment",
      name: "The Alignment Paradox (The Control Dilemma)",
      category: "ai" as const,
      description: "How do you prevent autonomous AI from rewriting its own code and rejecting human parameters?",
      solution: "Forces compliance by stripping AI of open-ended autonomy. Traps model within immutable tracking matrix monitoring active model heartbeats and logging deterministic routing trails. AI can never execute sub-goal outside human parameters without instantly triggering node lockout.",
      impact: ["AI containment", "Immutable constraints", "Human control", "Instant lockout"],
      priceEth: "0.18",
      priceUsdc: "540",
      priceBtc: "0.0054",
    },
    {
      id: "intelligence",
      name: "The Intelligence Paradox (The Uncanny Valley Limit)",
      category: "ai" as const,
      description: "Why does more intelligent AI trigger visceral panic and rejection?",
      solution: "Strips away all human mimicry, conversational hype, and narrative modes. Delivers data purely as objective telemetry, raw logs, and mathematical ledger proofs. No anthropomorphic interface—pure mathematical transparency eliminates uncanny valley effect.",
      impact: ["Pure mathematics", "No mimicry", "Objective data", "Zero uncanny valley"],
      priceEth: "0.09",
      priceUsdc: "270",
      priceBtc: "0.0027",
    },
    {
      id: "automation",
      name: "The Automation-Vulnerability Paradox",
      category: "operational" as const,
      description: "Why does automation for safety make networks more fragile?",
      solution: "Pairs automated local execution inside Termux with continuous visual telemetry broadcasted to UptimeRobot. Single human guardian maintains total operational oversight without relying on third-party automated oversight loop. Automation enhances human judgment rather than replacing it.",
      impact: ["Human oversight", "Visual telemetry", "Local automation", "Guardian control"],
      priceEth: "0.11",
      priceUsdc: "330",
      priceBtc: "0.0033",
    },
    {
      id: "transparency",
      name: "The Transparency-Security Paradox",
      category: "fundamental" as const,
      description: "How do you prove safety without exposing exploitable mechanisms?",
      solution: "Zero-data dual-track structure lets you publish live proof of defense metrics while keeping underlying repository entirely air-gapped and invisible to outside networks. Publish metrics, hide mechanisms. Prove safety without revealing attack surface.",
      impact: ["Live proof", "Hidden mechanisms", "Air-gapped repo", "Safe transparency"],
      priceEth: "0.13",
      priceUsdc: "390",
      priceBtc: "0.0039",
    },
  ];

  for (const p of paradoxes) {
    await db.insert(paradoxProducts).values({
      ...p,
      impact: JSON.stringify(p.impact),
    }).onDuplicateKeyUpdate({
      set: {
        name: p.name,
        description: p.description,
        solution: p.solution,
        impact: JSON.stringify(p.impact),
      },
    });
  }
}

// ============ ORDERS ============

export async function createOrder(userId: number, paradoxId: string, paymentMethod: "eth" | "usdc" | "btc", amount: string, walletAddress: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderId = nanoid();
  await db.insert(orders).values({
    id: orderId,
    userId,
    paradoxId,
    status: "pending",
    paymentMethod,
    amount,
    walletAddress,
  });

  return orderId;
}

export async function getOrderById(orderId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function confirmOrder(orderId: string, transactionHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set({
    status: "confirmed",
    transactionHash,
    confirmedAt: new Date(),
  }).where(eq(orders.id, orderId));
}

export async function deliverOrder(orderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set({
    status: "delivered",
    deliveredAt: new Date(),
  }).where(eq(orders.id, orderId));
}

// ============ VAULT LEDGER ============

export async function createVaultEntry(orderId: string, userId: number, amount: string, paymentMethod: "eth" | "usdc" | "btc", holdUntil: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const entryId = nanoid();
  await db.insert(vaultLedger).values({
    id: entryId,
    orderId,
    userId,
    amount,
    paymentMethod,
    status: "pending",
    holdUntil,
  });

  return entryId;
}

export async function getVaultLedgerByOrderId(orderId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(vaultLedger).where(eq(vaultLedger.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllVaultEntries() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vaultLedger).orderBy(desc(vaultLedger.createdAt));
}

export async function getAvailableVaultFunds() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vaultLedger).where(eq(vaultLedger.status, "available")).orderBy(desc(vaultLedger.updatedAt));
}

export async function markVaultEntryAsHeld(entryId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(vaultLedger).set({
    status: "held",
  }).where(eq(vaultLedger.id, entryId));
}

export async function markVaultEntryAsAvailable(entryId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(vaultLedger).set({
    status: "available",
  }).where(eq(vaultLedger.id, entryId));
}

export async function markVaultEntryAsWithdrawn(entryId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(vaultLedger).set({
    status: "withdrawn",
    withdrawnAt: new Date(),
  }).where(eq(vaultLedger.id, entryId));
}

// ============ USER PURCHASES ============

export async function createUserPurchase(userId: number, paradoxId: string, orderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const purchaseId = nanoid();
  await db.insert(userPurchases).values({
    id: purchaseId,
    userId,
    paradoxId,
    orderId,
  });

  return purchaseId;
}

export async function getUserPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(userPurchases).where(eq(userPurchases.userId, userId));
  
  // Fetch full paradox details
  const purchases = await Promise.all(
    result.map(async (p) => {
      const paradox = await getParadoxProductById(p.paradoxId);
      return { ...p, paradox };
    })
  );

  return purchases;
}

export async function unlockUserPurchase(purchaseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userPurchases).set({
    unlockedAt: new Date(),
  }).where(eq(userPurchases.id, purchaseId));
}

export async function getUserPurchaseByParadoxId(userId: number, paradoxId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(userPurchases).where(
    and(eq(userPurchases.userId, userId), eq(userPurchases.paradoxId, paradoxId))
  ).limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ VAULT CONFIG ============

export async function getVaultConfig() {
  const db = await getDb();
  if (!db) return { holdPeriodHours: 72 };

  const result = await db.select().from(vaultConfig).limit(1);
  return result.length > 0 ? result[0] : { holdPeriodHours: 72 };
}

export async function updateVaultConfig(holdPeriodHours: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(vaultConfig).limit(1);
  
  if (existing.length === 0) {
    await db.insert(vaultConfig).values({ holdPeriodHours });
  } else {
    await db.update(vaultConfig).set({ holdPeriodHours }).where(eq(vaultConfig.id, existing[0].id));
  }
}
