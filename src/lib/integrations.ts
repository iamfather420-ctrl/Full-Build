/**
 * SolveX Paradox Box — Unified Integration Layer
 *
 * Wires together DB persistence, email notifications, real-time sync,
 * and Groq AI fallback into a single `integrations` export.
 */
import { blink } from '@/blink/client'
import type { CompiledModule } from './daisyProvisioner'

export interface Contract {
  id: string; prospectId: string; companyName: string
  grossRevenue: number; taxLiability: number; netRevenue: number
  eftpsTraceId: string; status: string; provisioningId: string
  signedAt: string
}

export interface OutboundProspect {
  id: string; companyName: string; sector?: string; region?: string
  stage: string; inefficiency?: string; proposedStrategy?: string
  complianceChecked?: string; estimatedRoiSavings: number
  dynamicCalculatedPrice: number; initialContactTemplate?: string
  probability: number; status?: string; lastAction?: string
}

interface ProvRow { id: string; buyerId: string; blueprintId: string; tier: string; specifications: string; status: string; deploymentHash: string | null; outreachDispatched: number; deploymentLog: string; companyName: string | null; contactEmail: string | null; createdAt: string; updatedAt: string }
interface ProspRow { id: string; companyName: string; sector: string | null; region: string | null; stage: string; inefficiency: string | null; proposedStrategy: string | null; complianceChecked: string | null; estimatedRoiSavings: number; dynamicCalculatedPrice: number; initialContactTemplate: string | null; probability: number; lastAction: string | null; userId: string; createdAt: string; updatedAt: string }
interface ContrRow { id: string; prospectId: string; companyName: string; grossRevenue: number; taxLiability: number; netRevenue: number; eftpsTraceId: string; status: string; provisioningId: string | null; userId: string; signedAt: string; createdAt: string }
interface MileRow { id: string; lamportTimestamp: number; actionType: string; details: string; userId: string; createdAt: string }

const USER = 'admin'
const iso = () => new Date().toISOString()

