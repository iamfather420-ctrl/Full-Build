import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Exotic animated multi-layer background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        {/* Primary grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, 0.15) 25%, rgba(0, 255, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, 0.15) 75%, rgba(0, 255, 200, 0.15) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, 0.15) 25%, rgba(0, 255, 200, 0.15) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, 0.15) 75%, rgba(0, 255, 200, 0.15) 76%, transparent 77%, transparent)
            `,
            backgroundSize: "80px 80px",
            animation: "drift 30s linear infinite",
          }}
        />

        {/* Secondary diagonal grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 48%, rgba(0, 150, 255, 0.08) 49%, rgba(0, 150, 255, 0.08) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, rgba(0, 200, 255, 0.08) 49%, rgba(0, 200, 255, 0.08) 51%, transparent 52%)
            `,
            backgroundSize: "120px 120px",
            animation: "drift-reverse 40s linear infinite",
          }}
        />

        {/* Radial gradients for depth */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(0, 255, 200, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(0, 200, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(100, 0, 255, 0.05) 0%, transparent 70%)
            `,
            animation: "pulse-glow 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur border-b border-cyan-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-black font-mono text-cyan-400 tracking-widest">◆ SOLVEX</div>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate("/marketplace")}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition"
            >
              MARKETPLACE
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigate("/library")}
                className="text-cyan-400 hover:text-cyan-300 font-mono transition"
              >
                LIBRARY
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Title */}
          <div className="space-y-4">
            <h1
              className="text-7xl md:text-8xl font-black font-mono leading-tight"
              style={{
                textShadow: `
                  0 0 40px rgba(0, 255, 200, 0.9),
                  0 0 80px rgba(0, 255, 136, 0.6),
                  0 0 120px rgba(0, 200, 255, 0.3)
                `,
                color: "#00ffc8",
                letterSpacing: "0.1em",
              }}
            >
              SOLVEX
            </h1>
            <p
              className="text-2xl md:text-3xl font-mono tracking-widest"
              style={{
                textShadow: "0 0 20px rgba(0, 255, 200, 0.5)",
                color: "#00ffb8",
              }}
            >
              PARADOX VAULT
            </p>
          </div>

          {/* Subtitle */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-cyan-300 font-mono text-sm leading-relaxed">
              [ CRYPTOGRAPHICALLY-SECURED SOLUTIONS FOR UNSOLVABLE PROBLEMS ]
            </p>
            <p className="text-cyan-400 font-mono text-xs leading-relaxed">
              Acquire premium paradox solutions through crypto payments. Each purchase unlocks exclusive access to
              architectural breakthroughs that resolve fundamental contradictions in enterprise systems. Payments held
              in vault for 72 hours—satisfaction guaranteed.
            </p>
          </div>

          {/* Impact Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
            {[
              {
                title: "CRYPTOGRAPHIC SECURITY",
                desc: "Payments secured with blockchain verification",
              },
              {
                title: "VAULT PROTECTION",
                desc: "72-hour hold period ensures satisfaction",
              },
              {
                title: "INSTANT DELIVERY",
                desc: "Solutions unlock automatically on confirmation",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-4 border-2 border-cyan-500/30 bg-cyan-950/10 rounded">
                <p className="text-xs font-mono text-cyan-500 mb-2">[ {item.title} ]</p>
                <p className="text-xs font-mono text-cyan-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
            <Button
              onClick={() => navigate("/marketplace")}
              className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono font-bold text-base px-8 py-3"
            >
              ENTER VAULT
            </Button>
            {!isAuthenticated && (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:border-cyan-400 font-mono font-bold text-base px-8 py-3"
              >
                SIGN IN
              </Button>
            )}
          </div>

          {/* Bottom tagline */}
          <div className="pt-12 border-t border-cyan-900/30">
            <p className="text-xs font-mono text-cyan-600 tracking-widest">
              [ PREMIUM SOLUTIONS • CRYPTO NATIVE • VAULT PROTECTED ]
            </p>
          </div>
        </div>
      </div>

      {/* Floating accent elements */}
      <div className="fixed bottom-10 left-10 w-32 h-32 border-2 border-cyan-500/20 rounded-lg opacity-30 pointer-events-none" />
      <div className="fixed top-1/4 right-10 w-24 h-24 border-2 border-purple-500/20 rounded-full opacity-30 pointer-events-none" />

      <style>{`
        @keyframes drift {
          0% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(40px, 40px);
          }
          100% {
            transform: translate(0, 0);
          }
        }

        @keyframes drift-reverse {
          0% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-40px, -40px);
          }
          100% {
            transform: translate(0, 0);
          }
        }

        @keyframes pulse-glow {
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
