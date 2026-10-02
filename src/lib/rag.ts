/**
 * SolveX RAG — seeds the full paradox/solution/product catalog into a
 * Blink RAG collection so dAIsy haMINJA answers with grounded context.
 *
 * Architecture:
 *  1. On first call, create the collection (idempotent) and seed all docs.
 *  2. `queryRAG(query)` → blink.rag.aiSearch → returns answer + sources.
 *  3. If RAG is unavailable / unseeded, returns null so callers fall back
 *     to raw blink.ai.streamText.
 */
import { blink } from '@/blink/client'
import {
  PARADOXES,
  SOVEREIGN_SOLUTIONS,
  BRAIN_PRODUCTS,
  CHAMBER_META,
  SOLUTION_LAYERS,
} from '@/data/brainData'

/* ── Constants ──────────────────────────────────────────────────────── */
const COLLECTION_NAME = 'solvex-knowledge-base'
const SEED_FLAG_KEY = 'solvex_rag_seeded'

interface RAGResult {
  answer: string
  sources: { filename: string; excerpt: string; score: number }[]
}

/* ── Internal state ─────────────────────────────────────────────────── */
let seededPromise: Promise<void> | null = null

/* ── Build seed documents from brainData ────────────────────────────── */
function buildSeedDocs(): { filename: string; content: string }[] {
  const docs: { filename: string; content: string }[] = []

  // Chamber overviews
  for (const ch of CHAMBER_META) {
    docs.push({
      filename: `chamber-${ch.num}.txt`,
      content: `CHAMBER ${ch.num}: ${ch.name}\nSymbol: ${ch.symbol}\nParadoxes: ${ch.paradoxes}\n${ch.desc}`,
    })
  }

  // Paradoxes — grouped by chamber
  for (const p of PARADOXES) {
    docs.push({
      filename: `paradox-${String(p.id).padStart(3, '0')}.txt`,
      content: `PARADOX #${p.id}: ${p.name}\nChamber: ${p.chamber}\n${p.description}`,
    })
  }

  // Sovereign Solutions — grouped by layer
  for (const s of SOVEREIGN_SOLUTIONS) {
    docs.push({
      filename: `solution-${s.id}.txt`,
      content: `SOLUTION ${s.id}: ${s.name}\nLayer ${s.layer}: ${s.layerName}\n${s.description}`,
    })
  }

  // Solution Layer overviews
  for (const l of SOLUTION_LAYERS) {
    docs.push({
      filename: `layer-${String(l.num).padStart(2, '0')}.txt`,
      content: `SOLUTION LAYER ${l.num}: ${l.name}\nSolutions: ${l.solutions}\n${l.desc}`,
    })
  }

  // Brain Products
  for (const bp of BRAIN_PRODUCTS) {
    docs.push({
      filename: `brain-product-${bp.id}.txt`,
      content: `BRAIN PRODUCT: ${bp.id}\nName: ${bp.name}\nCategory: ${bp.category}\n${bp.description}`,
    })
  }

  // Platform overview
  docs.push({
    filename: 'solvex-overview.txt',
    content: `SOLVEX PARADOX BOX — Enterprise B2B Solutions Marketplace.\nPlatform: U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine).\n59 paradoxes resolved across 5 Chambers. 105 sovereign solutions across 7 solution layers. 13 brain products. 27 marketplace products.\nCompliance: NIST SP 800-53, SOC 2 Type II, ISO 27001, OSFI B-13, FINTRAC, PIPEDA.\nIRS-First Rule: 21% corporate tax sequestered to EFTPS before any revenue release.\nContact: gods.battle.axe.88@gmail.com. Payment: paypal.me/tjites.\nChambers: I-FOUNDATIONS (13 paradoxes), II-MOTION & TIME (10), III-CHOICE & SELF (15), IV-STRUCTURE (10), V-TRANSCENDENCE (11).\nSolution Layers: 1-Chrono-Consistency (15), 2-Enclave Cryptography (15), 3-Hardware Orchestration (15), 4-Ad-Hoc Routing/Mesh/DHT (15), 5-Consensus Mechanics (15), 6-Regulatory Compliance/SOC2 (15), 7-Cognitive Memory/Pheromones (15).`,
  })

  return docs
}

