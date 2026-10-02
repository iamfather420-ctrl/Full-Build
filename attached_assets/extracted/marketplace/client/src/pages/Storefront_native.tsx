import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2 } from "lucide-react";

export default function Storefront() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-cyan-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">S</span>
            </div>
            <span className="text-cyan-400 font-bold text-lg">SOLVEX</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-cyan-300 text-sm">{user?.name || user?.email}</span>
                <Button
                  onClick={() => navigate("/marketplace")}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Browse
                </Button>
                {user?.role === "admin" && (
                  <Button
                    onClick={() => navigate("/owner")}
                    variant="outline"
                    size="sm"
                    className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    Dashboard
                  </Button>
                )}
                <Button
                  onClick={logout}
                  size="sm"
                  className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, 0.15) 25%, rgba(0, 255, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, 0.15) 75%, rgba(0, 255, 200, 0.15) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, 0.15) 25%, rgba(0, 255, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, 0.15) 75%, rgba(0, 255, 200, 0.15) 76%, transparent 77%, transparent)
              `,
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-cyan-400 mb-4">
            Paradox Vault
          </h1>
          <p className="text-xl text-cyan-300 mb-2">Premium Solutions for Unsolvable Problems</p>
          <p className="text-cyan-300/60 mb-8 max-w-2xl mx-auto">
            Access cryptographically-secured paradox solutions. Payments held in vault for 72 hours. Instant delivery upon confirmation.
          </p>

          {isAuthenticated ? (
            <Button
              onClick={() => navigate("/marketplace")}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8 py-3 text-lg"
            >
              Browse Paradoxes
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-8 py-3 text-lg"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        <div className="border border-cyan-500/30 rounded-lg p-6 bg-slate-900/50">
          <div className="text-cyan-400 text-2xl mb-3">🔐</div>
          <h3 className="text-cyan-300 font-semibold mb-2">Cryptographically Secured</h3>
          <p className="text-cyan-300/60 text-sm">
            Each solution is protected with unique access tokens. No copying or resale possible.
          </p>
        </div>

        <div className="border border-cyan-500/30 rounded-lg p-6 bg-slate-900/50">
          <div className="text-cyan-400 text-2xl mb-3">⏱️</div>
          <h3 className="text-cyan-300 font-semibold mb-2">Vault Protection</h3>
          <p className="text-cyan-300/60 text-sm">
            All payments held in secure vault for 72 hours. Satisfaction guaranteed or full refund.
          </p>
        </div>

        <div className="border border-cyan-500/30 rounded-lg p-6 bg-slate-900/50">
          <div className="text-cyan-400 text-2xl mb-3">⚡</div>
          <h3 className="text-cyan-300 font-semibold mb-2">Instant Delivery</h3>
          <p className="text-cyan-300/60 text-sm">
            Solutions unlock automatically when vault hold expires. Access your library anytime.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-cyan-500/20 mt-16 py-8 text-center text-cyan-300/50 text-sm">
        <p>© 2026 SOLVEX. All paradoxes cryptographically protected.</p>
      </div>
    </div>
  );
}
