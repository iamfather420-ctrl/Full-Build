import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [selectedRole, setSelectedRole] = useState<"owner" | "subscriber" | null>(null);

  const handleLogin = () => {
    if (!selectedRole) return;
    
    // Store the selected role in sessionStorage for post-login processing
    sessionStorage.setItem("selectedRole", selectedRole);
    
    // Redirect to Manus OAuth login
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
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

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">SOLVEX</h1>
          <p className="text-cyan-300 text-sm">Paradox Vault</p>
        </div>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400">Sign In</CardTitle>
            <CardDescription>Select your account type to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Site Owner Option */}
            <button
              onClick={() => setSelectedRole("owner")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedRole === "owner"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-cyan-500/30 bg-slate-800 hover:border-cyan-400"
              }`}
            >
              <div className="text-left">
                <p className="font-semibold text-cyan-300">Site Owner</p>
                <p className="text-xs text-cyan-300/60">Manage vault, payments & analytics</p>
              </div>
            </button>

            {/* Subscriber Option */}
            <button
              onClick={() => setSelectedRole("subscriber")}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedRole === "subscriber"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-cyan-500/30 bg-slate-800 hover:border-cyan-400"
              }`}
            >
              <div className="text-left">
                <p className="font-semibold text-cyan-300">Subscriber</p>
                <p className="text-xs text-cyan-300/60">Purchase & access paradox solutions</p>
              </div>
            </button>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={!selectedRole}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold mt-6"
            >
              Continue with Manus
            </Button>

            <p className="text-xs text-center text-cyan-300/50 mt-4">
              Secure authentication powered by Manus OAuth
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