export const integrations = {
  async persistProvisioning(module: CompiledModule) {
    const ts = iso()
    await blink.db.table<ProvRow>('provisioning_ledger').upsert({
      id: module.blueprintId, buyerId: module.buyerId, blueprintId: module.blueprintId,
      tier: module.tier, specifications: JSON.stringify(module.specifications),
      status: module.status, deploymentHash: module.deploymentHash,
      outreachDispatched: module.outreachDispatched ? 1 : 0,
      deploymentLog: JSON.stringify(module.deploymentLog),
      companyName: null, contactEmail: null, createdAt: ts, updatedAt: ts,
    })
  },

  async persistProspect(prospect: OutboundProspect) {
    const ts = iso()
    await blink.db.table<ProspRow>('outreach_prospects').upsert({
      id: prospect.id, companyName: prospect.companyName,
      sector: prospect.sector ?? null, region: prospect.region ?? null,
      stage: prospect.stage, inefficiency: prospect.inefficiency ?? null,
      proposedStrategy: prospect.proposedStrategy ?? null,
      complianceChecked: prospect.complianceChecked ?? null,
      estimatedRoiSavings: prospect.estimatedRoiSavings,
      dynamicCalculatedPrice: prospect.dynamicCalculatedPrice,
      initialContactTemplate: prospect.initialContactTemplate ?? null,
      probability: prospect.probability, lastAction: prospect.lastAction ?? null,
      userId: USER, createdAt: ts, updatedAt: ts,
    })
  },

  async persistContract(contract: Contract) {
    await blink.db.table<ContrRow>('contracts').create({
      id: contract.id, prospectId: contract.prospectId,
      companyName: contract.companyName, grossRevenue: contract.grossRevenue,
      taxLiability: contract.taxLiability, netRevenue: contract.netRevenue,
      eftpsTraceId: contract.eftpsTraceId, status: contract.status,
      provisioningId: contract.provisioningId || null,
      userId: USER, signedAt: contract.signedAt, createdAt: iso(),
    })
  },

  async logMilestone(actionType: string, details: string) {
    await blink.db.table<MileRow>('system_milestones').create({
      id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      lamportTimestamp: Date.now(), actionType, details,
      userId: USER, createdAt: iso(),
    })
  },

  async sendContractNotification(email: string, companyName: string, revenue: number, blueprintId: string) {
    const tax = Math.round(revenue * 0.21 * 100) / 100
    const net = Math.round((revenue - tax) * 100) / 100
    await blink.notifications.email({
      to: email,
      subject: `Contract Secured: ${companyName} — SolveX Paradox Box`,
      html: [
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>',
        '<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#e0e0e0">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">',
        '<tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #333">',
        '<tr><td style="padding:32px 40px 16px;text-align:center">',
        '<h1 style="margin:0;font-size:22px;color:#D4AF37;letter-spacing:1px">SOLVEX PARADOX BOX</h1>',
        '<p style="margin:8px 0 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px">Contract Secured</p>',
        '</td></tr>',
        '<tr><td style="padding:0 40px"><hr style="border:none;border-top:1px solid #D4AF37;opacity:0.3"></td></tr>',
        '<tr><td style="padding:24px 40px">',
        '<p style="margin:0 0 16px;font-size:15px;line-height:1.6">The IRS-First Rule has been executed. A new contract has been secured under the U.A.R.E.F.A.K.E. sovereign provisioning pipeline.</p>',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;border:1px solid #333">',
        '<tr><td style="padding:20px 24px"><table width="100%" cellpadding="0" cellspacing="0">',
        `<tr><td style="padding:6px 0;font-size:13px;color:#888;width:140px">Company</td><td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600">${companyName}</td></tr>`,
        `<tr><td style="padding:6px 0;font-size:13px;color:#888">Gross Revenue</td><td style="padding:6px 0;font-size:14px;color:#fff">$${revenue.toLocaleString()}</td></tr>`,
        `<tr><td style="padding:6px 0;font-size:13px;color:#888">Tax Liability (21%)</td><td style="padding:6px 0;font-size:14px;color:#ef4444">$${tax.toLocaleString()}</td></tr>`,
        `<tr><td style="padding:6px 0;font-size:13px;color:#888">Net Revenue</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600">$${net.toLocaleString()}</td></tr>`,
        `<tr><td style="padding:6px 0;font-size:13px;color:#888">Blueprint ID</td><td style="padding:6px 0;font-size:13px;color:#D4AF37;font-family:monospace">${blueprintId}</td></tr>`,
        '</table></td></tr></table>',
        '<p style="margin:20px 0 0;font-size:12px;color:#666;text-align:center">IRS-First Rule &bull; EFTPS Sequestered &bull; SOC 2 Type II<br>U.A.R.E.F.A.K.E. Pipeline &mdash; Autonomous &amp; Sovereign</p>',
        '</td></tr>',
        '<tr><td style="padding:16px 40px 32px;text-align:center"><p style="margin:0;font-size:11px;color:#444">SolveX Paradox Box · gods.battle.axe.88@gmail.com · paypal.me/tjites</p></td></tr>',
        '</table></td></tr></table></body></html>',
      ].join(''),
    })
  },

  async broadcastProvisioning(module: CompiledModule) {
    try {
      await blink.realtime.publish('solvex-provisioning', 'provisioning-update', module)
    } catch { /* realtime unavailable */ }
  },

  subscribeToProvisioning(onUpdate: (module: CompiledModule) => void): () => void {
    const channel = blink.realtime.channel('solvex-provisioning')
    channel.onMessage((msg) => {
      if (msg.type === 'provisioning-update') onUpdate(msg.data as CompiledModule)
    })
    channel.subscribe({ userId: USER }).catch(() => {})
    return () => { channel.unsubscribe() }
  },

  async groqStreamText(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) return
    try {
      await blink.ai.streamText({ model: 'google/gemini-3-flash', messages: messages as any, signal }, onChunk)
    } catch (err: any) {
      if (signal?.aborted) return
      onChunk(`\n[Groq fallback unavailable — ${err?.message ?? 'unknown error'}]\n`)
    }
  },
}
