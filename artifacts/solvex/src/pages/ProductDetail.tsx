import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams } from "wouter";
import { useGetProduct } from "@workspace/api-client-react";
import { ValidationSandbox } from "@/components/ValidationSandbox";
import { Link } from "wouter";

const CATEGORY_META: Record<string, { badge: string; color: string; chamber: string; symbol: string }> = {
  fundamental: { badge: "ZK-CRYPTOGRAPHY",  color: "#00D4FF", chamber: "CHAMBER I — FOUNDATIONS",    symbol: "ᚱ" },
  operational: { badge: "OPERATIONAL-CORE", color: "#FFD700", chamber: "CHAMBER II — MOTION & TIME",  symbol: "☸" },
  ai:          { badge: "AI GOVERNANCE",    color: "#A78BFA", chamber: "CHAMBER III — CHOICE & SELF", symbol: "☥" },
};

const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const SERIF: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

const CURRENCIES = [
  { key: "card", label: "CARD",  icon: "💳" },
  { key: "eth",  label: "ETH",   icon: "Ξ"  },
  { key: "base", label: "BASE",  icon: "🔵" },
  { key: "usdc", label: "USDC",  icon: "$"  },
  { key: "sol",  label: "SOL",   icon: "◎"  },
] as const;

type Currency = "card" | "eth" | "base" | "usdc" | "sol";

const QR_IMAGES: Partial<Record<Currency, string>> = {
  eth:  "/qr-eth.png",
  base: "/qr-base.png",
  usdc: "/qr-base.png",
  sol:  "/qr-sol.png",
};

