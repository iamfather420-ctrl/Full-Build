import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function ProductDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/product/:id");
  const { user, isAuthenticated } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<"eth" | "usdc" | "btc">("eth");
  const [copied, setCopied] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  const productId = params?.id || "";
  const { data: product, isLoading } = trpc.marketplace.getProduct.useQuery({ id: productId });

  const createOrderMutation = trpc.orders.createOrder.useMutation();
  const { data: hasPurchased } = trpc.library.hasPurchased.useQuery({ paradoxId: productId });

  const handleCreateOrder = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    try {
      const result = await createOrderMutation.mutateAsync({
        paradoxId: productId,
        paymentMethod: selectedPayment,
      });
      setCurrentOrder(result);
      setOrderCreated(true);
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan-400 font-mono mb-4">Product not found</p>
          <Button onClick={() => navigate("/marketplace")} className="bg-cyan-600 hover:bg-cyan-700">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const categoryColors = {
    fundamental: "border-blue-500/50 bg-blue-950/20",
    ai: "border-purple-500/50 bg-purple-950/20",
    operational: "border-cyan-500/50 bg-cyan-950/20",
  };

  const categoryLabels = {
    fundamental: "Fundamental Paradox",
    ai: "AI-Specific Paradox",
    operational: "Operational Paradox",
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Exotic animated grid background */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(0, 255, 136, 0.1) 25%, rgba(0, 255, 136, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.1) 75%, rgba(0, 255, 136, 0.1) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0, 255, 136, 0.1) 25%, rgba(0, 255, 136, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.1) 75%, rgba(0, 255, 136, 0.1) 76%, transparent 77%, transparent)
            `,
            backgroundSize: "60px 60px",
            animation: "drift 20s linear infinite",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur border-b border-cyan-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xl font-black font-mono text-cyan-400 tracking-widest hover:text-cyan-300 transition"
          >
            ◆ SOLVEX
          </button>
          <Button
            variant="outline"
            onClick={() => navigate("/marketplace")}
            className="border-cyan-500/50 text-cyan-400 hover:border-cyan-400 font-mono text-xs"
          >
            ← BACK
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1
                  className="text-5xl md:text-6xl font-black font-mono mb-2"
                  style={{
                    textShadow: "0 0 30px rgba(0, 255, 200, 0.8)",
                    color: "#00ffc8",
                  }}
                >
                  {product.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-sm font-mono ${
                    product.category === "fundamental"
                      ? "border-blue-500/50 text-blue-300"
                      : product.category === "ai"
                        ? "border-purple-500/50 text-purple-300"
                        : "border-cyan-500/50 text-cyan-300"
                  }`}
                >
                  {categoryLabels[product.category]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Product Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <Card className="border-2 border-cyan-500/30 bg-cyan-950/10 p-6">
                <h2 className="text-lg font-bold font-mono text-cyan-300 mb-4">[ THE PARADOX ]</h2>
                <p className="text-cyan-400 font-mono text-sm leading-relaxed">{product.description}</p>
              </Card>

              {/* Solution - Locked or Unlocked */}
              {hasPurchased ? (
                <Card className="border-2 border-green-500/50 bg-green-950/20 p-6">
                  <h2 className="text-lg font-bold font-mono text-green-300 mb-4">[ SOLUTION UNLOCKED ]</h2>
                  <p className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {product.solution}
                  </p>
                </Card>
              ) : (
                <Card className="border-2 border-cyan-500/30 bg-cyan-950/10 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🔒</span>
                    <h2 className="text-lg font-bold font-mono text-cyan-300">[ SOLUTION LOCKED ]</h2>
                  </div>
                  <p className="text-cyan-400 font-mono text-sm">
                    Purchase this paradox to unlock the complete solution. Your payment will be held in our vault for
                    72 hours—satisfaction guaranteed.
                  </p>
                </Card>
              )}

              {/* Impact */}
              <Card className="border-2 border-cyan-500/30 bg-cyan-950/10 p-6">
                <h2 className="text-lg font-bold font-mono text-cyan-300 mb-4">[ ENTERPRISE IMPACT ]</h2>
                <div className="grid grid-cols-2 gap-4">
                  {product.impact.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-500 font-mono text-sm">→</span>
                      <span className="text-cyan-400 font-mono text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Purchase */}
            <div className="space-y-6">
              {/* Pricing Card */}
              <Card className="border-2 border-cyan-500/50 bg-cyan-950/20 p-6 sticky top-24">
                <h2 className="text-lg font-bold font-mono text-cyan-300 mb-6">[ PURCHASE ]</h2>

                {!orderCreated ? (
                  <>
                    {/* Payment Method Selection */}
                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-mono text-cyan-500">SELECT PAYMENT METHOD</p>
                      {(["eth", "usdc", "btc"] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setSelectedPayment(method)}
                          className={`w-full p-3 border-2 rounded font-mono text-sm transition ${
                            selectedPayment === method
                              ? "border-cyan-400 bg-cyan-950/40 text-cyan-300"
                              : "border-cyan-700/50 bg-cyan-950/10 text-cyan-400 hover:border-cyan-600"
                          }`}
                        >
                          {method.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* Price Display */}
                    <div className="mb-6 p-4 bg-black/50 border border-cyan-700/30 rounded">
                      <p className="text-xs font-mono text-cyan-600 mb-2">TOTAL PRICE</p>
                      <p className="text-2xl font-mono font-bold text-cyan-300">
                        {selectedPayment === "eth"
                          ? product.priceEth
                          : selectedPayment === "usdc"
                            ? `$${product.priceUsdc}`
                            : product.priceBtc}{" "}
                        {selectedPayment.toUpperCase()}
                      </p>
                    </div>

                    {/* CTA */}
                    {isAuthenticated ? (
                      <Button
                        onClick={handleCreateOrder}
                        disabled={createOrderMutation.isPending}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-sm font-bold"
                      >
                        {createOrderMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            CREATING ORDER...
                          </>
                        ) : (
                          "PROCEED TO PAYMENT"
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => window.location.href = getLoginUrl()}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-sm font-bold"
                      >
                        SIGN IN TO PURCHASE
                      </Button>
                    )}

                    <p className="text-xs font-mono text-cyan-600 mt-4 text-center">
                      72-hour vault hold • Instant delivery on confirmation
                    </p>
                  </>
                ) : (
                  <>
                    {/* Order Created - Payment Instructions */}
                    <div className="space-y-4">
                      <div className="p-3 bg-green-950/30 border border-green-600/50 rounded">
                        <p className="text-xs font-mono text-green-400">✓ ORDER CREATED</p>
                      </div>

                      <div>
                        <p className="text-xs font-mono text-cyan-600 mb-2">SEND PAYMENT TO</p>
                        <div className="p-3 bg-black/50 border border-cyan-700/30 rounded font-mono text-xs text-cyan-300 break-all relative group">
                          {currentOrder.walletAddress}
                          <button
                            onClick={() => copyToClipboard(currentOrder.walletAddress)}
                            className="absolute top-2 right-2 p-1 bg-cyan-600/20 hover:bg-cyan-600/40 rounded transition"
                          >
                            {copied ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-cyan-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-mono text-cyan-600 mb-2">AMOUNT</p>
                        <div className="p-3 bg-black/50 border border-cyan-700/30 rounded font-mono text-sm font-bold text-cyan-300">
                          {currentOrder.amount} {currentOrder.paymentMethod.toUpperCase()}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-mono text-cyan-600 mb-2">VAULT HOLD UNTIL</p>
                        <div className="p-3 bg-black/50 border border-cyan-700/30 rounded font-mono text-xs text-cyan-300">
                          {new Date(currentOrder.holdUntil).toLocaleString()}
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate("/library")}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-sm font-bold"
                      >
                        GO TO MY LIBRARY
                      </Button>

                      <p className="text-xs font-mono text-cyan-600 text-center">
                        Payment will be confirmed automatically. Solution unlocks after vault hold expires.
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(30px, 30px);
          }
          100% {
            transform: translate(0, 0);
          }
        }
      `}</style>
    </div>
  );
}
