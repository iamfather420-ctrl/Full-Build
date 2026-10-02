import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function UserLibrary() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { data: library, isLoading } = trpc.library.getMyLibrary.useQuery();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-cyan-400 font-mono text-lg">Authentication required</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono"
          >
            SIGN IN
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
              onClick={() => navigate("/marketplace")}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition"
            >
              MARKETPLACE
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
              MY LIBRARY
            </h1>
            <p className="text-cyan-300 font-mono text-sm mb-2">
              [ YOUR UNLOCKED PARADOX SOLUTIONS ]
            </p>
            <p className="text-cyan-400 font-mono text-xs">
              {user?.name} • {library?.length || 0} purchased solutions
            </p>
          </div>

          {/* Library Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : library && library.length > 0 ? (
            <div className="space-y-8">
              {library.map((purchase: any) =>               {
                const product = purchase.paradox as any;
                if (!product) return null;

                return (
                    <Card
                      key={purchase.id}
                      className={`border-2 ${categoryColors[product?.category as "fundamental" | "ai" | "operational"]} p-8 space-y-6`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold font-mono text-cyan-300 mb-2">{product.name}</h2>
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
                          {categoryLabels[product?.category as "fundamental" | "ai" | "operational"]}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-cyan-600 mb-1">PURCHASED</p>
                        <p className="text-sm font-mono text-cyan-400">
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs font-mono text-cyan-600 mb-2">[ THE PARADOX ]</p>
                      <p className="text-cyan-400 font-mono text-sm italic">{product.description}</p>
                    </div>

                    {/* Solution - Unlocked */}
                    <div className="pt-6 border-t border-cyan-700/30">
                      <p className="text-xs font-mono text-green-500 mb-3 flex items-center gap-2">
                        <span>✓</span>
                        <span>[ SOLUTION UNLOCKED ]</span>
                      </p>
                      <div className="bg-black/40 border border-cyan-700/30 rounded p-6">
                        <p className="text-cyan-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {product.solution}
                        </p>
                      </div>
                    </div>

                    {/* Impact */}
                    <div>
                      <p className="text-xs font-mono text-cyan-600 mb-3">[ ENTERPRISE IMPACT ]</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(product?.impact as string[] || []).map((item: string, idx: number) => (
                          <div key={idx} className="p-3 bg-black/40 border border-cyan-700/30 rounded">
                            <p className="text-xs font-mono text-cyan-400">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unlock Status */}
                    <div className="pt-4 border-t border-cyan-700/30">
                      {purchase.unlockedAt ? (
                        <p className="text-xs font-mono text-green-400">
                          ✓ Unlocked on {new Date(purchase.unlockedAt).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-yellow-400">
                          ⏳ Awaiting vault hold expiration...
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 space-y-6">
              <div className="text-6xl">🔒</div>
              <p className="text-cyan-400 font-mono">No paradoxes purchased yet</p>
              <Button
                onClick={() => navigate("/marketplace")}
                className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono"
              >
                BROWSE MARKETPLACE
              </Button>
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
      `}</style>
    </div>
  );
}