/* ── Ensure collection exists (idempotent) ─────────────────────────── */
async function ensureCollection(): Promise<void> {
  try {
    await blink.rag.createCollection({
      name: COLLECTION_NAME,
      description: 'SolveX Paradox Box — paradoxes, solutions, products, and platform knowledge',
    })
    console.log('[RAG] Collection created:', COLLECTION_NAME)
  } catch (err: any) {
    const isExists =
      err?.message?.includes('409') ||
      err?.message?.includes('already exists') ||
      err?.code === 'COLLECTION_EXISTS'
    if (isExists) {
      console.log('[RAG] Collection already exists, reusing')
    } else {
      console.error('[RAG] Collection creation failed:', err)
      throw err
    }
  }
}

/* ── Seed all documents into the collection (runs once) ─────────────── */
async function seedCollection(): Promise<void> {
  // Check if already seeded in this session
  if (seededPromise) {
    await seededPromise
    return
  }

  seededPromise = (async () => {
    try {
      // Check localStorage flag (browser-only)
      if (typeof window !== 'undefined' && localStorage.getItem(SEED_FLAG_KEY)) {
        console.log('[RAG] Already seeded (localStorage flag)')
        return
      }

      await ensureCollection()

      const docs = buildSeedDocs()
      console.log(`[RAG] Seeding ${docs.length} documents into "${COLLECTION_NAME}"...`)

      let uploaded = 0
      for (const doc of docs) {
        try {
          const result = await blink.rag.upload({
            collectionName: COLLECTION_NAME,
            filename: doc.filename,
            content: doc.content,
          })
          // Wait for each doc to be ready (poll up to 30s)
          if (result.status === 'pending' || result.status === 'processing') {
            for (let i = 0; i < 15; i++) {
              await new Promise(r => setTimeout(r, 2000))
              const d = await blink.rag.getDocument(result.id)
              if (d.status === 'ready') break
              if (d.status === 'error') {
                console.warn(`[RAG] Doc ${doc.filename} failed:`, d.errorMessage)
                break
              }
            }
          }
          uploaded++
        } catch (uploadErr: any) {
          // Skip duplicate content errors
          if (uploadErr?.message?.includes('identical content')) {
            console.log(`[RAG] Skipping duplicate: ${doc.filename}`)
          } else {
            console.warn(`[RAG] Upload failed for ${doc.filename}:`, uploadErr?.message)
          }
        }
      }

      console.log(`[RAG] Seeding complete: ${uploaded}/${docs.length} documents`)
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEED_FLAG_KEY, 'true')
      }
    } catch (err) {
      console.error('[RAG] Seeding failed:', err)
      seededPromise = null // allow retry
      throw err
    }
  })()

  await seededPromise
}

/* ── Public: Query RAG and return answer + sources ──────────────────── */
export async function queryRAG(query: string): Promise<RAGResult | null> {
  try {
    // Ensure collection is seeded (fire-and-forget — first call seeds, subsequent calls are no-ops)
    seedCollection().catch(() => {})

    const result = await blink.rag.aiSearch({
      collectionName: COLLECTION_NAME,
      query,
      model: 'google/gemini-3-flash',
    })

    if (!result.answer || result.answer.includes("couldn't find")) {
      return null
    }

    return {
      answer: result.answer,
      sources: (result.sources ?? []).map(s => ({
        filename: s.filename,
        excerpt: s.excerpt,
        score: s.score,
      })),
    }
  } catch (err: any) {
    // Collection not found / not yet seeded — graceful fallback
    const isNotFound =
      err?.message?.includes('404') ||
      err?.message?.includes('not found') ||
      err?.code === 'COLLECTION_NOT_FOUND'
    if (isNotFound) {
      console.log('[RAG] Collection not ready yet, falling back to raw AI')
      return null
    }
    console.error('[RAG] Search failed:', err)
    return null
  }
}

/** Start seeding the RAG collection in the background (non-blocking). */
export function initRAG(): void {
  seedCollection().catch(() => {})
}