interface CryptoPaymentInfo {
  orderId: string;
  currency: string;
  amount: string;
  walletAddress: string;
  instructions: string[];
  rateNote: string;
}

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading } = useGetProduct(id);
  const [currency, setCurrency] = useState<Currency>("card");
  const [ordering, setOrdering] = useState(false);
  const [cryptoInfo, setCryptoInfo] = useState<CryptoPaymentInfo | null>(null);
  const [txHash, setTxHash] = useState("");
  const [txSubmitted, setTxSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function handleOrder() {
    if (!product) return;
    setOrdering(true);
    setError(null);
    try {
      if (currency === "card") {
        const resp = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await resp.json();
        if (data.url) { window.location.href = data.url; return; }
        setError(data.error ?? "Stripe checkout failed");
      } else {
        const resp = await fetch("/api/crypto/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, currency }),
        });
        const data = await resp.json();
        if (resp.ok) { setCryptoInfo(data); }
        else { setError(data.error ?? "Could not create payment intent"); }
      }
    } catch (e: any) {
      setError(e.message ?? "Network error");
    }
    setOrdering(false);
  }

  async function submitTxHash() {
    if (!cryptoInfo || !txHash.trim()) return;
    const resp = await fetch(`/api/crypto/verify/${cryptoInfo.orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: txHash.trim() }),
    });
    if (resp.ok) setTxSubmitted(true);
  }

  if (isLoading) return (
    <DashboardLayout>
      <div style={{ padding: "80px 40px", ...MONO, color: "#3D4560", letterSpacing: "0.2em" }}>
        DECRYPTING VAULT ENTRY...
      </div>
    </DashboardLayout>
  );

  if (!product) return (
    <DashboardLayout>
      <div style={{ padding: "80px 40px", ...MONO, color: "#F87171", letterSpacing: "0.2em" }}>
        PRODUCT NOT FOUND IN VAULT
      </div>
    </DashboardLayout>
  );

  const meta = CATEGORY_META[product.category ?? "fundamental"] ?? CATEGORY_META["fundamental"];
  const col = meta.color;

  const priceMap: Record<string, string | undefined> = {
    card: product.priceUsdc ? "$" + product.priceUsdc + " USD" : undefined,
    eth:  product.priceEth  ? product.priceEth  + " ETH"  : undefined,
    base: product.priceEth  ? product.priceEth  + " ETH"  : undefined,
    usdc: product.priceUsdc ? product.priceUsdc + " USDC" : undefined,
    sol:  product.priceUsdc ? product.priceUsdc + " USDC" : undefined,
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ padding: "20px 40px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/marketplace">
            <span style={{ ...MONO, fontSize: 9, letterSpacing: "0.16em", color: "#5B6480", cursor: "pointer" }}>PARADOX VAULT</span>
          </Link>
          <span style={{ ...MONO, fontSize: 9, color: "#3D4560" }}>›</span>
          <span style={{ ...MONO, fontSize: 9, letterSpacing: "0.16em", color: "#D4AF37" }}>{product.id}</span>
        </div>

        {/* Hero Bar */}
        <div style={{ padding: "28px 40px 0", borderBottom: "1px solid #1A2035", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: col + "08" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <div style={{ ...MONO, fontSize: 20, color: col }}>{meta.symbol}</div>
              <div style={{ ...MONO, fontSize: 7, fontWeight: 800, letterSpacing: "0.2em", border: "1px solid " + col, color: col, padding: "3px 10px" }}>
                {meta.badge}
              </div>
              <div style={{ ...MONO, fontSize: 7, letterSpacing: "0.18em", color: "#3D4560" }}>
                {meta.chamber}
              </div>
              <div style={{ marginLeft: "auto", ...MONO, fontSize: 8, color: "#3D4560" }}>{product.id}</div>
            </div>
            <h1 style={{ ...SERIF, fontSize: 34, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.15, marginBottom: 10, letterSpacing: "-0.01em" }}>
              {product.name}
            </h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 24, flexWrap: "wrap" }}>
              {["TIER-1 CERTIFIED", "OSFI B-13", "ZK PROVEN", "FINTRAC", "72H ESCROW"].map(b => (
                <div key={b} style={{ ...MONO, fontSize: 7, letterSpacing: "0.14em", color: "#5B6480", padding: "3px 8px", border: "1px solid #1A2035" }}>✓ {b}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, padding: "32px 40px", alignItems: "flex-start" }}>

          {/* Left Column */}
          <div style={{ flex: 1 }}>

            {/* Description */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...MONO, fontSize: 9, letterSpacing: "0.2em", color: col, marginBottom: 10, borderBottom: "1px solid #1A2035", paddingBottom: 8 }}>
                TECHNICAL ABSTRACT
              </div>
              <p style={{ fontSize: 14, color: "#9BA3B5", lineHeight: 1.7 }}>{product.description}</p>
            </div>

            {/* Impact */}
            {product.impact && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ ...MONO, fontSize: 9, letterSpacing: "0.2em", color: col, marginBottom: 10, borderBottom: "1px solid #1A2035", paddingBottom: 8 }}>
                  EXPECTED INSTITUTIONAL IMPACT
                </div>
                <p style={{ fontSize: 13, color: "#7B869A", lineHeight: 1.65 }}>{product.impact}</p>
              </div>
            )}

            {/* Validation Sandbox */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: col, fontSize: 14 }}>▶</div>
                <div style={{ ...MONO, fontSize: 9, letterSpacing: "0.2em", color: "#FFFFFF" }}>MATHEMATICAL PROOF VALIDATOR</div>
                <div style={{ ...MONO, fontSize: 8, color: "#3D4560" }}>— CRYSTAL CLEAR BLACK BOX PROTOCOL</div>
              </div>
              <div style={{ marginBottom: 12, ...MONO, fontSize: 9, color: "#5B6480" }}>
                Run the cryptographic verification engine before purchase. Every assertion is deterministic and auditable. Pure mathematical proof — no approximations.
              </div>
              <ValidationSandbox
                productId={product.id}
                productName={product.name}
                category={product.category ?? "fundamental"}
                zkHash={(product as any).zkProofHash ?? undefined}
              />
            </div>

            {/* Solution Material (locked) */}
            <div>
              <div style={{ ...MONO, fontSize: 9, letterSpacing: "0.2em", color: col, marginBottom: 10, borderBottom: "1px solid #1A2035", paddingBottom: 8 }}>
                SOLUTION MATERIAL
              </div>
              <div style={{ background: "#07091A", border: "1px solid #1A2035", position: "relative", overflow: "hidden", minHeight: 100 }}>
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(5,8,15,0.85)",
                  backdropFilter: "blur(6px)", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", zIndex: 10, gap: 10,
                }}>
                  <div style={{ fontSize: 28 }}>🔐</div>
                  <div style={{ ...MONO, fontSize: 10, letterSpacing: "0.2em", color: "#D4AF37" }}>ACCESS RESTRICTED</div>
                  <div style={{ ...MONO, fontSize: 9, color: "#5B6480" }}>Acquire clearance to decrypt</div>
                </div>
                <div style={{ padding: 20, ...MONO, fontSize: 11, color: "#1A2035", lineHeight: 1.8, filter: "blur(3px)" }}>
                  {(product as any).zkProofHash ?? "0x7f82e1b4c9a0d8e23b11488c99a3411b_ENCRYPTED_SOLUTION_PAYLOAD"}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column — Acquisition Panel */}
          <div style={{ width: 300, flexShrink: 0 }}>

            {/* Price Card */}
            <div style={{ background: "#07091A", border: "1px solid " + col + "40", marginBottom: 12, position: "relative", overflow: "hidden" }}>
              <div style={{ height: 2, background: "linear-gradient(90deg, transparent, " + col + ", transparent)" }} />
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A2035" }}>
                <div style={{ ...MONO, fontSize: 8, letterSpacing: "0.2em", color: "#3D4560", marginBottom: 4 }}>ACQUISITION PROTOCOL</div>
                <div style={{ ...SERIF, fontSize: 13, color: "#FFFFFF" }}>72-Hour Escrow · Vault Hold Model</div>
              </div>
              <div style={{ padding: "16px 20px" }}>

                {/* Currency selector */}
                <div style={{ display: "flex", gap: 3, marginBottom: 16, flexWrap: "wrap" }}>
                  {CURRENCIES.map(c => (
                    <button key={c.key} onClick={() => { setCurrency(c.key); setCryptoInfo(null); setError(null); }} style={{
                      flex: "1 1 auto", padding: "7px 4px",
                      background: currency === c.key ? col + "15" : "transparent",
                      border: currency === c.key ? "1px solid " + col : "1px solid #1A2035",
                      color: currency === c.key ? col : "#5B6480",
                      ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer",
                    }}>{c.icon} {c.label}</button>
                  ))}
                </div>

                {/* Price display */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...MONO, fontSize: 26, fontWeight: 600, color: "#FFFFFF", marginBottom: 4 }}>
                    {priceMap[currency] ?? "—"}
                  </div>
                  <div style={{ ...MONO, fontSize: 9, color: "#5B6480" }}>
                    {currency === "card" && "Secure card payment via Stripe"}
                    {currency === "eth"  && product.priceUsdc && "≈ $" + product.priceUsdc + " USD · Ethereum mainnet"}
                    {currency === "base" && product.priceUsdc && "≈ $" + product.priceUsdc + " USD · Base L2 network"}
                    {currency === "usdc" && "USD-pegged stablecoin · Base/Ethereum"}
                    {currency === "sol"  && product.priceUsdc && "≈ $" + product.priceUsdc + " USD · Solana network"}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ marginBottom: 12, padding: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", ...MONO, fontSize: 9, color: "#F87171" }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Crypto payment details (after initiation) */}
                {cryptoInfo && !txSubmitted && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ ...MONO, fontSize: 8, letterSpacing: "0.16em", color: col, marginBottom: 8 }}>
                      SEND {cryptoInfo.amount} {cryptoInfo.currency} TO:
                    </div>

                    {/* QR Code */}
                    {QR_IMAGES[currency] && (
                      <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <img
                          src={QR_IMAGES[currency]}
                          alt={`${cryptoInfo.currency} QR code`}
                          style={{ width: 140, height: 140, border: "1px solid #1A2035", display: "inline-block" }}
                        />
                      </div>
                    )}

                    {/* Address box */}
                    <div style={{ background: "#0A0D18", border: "1px solid #1A2035", padding: "10px", marginBottom: 8 }}>
                      <div style={{ ...MONO, fontSize: 8, color: "#FFFFFF", wordBreak: "break-all", marginBottom: 6, lineHeight: 1.5 }}>
                        {cryptoInfo.walletAddress}
                      </div>
                      <button onClick={() => copyToClipboard(cryptoInfo.walletAddress)} style={{
                        background: copied ? "rgba(52,211,153,0.1)" : "transparent",
                        border: "1px solid " + (copied ? "rgba(52,211,153,0.4)" : "#1A2035"),
                        color: copied ? "#34D399" : "#5B6480",
                        ...MONO, fontSize: 8, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.12em",
                      }}>{copied ? "✓ COPIED" : "COPY ADDRESS"}</button>
                    </div>

                    <div style={{ ...MONO, fontSize: 9, color: "#D4AF37", marginBottom: 4 }}>
                      Amount: {cryptoInfo.amount} {cryptoInfo.currency}
                    </div>
                    <div style={{ ...MONO, fontSize: 8, color: "#5B6480", marginBottom: 10 }}>{cryptoInfo.rateNote}</div>

                    {/* Order ID for reference */}
                    <div style={{ ...MONO, fontSize: 8, color: "#3D4560", marginBottom: 10 }}>
                      Order: {cryptoInfo.orderId}
                    </div>

                    <div style={{ ...MONO, fontSize: 8, letterSpacing: "0.14em", color: "#3D4560", marginBottom: 6 }}>
                      PASTE TX HASH AFTER SENDING:
                    </div>
                    <input
                      value={txHash}
                      onChange={e => setTxHash(e.target.value)}
                      placeholder={currency === "sol" ? "your-solana-tx-signature..." : "0x..."}
                      style={{
                        width: "100%", background: "#0A0D18", border: "1px solid #1A2035",
                        color: "#FFFFFF", ...MONO, fontSize: 9, padding: "8px",
                        marginBottom: 8, boxSizing: "border-box",
                      }}
                    />
                    <button onClick={submitTxHash} disabled={!txHash.trim()} style={{
                      width: "100%", padding: "10px",
                      background: txHash.trim() ? "rgba(52,211,153,0.15)" : "transparent",
                      border: "1px solid rgba(52,211,153,0.4)", color: "#34D399",
                      ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", cursor: "pointer",
                    }}>CONFIRM PAYMENT →</button>
                  </div>
                )}

                {/* Tx submitted */}
                {txSubmitted && (
                  <div style={{
                    padding: "12px", textAlign: "center", marginBottom: 12,
                    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.4)",
                    ...MONO, fontSize: 10, color: "#34D399", letterSpacing: "0.14em",
                  }}>
                    ✓ TX SUBMITTED — AWAITING VERIFICATION
                  </div>
                )}

                {/* Acquire button (hidden once crypto info shown) */}
                {!cryptoInfo && !txSubmitted && (
                  <button onClick={handleOrder} disabled={ordering} style={{
                    width: "100%", padding: "12px",
                    background: ordering ? "#3D4560" : currency === "card"
                      ? "linear-gradient(135deg, #6366F1, #4F46E5)"
                      : "linear-gradient(135deg, #D4AF37, #B8860B)",
                    border: "none", color: "#FFFFFF",
                    ...MONO, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em",
                    cursor: ordering ? "not-allowed" : "pointer",
                  }}>
                    {ordering ? "PROCESSING..." : currency === "card" ? "PAY WITH CARD →" : "INITIATE ACQUISITION →"}
                  </button>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div style={{ background: "#07091A", border: "1px solid #1A2035", padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: "0.2em", color: "#3D4560", marginBottom: 12 }}>VAULT METADATA</div>
              {[
                { k: "Product ID", v: product.id },
                { k: "Chamber",    v: meta.chamber.split("—")[0].trim() },
                { k: "Grade",      v: "TIER-1 INSTITUTIONAL" },
                { k: "Delivery",   v: "IMMEDIATE · POST-ESCROW" },
                { k: "SLA",        v: "99.999% UPTIME" },
                { k: "ZK Proven",  v: "YES — GROTH16" },
                { k: "OSFI",       v: "B-13 COMPLIANT" },
              ].map(row => (
                <div key={row.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0A0D18" }}>
                  <span style={{ ...MONO, fontSize: 9, color: "#5B6480" }}>{row.k}</span>
                  <span style={{ ...MONO, fontSize: 9, color: "#D4AF37" }}>{row.v}</span>
                </div>
              ))}
            </div>

            {/* Glass Box Note */}
            <div style={{ border: "1px solid rgba(212,175,55,0.2)", padding: "14px 16px", background: "rgba(212,175,55,0.03)" }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: "0.18em", color: "#D4AF37", marginBottom: 8 }}>
                ◈ GLASS BOX PROTOCOL
              </div>
              <div style={{ fontSize: 10, color: "#5B6480", lineHeight: 1.6 }}>
                Every action taken by the dAIsy haMINJA brain is logged, verified, and immutable. You receive not just a result — a transparent audit trail of a perfectly executed, paradox-based outcome.
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
