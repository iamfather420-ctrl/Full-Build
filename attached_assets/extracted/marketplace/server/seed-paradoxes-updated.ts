import { nanoid } from "nanoid";
import { paradoxProducts, type InsertParadoxProduct } from "../drizzle/schema";
import { getDb } from "./db";

const PARADOXES: Array<{
  name: string;
  category: "fundamental" | "ai" | "operational";
  description: string;
  solution: string;
  impact: string[];
  priceEth: number;
  priceUsdc: number;
  priceBtc: number;
}> = [
  {
    name: "Arrow's Information Paradox",
    category: "fundamental",
    description: "The Information Paradox reveals how information loses exclusivity upon sharing. This solution provides frameworks for information monetization, IP protection, and value capture in knowledge-based businesses.",
    solution: "Arrow's Information Paradox Solution: Implement tiered information release strategies, use cryptographic proofs of knowledge, and create escrow mechanisms that verify buyer competency before full disclosure. Establish information licensing frameworks with verifiable usage restrictions and create derivative value through structured knowledge transfer.",
    impact: ["$2-5M annual savings in IP protection", "Enables information-based business models", "Prevents value leakage in knowledge transfer"],
    priceEth: 0.25,
    priceUsdc: 499,
    priceBtc: 0.0065,
  },
  {
    name: "Productivity Paradox",
    category: "operational",
    description: "Despite massive IT investments, productivity often stagnates. This solution bridges the gap between technology adoption and actual productivity improvements through strategic implementation and change management.",
    solution: "Productivity Paradox Solution: Implement outcome-based metrics instead of activity metrics, create feedback loops between technology and process optimization, and establish clear ROI measurement frameworks. Use AI-driven process mining to identify bottlenecks and automation opportunities that actually improve productivity rather than just shifting work.",
    impact: ["$5-10M+ annual productivity gains", "Measurable ROI on technology investments", "Reduced employee burnout and turnover"],
    priceEth: 0.30,
    priceUsdc: 599,
    priceBtc: 0.0078,
  },
  {
    name: "Triffin Dilemma",
    category: "fundamental",
    description: "The Triffin Dilemma describes the impossible choice between domestic and international monetary policy objectives. This solution provides frameworks for multi-currency optimization and financial system resilience.",
    solution: "Triffin Dilemma Solution: Implement dynamic currency basket strategies, create algorithmic rebalancing mechanisms, and establish cross-border settlement protocols that reduce reserve currency dependency. Use blockchain-based settlement systems and stablecoin frameworks to decouple domestic policy from international reserve requirements.",
    impact: ["$10-50M+ in financial optimization", "Reduced currency risk exposure", "Enhanced monetary policy flexibility"],
    priceEth: 0.40,
    priceUsdc: 799,
    priceBtc: 0.0104,
  },
  {
    name: "Privacy Paradox",
    category: "operational",
    description: "Users claim to value privacy yet share personal data freely. This solution reconciles privacy concerns with data utility through privacy-preserving analytics and differential privacy techniques.",
    solution: "Privacy Paradox Solution: Implement differential privacy algorithms that extract insights without exposing individual data, use federated learning for distributed model training, and create privacy-aware data monetization frameworks. Establish transparent data usage policies with cryptographic verification and user-controlled data sharing mechanisms.",
    impact: ["$3-8M in compliance cost reduction", "Increased user trust and retention", "Regulatory compliance automation"],
    priceEth: 0.325,
    priceUsdc: 649,
    priceBtc: 0.0085,
  },
  {
    name: "Polanyi's Paradox",
    category: "ai",
    description: "We know more than we can tell. This solution enables organizations to extract, codify, and transfer tacit knowledge through AI-assisted knowledge capture and transfer mechanisms.",
    solution: "Polanyi's Paradox Solution: Use multimodal AI to capture tacit knowledge from expert demonstrations, create knowledge graphs from implicit patterns, and build transfer learning systems that encode expert intuition. Implement apprenticeship learning frameworks and create AI systems that learn from observation and experience rather than explicit rules.",
    impact: ["$2-6M in knowledge retention", "Accelerated expert skill transfer", "Reduced dependency on key personnel"],
    priceEth: 0.275,
    priceUsdc: 549,
    priceBtc: 0.0072,
  },
  {
    name: "Liar Paradox",
    category: "fundamental",
    description: "Self-referential statements create logical contradictions. This solution provides frameworks for building consistent systems, validating logical integrity, and handling paradoxical scenarios in software and business logic.",
    solution: "Liar Paradox Solution: Implement type theory and stratified logic systems that prevent self-reference paradoxes, create formal verification frameworks for logical consistency, and build contradiction detection systems. Use constraint satisfaction and automated theorem proving to validate system consistency and identify logical flaws before deployment.",
    impact: ["$1-3M in system reliability", "Prevented logic-based security vulnerabilities", "Formal verification of critical systems"],
    priceEth: 0.225,
    priceUsdc: 449,
    priceBtc: 0.0059,
  },
  {
    name: "Ship of Theseus",
    category: "fundamental",
    description: "If all parts of a ship are replaced, is it still the same ship? This solution addresses identity continuity in evolving systems, organizations, and digital entities through continuous transformation frameworks.",
    solution: "Ship of Theseus Solution: Implement identity persistence mechanisms that survive component replacement, create continuity tracking systems for evolving entities, and establish versioning frameworks that maintain identity across transformations. Use blockchain-based identity anchors and cryptographic continuity proofs to ensure identity persistence through radical change.",
    impact: ["$4-8M in organizational transformation", "Seamless system evolution without disruption", "Preserved institutional knowledge during change"],
    priceEth: 0.35,
    priceUsdc: 699,
    priceBtc: 0.0091,
  },
  {
    name: "Alignment Paradox",
    category: "ai",
    description: "The more powerful an AI system, the harder it is to align with human values. This solution provides frameworks for value alignment, interpretability, and safe AI deployment at scale.",
    solution: "Alignment Paradox Solution: Implement multi-objective optimization frameworks that balance capability with value alignment, create interpretability layers that expose AI decision-making, and establish feedback mechanisms for continuous value alignment. Use constitutional AI methods, value learning from human feedback, and formal verification of safety properties.",
    impact: ["$5-15M in AI risk mitigation", "Trustworthy AI deployment", "Regulatory compliance for AI systems"],
    priceEth: 0.375,
    priceUsdc: 749,
    priceBtc: 0.0098,
  },
  {
    name: "Intelligence Paradox",
    category: "ai",
    description: "Collective intelligence can amplify both wisdom and folly. This solution provides frameworks for extracting true collective intelligence while avoiding information cascades and groupthink.",
    solution: "Intelligence Paradox Solution: Implement diversity-preserving aggregation mechanisms that prevent information cascades, create incentive structures that reward independent thinking, and establish devil's advocate systems. Use prediction markets, ensemble methods with diversity constraints, and epistemic diversity tracking to maintain collective intelligence quality.",
    impact: ["$4-10M in decision quality improvement", "Reduced organizational groupthink", "Better risk identification and management"],
    priceEth: 0.35,
    priceUsdc: 699,
    priceBtc: 0.0091,
  },
  {
    name: "Automation-Vulnerability Paradox",
    category: "operational",
    description: "Automation increases efficiency but creates new attack vectors. This solution provides frameworks for secure automation that reduces both operational complexity and security risk.",
    solution: "Automation-Vulnerability Paradox Solution: Implement zero-trust automation frameworks with continuous verification, create security-first automation patterns that reduce attack surface, and establish automated threat detection for automation systems. Use immutable audit logs, cryptographic verification of automated actions, and anomaly detection to secure automation.",
    impact: ["$10-20M in security cost reduction", "Reduced breach surface area", "Automated compliance and audit trails"],
    priceEth: 0.40,
    priceUsdc: 799,
    priceBtc: 0.0104,
  },
  {
    name: "Transparency-Security Paradox",
    category: "operational",
    description: "Complete transparency can expose security vulnerabilities. This solution balances transparency requirements with security needs through selective disclosure and cryptographic transparency.",
    solution: "Transparency-Security Paradox Solution: Implement zero-knowledge proofs for verification without disclosure, create selective transparency frameworks that expose what matters while protecting what's critical, and establish cryptographic audit trails. Use homomorphic encryption for computation on encrypted data and verifiable computation for transparent yet secure operations.",
    impact: ["$5-12M in compliance and audit costs", "Regulatory transparency compliance", "Maintained security posture with full auditability"],
    priceEth: 0.375,
    priceUsdc: 749,
    priceBtc: 0.0098,
  },
  {
    name: "Liar Paradox - Extended",
    category: "fundamental",
    description: "Extended paradox resolution for complex, multi-layered logical systems with advanced consistency requirements.",
    solution: "Extended Liar Paradox Solution: Implement advanced type hierarchies, create multi-level stratification systems, and establish formal verification at scale. Use automated theorem proving with constraint satisfaction and build contradiction resolution engines for complex logical systems.",
    impact: ["$2-4M in system reliability", "Enterprise-scale logical verification", "Automated consistency checking"],
    priceEth: 0.275,
    priceUsdc: 549,
    priceBtc: 0.0072,
  },
];

export async function seedParadoxes() {
  const db = await getDb();
  if (!db) {
    console.log("[Seed] Database not available, skipping paradox seeding");
    return;
  }

  try {
    // Check if paradoxes already exist
    const existing = await db.select().from(paradoxProducts).limit(1);
    if (existing.length > 0) {
      console.log("[Seed] Paradoxes already seeded, skipping");
      return;
    }

    const productsToInsert = PARADOXES.map((p) => ({
      id: nanoid(),
      name: p.name,
      category: p.category as "fundamental" | "ai" | "operational",
      description: p.description,
      solution: p.solution,
      impact: JSON.stringify(p.impact) as any,
      priceEth: p.priceEth as any,
      priceUsdc: p.priceUsdc as any,
      priceBtc: p.priceBtc as any,
    }));

    for (const product of productsToInsert) {
      await db.insert(paradoxProducts).values(product);
    }
    console.log(`[Seed] Successfully seeded ${PARADOXES.length} paradox products`);
  } catch (error) {
    console.error("[Seed] Failed to seed paradoxes:", error);
  }
}
