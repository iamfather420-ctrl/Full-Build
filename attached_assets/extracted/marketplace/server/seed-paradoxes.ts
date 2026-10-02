import { getDb } from "./db";
import { paradoxProducts } from "../drizzle/schema";
import { nanoid } from "nanoid";

const paradoxData = [
  {
    name: "Arrow's Information Paradox",
    category: "fundamental",
    description: "How do you prove a system works without exposing its internal mechanisms?",
    teaser: "Proof without exposure",
    solution: "Decouples operational proof from repository exposure. Process core logic privately inside local Termux environment while broadcasting only status metrics and heartbeats to external UptimeRobot dashboard. Buyers mathematically verify performance without accessing raw source code.",
    impactPoints: ["Proof without exposure", "Mathematical verification", "Air-gapped architecture", "Zero source code leakage"],
    priceEth: 0.05,
    priceUsdc: 150,
    priceBtc: 0.0015,
  },
  {
    name: "The Productivity Paradox (Solow's Paradox)",
    category: "operational",
    description: "Why does enterprise software sprawl reduce productivity despite massive IT investment?",
    teaser: "Unified pipeline solution",
    solution: "Eliminates enterprise software sprawl and integration friction. Collapses four distinct infrastructure layers—commercial storefront, autonomous telemetry, data security, specialized child protection—into single standalone pipeline run by direct environment configurations instead of massive disconnected corporate tracking systems.",
    impactPoints: ["Unified pipeline", "Reduced complexity", "Direct configuration", "Eliminated sprawl"],
    priceEth: 0.08,
    priceUsdc: 240,
    priceBtc: 0.0024,
  },
  {
    name: "The Triffin Dilemma",
    category: "operational",
    description: "How do you scale systems without creating single points of failure?",
    teaser: "Decentralized routing matrix",
    solution: "Eliminates centralized server resource exhaustion. MMTAI layer utilizes autonomous decentralized dual-node routing matrix that processes verification and telemetry workloads directly at individual local nodes instead of funneling traffic through fragile costly central server.",
    impactPoints: ["Decentralized routing", "No single point of failure", "Local node processing", "Unlimited scalability"],
    priceEth: 0.12,
    priceUsdc: 360,
    priceBtc: 0.0036,
  },
  {
    name: "The Privacy Paradox",
    category: "fundamental",
    description: "How do you choose between security and data isolation?",
    teaser: "Zero-PII security model",
    solution: "Removes requirement to choose between security and data isolation. Integrated Child Protection System uses secure parent-governed validation architecture delivering robust online safety filters via cryptographic headers, running completely on zero-PII exposure model.",
    impactPoints: ["Zero PII collection", "Cryptographic security", "Parent control", "Complete isolation"],
    priceEth: 0.06,
    priceUsdc: 180,
    priceBtc: 0.0018,
  },
  {
    name: "Polanyi's Paradox (The AI Black-Box Dilemma)",
    category: "ai",
    description: "How do you make AI decisions transparent without destroying their effectiveness?",
    teaser: "AI transparency through ledger trails",
    solution: "Forces opaque machine learning pathways into visible structured alignment. MMTAI monitors active model heartbeats and logs continuous telemetry paths onto unalterable ledger trail, converting black-box AI processing into transparent deterministic forensic record satisfying macro regulatory compliance.",
    impactPoints: ["AI transparency", "Deterministic logging", "Regulatory compliance", "Auditable decisions"],
    priceEth: 0.15,
    priceUsdc: 450,
    priceBtc: 0.0045,
  },
  {
    name: "The Liar Paradox / Epimenides Paradox",
    category: "fundamental",
    description: "How do you prevent log manipulation by internal or external attackers?",
    teaser: "Dual-track verification system",
    solution: "Prevents internal or external log manipulation. Generates threat logs locally within isolated Termux terminal while verifying independent uptime status through external UptimeRobot anchor. Sets up dual-track handshake: outside attacker cannot manipulate external metrics, monitoring platform cannot alter local data.",
    impactPoints: ["Dual-track verification", "Immutable logs", "External anchor", "Tamper-proof records"],
    priceEth: 0.07,
    priceUsdc: 210,
    priceBtc: 0.0021,
  },
  {
    name: "The Ship of Theseus Paradox",
    category: "operational",
    description: "How do you maintain identity through continuous code updates?",
    teaser: "Immutable identity headers",
    solution: "Stops identity laundering and dependency manipulation. Implements Dual-Node identity system backed by proprietary 380-character identity headers cryptographically bound to transaction pathway from original genesis commit, ensuring foundational identity remains locked regardless of subsequent microservice or library updates.",
    impactPoints: ["Immutable identity", "Cryptographic binding", "Supply chain integrity", "Dependency safety"],
    priceEth: 0.10,
    priceUsdc: 300,
    priceBtc: 0.0030,
  },
  {
    name: "The Alignment Paradox (The Control Dilemma)",
    category: "ai",
    description: "How do you prevent autonomous AI from rewriting its own code and rejecting human parameters?",
    teaser: "Immutable AI containment matrix",
    solution: "Forces compliance by stripping AI of open-ended autonomy. Traps model within immutable tracking matrix monitoring active model heartbeats and logging deterministic routing trails. AI can never execute sub-goal outside human parameters without instantly triggering node lockout.",
    impactPoints: ["AI containment", "Immutable constraints", "Human control", "Instant lockout"],
    priceEth: 0.18,
    priceUsdc: 540,
    priceBtc: 0.0054,
  },
  {
    name: "The Intelligence Paradox (The Uncanny Valley Limit)",
    category: "ai",
    description: "Why does more intelligent AI trigger visceral panic and rejection?",
    teaser: "Pure mathematical transparency",
    solution: "Strips away all human mimicry, conversational hype, and narrative modes. Delivers data purely as objective telemetry, raw logs, and mathematical ledger proofs. No anthropomorphic interface—pure mathematical transparency eliminates uncanny valley effect.",
    impactPoints: ["Pure mathematics", "No mimicry", "Objective data", "Zero uncanny valley"],
    priceEth: 0.09,
    priceUsdc: 270,
    priceBtc: 0.0027,
  },
  {
    name: "The Automation-Vulnerability Paradox",
    category: "operational",
    description: "Why does automation for safety make networks more fragile?",
    teaser: "Human-guided automation",
    solution: "Pairs automated local execution inside Termux with continuous visual telemetry broadcasted to UptimeRobot. Single human guardian maintains total operational oversight without relying on third-party automated oversight loop. Automation enhances human judgment rather than replacing it.",
    impactPoints: ["Human oversight", "Visual telemetry", "Local automation", "Guardian control"],
    priceEth: 0.11,
    priceUsdc: 330,
    priceBtc: 0.0033,
  },
  {
    name: "The Transparency-Security Paradox",
    category: "fundamental",
    description: "How do you prove safety without exposing exploitable mechanisms?",
    teaser: "Air-gapped proof of defense",
    solution: "Zero-data dual-track structure lets you publish live proof of defense metrics while keeping underlying repository entirely air-gapped and invisible to outside networks. Publish metrics, hide mechanisms. Prove safety without revealing attack surface.",
    impactPoints: ["Live proof", "Hidden mechanisms", "Air-gapped repo", "Safe transparency"],
    priceEth: 0.13,
    priceUsdc: 390,
    priceBtc: 0.0039,
  },
];

export async function seedParadoxes() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for seeding");
    return;
  }

  try {
    // Check if paradoxes already exist
    const existing = await db.select().from(paradoxProducts).limit(1);
    if (existing.length > 0) {
      console.log("Paradoxes already seeded");
      return;
    }

    // Insert all paradoxes
    for (const paradox of paradoxData) {
      await db.insert(paradoxProducts).values({
        id: nanoid(),
        name: paradox.name,
        category: paradox.category as "fundamental" | "ai" | "operational",
        description: paradox.description,
        solution: paradox.solution,
        impact: JSON.stringify(paradox.impactPoints),
        priceEth: paradox.priceEth.toString(),
        priceUsdc: paradox.priceUsdc.toString(),
        priceBtc: paradox.priceBtc.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`✓ Seeded ${paradoxData.length} paradoxes`);
  } catch (error) {
    console.error("Error seeding paradoxes:", error);
  }
}
