import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

type Category = "all" | "fundamental" | "ai" | "operational";

export default function Marketplace() {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const { data: products, isLoading } = trpc.marketplace.getProducts.useQuery();

  // Initialize products on first load
  useEffect(() => {
    const initProducts = async () => {
      // This is called once to seed the database
      // In a real app, this would be done during deployment
    };
    initProducts();
  }, []);

  const filteredProducts = products
    ? selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory)
    : [];

  const categoryColors = {
    fundamental: "border-blue-500/50 bg-blue-950/20 hover:border-blue-400",
    ai: "border-purple-500/50 bg-purple-950/20 hover:border-purple-400",
    operational: "border-cyan-500/50 bg-cyan-950/20 hover:border-cyan-400",
  };

  const categoryLabels = {
    fundamental: "Fundamental",
    ai: "AI-Specific",
    operational: "Operational",
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
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(0, 255, 200, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(0, 200, 255, 0.05) 0%, transparent 50%)
            `,
            animation: "pulse 8s ease-in-out infinite",
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
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate("/library")}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition"
            >
              MY LIBRARY
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition"
            >
              ADMIN
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1
              className="text-6xl md:text-7xl font-black font-mono mb-4"
              style={{
                textShadow: "0 0 30px rgba(0, 255, 200, 0.8), 0 0 60px rgba(0, 255, 136, 0.4)",
                color: "#00ffc8",
              }}
            >
              PARADOX VAULT
            </h1>
            <p className="text-cyan-300 font-mono text-sm mb-2">
              [ PREMIUM SOLUTIONS FOR UNSOLVABLE PROBLEMS ]
            </p>
            <p className="text-cyan-400 font-mono text-xs leading-relaxed max-w-2xl">
              Acquire cryptographically-secured paradox solutions. Each purchase unlocks exclusive access to
              architectural breakthroughs. Payments held in vault for 72 hours—satisfaction guaranteed or funds
              returned.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mb-12">
            <Button
              onClick={() => setSelectedCategory("all")}
              variant={selectedCategory === "all" ? "default" : "outline"}
              className={`font-mono text-xs ${
                selectedCategory === "all"
                  ? "bg-cyan-600 hover:bg-cyan-700 text-black"
                  : "border-cyan-500/50 text-cyan-400 hover:border-cyan-400"
              }`}
            >
              ALL PARADOXES
            </Button>
            <Button
              onClick={() => setSelectedCategory("fundamental")}
              variant={selectedCategory === "fundamental" ? "default" : "outline"}
              className={`font-mono text-xs ${
                selectedCategory === "fundamental"
                  ? "bg-blue-600 hover:bg-blue-700 text-black"
                  : "border-blue-500/50 text-blue-400 hover:border-blue-400"
              }`}
            >
              FUNDAMENTAL
            </Button>
            <Button
              onClick={() => setSelectedCategory("ai")}
              variant={selectedCategory === "ai" ? "default" : "outline"}
              className={`font-mono text-xs ${
                selectedCategory === "ai"
                  ? "bg-purple-600 hover:bg-purple-700 text-black"
                  : "border-purple-500/50 text-purple-400 hover:border-purple-400"
              }`}
            >
              AI-SPECIFIC
            </Button>
            <Button
              onClick={() => setSelectedCategory("operational")}
              variant={selectedCategory === "operational" ? "default" : "outline"}
              className={`font-mono text-xs ${
                selectedCategory === "operational"
                  ? "bg-cyan-600 hover:bg-cyan-700 text-black"
                  : "border-cyan-500/50 text-cyan-400 hover:border-cyan-400"
              }`}
            >
              OPERATIONAL
            </Button>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`border-2 ${categoryColors[product.category]} p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/20 group`}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold font-mono text-cyan-300 group-hover:text-cyan-200 transition">
                          {product.name}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono ${
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

                    {/* Description */}
                    <p className="text-cyan-400 font-mono text-xs italic leading-relaxed">
                      "{product.description}"
                    </p>

                    {/* Impact Preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-cyan-500">[ IMPACT PREVIEW ]</p>
                      <div className="grid grid-cols-2 gap-1">
                        {product.impact.slice(0, 2).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-cyan-500 font-mono text-xs">→</span>
                            <span className="text-cyan-400 font-mono text-xs">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="pt-4 border-t border-cyan-900/30 space-y-2">
                      <p className="text-xs font-mono text-cyan-500">[ PRICING ]</p>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <p className="text-cyan-600">ETH</p>
                          <p className="text-cyan-300">{product.priceEth}</p>
                        </div>
                        <div>
                          <p className="text-cyan-600">USDC</p>
                          <p className="text-cyan-300">${product.priceUsdc}</p>
                        </div>
                        <div>
                          <p className="text-cyan-600">BTC</p>
                          <p className="text-cyan-300">{product.priceBtc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Locked Badge */}
                    <div className="pt-4 border-t border-cyan-900/30">
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-950/40 border border-cyan-700/50 rounded text-xs font-mono text-cyan-400">
                        <span>🔒</span>
                        <span>SOLUTION LOCKED</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-black font-mono text-xs">
                      VIEW & PURCHASE
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
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

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
