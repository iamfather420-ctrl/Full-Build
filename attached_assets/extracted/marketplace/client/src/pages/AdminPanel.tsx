import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Tab = "overview" | "orders" | "vault" | "config";

export default function AdminPanel() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedFunds, setSelectedFunds] = useState<string[]>([]);
  const [newHoldPeriod, setNewHoldPeriod] = useState<number>(72);

  const { data: allOrders } = trpc.orders.getAllOrders.useQuery();
  const { data: vaultEntries } = trpc.vault.getAllEntries.useQuery();
  const { data: availableFunds } = trpc.vault.getAvailableFunds.useQuery();
  const { data: vaultConfig } = trpc.vault.getConfig.useQuery();

  const withdrawMutation = trpc.vault.withdraw.useMutation();
  const updateConfigMutation = trpc.vault.updateConfig.useMutation();
  const processHoldsMutation = trpc.vault.processHolds.useMutation();

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

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono text-lg">Access Denied</p>
          <p className="text-cyan-400 font-mono text-sm">Admin privileges required</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono"
          >
            BACK HOME
          </Button>
        </div>
      </div>
    );
  }

  const handleWithdraw = async () => {
    if (selectedFunds.length === 0) return;
    try {
      await withdrawMutation.mutateAsync({ entryIds: selectedFunds });
      setSelectedFunds([]);
    } catch (error) {
      console.error("Withdrawal failed:", error);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await updateConfigMutation.mutateAsync({ holdPeriodHours: newHoldPeriod });
    } catch (error) {
      console.error("Config update failed:", error);
    }
  };

  const handleProcessHolds = async () => {
    try {
      await processHoldsMutation.mutateAsync();
    } catch (error) {
      console.error("Process holds failed:", error);
    }
  };

  const calculateTotalVault = vaultEntries
    ?.reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
    .toFixed(8) || "0";

  const calculateAvailableFunds = availableFunds
    ?.reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
    .toFixed(8) || "0";

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
            <span className="text-cyan-400 font-mono text-xs">ADMIN • {user?.name}</span>
            <button
              onClick={() => navigate("/marketplace")}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition"
            >
              MARKETPLACE
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-5xl md:text-6xl font-black font-mono mb-2"
              style={{
                textShadow: "0 0 30px rgba(0, 255, 200, 0.8)",
                color: "#00ffc8",
              }}
            >
              ADMIN PANEL
            </h1>
            <p className="text-cyan-400 font-mono text-xs">[ OWNER-ONLY CONTROL CENTER ]</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-cyan-900/30 pb-4">
            {(["overview", "orders", "vault", "config"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-mono text-xs transition ${
                  activeTab === tab
                    ? "text-cyan-300 border-b-2 border-cyan-400"
                    : "text-cyan-600 hover:text-cyan-400"
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-2 border-cyan-500/30 bg-cyan-950/10 p-6">
                <p className="text-xs font-mono text-cyan-600 mb-2">TOTAL VAULT BALANCE</p>
                <p className="text-3xl font-mono font-bold text-cyan-300">{calculateTotalVault}</p>
                <p className="text-xs font-mono text-cyan-600 mt-2">All payments (pending + held)</p>
              </Card>

              <Card className="border-2 border-green-500/30 bg-green-950/10 p-6">
                <p className="text-xs font-mono text-green-600 mb-2">AVAILABLE FOR WITHDRAWAL</p>
                <p className="text-3xl font-mono font-bold text-green-300">{calculateAvailableFunds}</p>
                <p className="text-xs font-mono text-green-600 mt-2">Hold period expired</p>
              </Card>

              <Card className="border-2 border-purple-500/30 bg-purple-950/10 p-6">
                <p className="text-xs font-mono text-purple-600 mb-2">TOTAL ORDERS</p>
                <p className="text-3xl font-mono font-bold text-purple-300">{allOrders?.length || 0}</p>
                <p className="text-xs font-mono text-purple-600 mt-2">All time</p>
              </Card>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold font-mono text-cyan-300 mb-4">[ ALL ORDERS ]</h2>
              {allOrders && allOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-cyan-700/30">
                        <th className="text-left py-2 px-3 text-cyan-600">ORDER ID</th>
                        <th className="text-left py-2 px-3 text-cyan-600">USER</th>
                        <th className="text-left py-2 px-3 text-cyan-600">PARADOX</th>
                        <th className="text-left py-2 px-3 text-cyan-600">STATUS</th>
                        <th className="text-left py-2 px-3 text-cyan-600">AMOUNT</th>
                        <th className="text-left py-2 px-3 text-cyan-600">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map((order: any) => (
                        <tr key={order.id} className="border-b border-cyan-900/20 hover:bg-cyan-950/20">
                          <td className="py-2 px-3 text-cyan-400">{order.id.slice(0, 8)}...</td>
                          <td className="py-2 px-3 text-cyan-400">{order.userId}</td>
                          <td className="py-2 px-3 text-cyan-400">{order.paradoxId}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                order.status === "delivered"
                                  ? "border-green-500/50 text-green-300"
                                  : order.status === "confirmed"
                                    ? "border-blue-500/50 text-blue-300"
                                    : "border-yellow-500/50 text-yellow-300"
                              }`}
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-cyan-400">
                            {order.amount} {order.paymentMethod.toUpperCase()}
                          </td>
                          <td className="py-2 px-3 text-cyan-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-cyan-400 font-mono">No orders yet</p>
              )}
            </div>
          )}

          {activeTab === "vault" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold font-mono text-cyan-300 mb-4">[ VAULT LEDGER ]</h2>
                {vaultEntries && vaultEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-cyan-700/30">
                          <th className="text-left py-2 px-3 text-cyan-600">ENTRY ID</th>
                          <th className="text-left py-2 px-3 text-cyan-600">STATUS</th>
                          <th className="text-left py-2 px-3 text-cyan-600">AMOUNT</th>
                          <th className="text-left py-2 px-3 text-cyan-600">HOLD UNTIL</th>
                          <th className="text-left py-2 px-3 text-cyan-600">SELECT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vaultEntries.map((entry: any) => (
                          <tr key={entry.id} className="border-b border-cyan-900/20 hover:bg-cyan-950/20">
                            <td className="py-2 px-3 text-cyan-400">{entry.id.slice(0, 8)}...</td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  entry.status === "available"
                                    ? "border-green-500/50 text-green-300"
                                    : entry.status === "withdrawn"
                                      ? "border-gray-500/50 text-gray-300"
                                      : "border-yellow-500/50 text-yellow-300"
                                }`}
                              >
                                {entry.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-cyan-400">
                              {entry.amount} {entry.paymentMethod.toUpperCase()}
                            </td>
                            <td className="py-2 px-3 text-cyan-600">
                              {new Date(entry.holdUntil).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              {entry.status === "available" && (
                                <input
                                  type="checkbox"
                                  checked={selectedFunds.includes(entry.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedFunds([...selectedFunds, entry.id]);
                                    } else {
                                      setSelectedFunds(selectedFunds.filter((id) => id !== entry.id));
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-cyan-400 font-mono">No vault entries</p>
                )}
              </div>

              {/* Withdrawal Section */}
              <Card className="border-2 border-green-500/30 bg-green-950/10 p-6">
                <h3 className="text-lg font-bold font-mono text-green-300 mb-4">[ WITHDRAW FUNDS ]</h3>
                <div className="space-y-4">
                  <p className="text-sm font-mono text-green-400">
                    Selected: {selectedFunds.length} entries
                  </p>
                  <Button
                    onClick={handleWithdraw}
                    disabled={selectedFunds.length === 0 || withdrawMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-black font-mono"
                  >
                    {withdrawMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        WITHDRAWING...
                      </>
                    ) : (
                      "WITHDRAW SELECTED"
                    )}
                  </Button>
                </div>
              </Card>

              {/* Process Holds */}
              <Card className="border-2 border-blue-500/30 bg-blue-950/10 p-6">
                <h3 className="text-lg font-bold font-mono text-blue-300 mb-4">[ PROCESS HOLDS ]</h3>
                <p className="text-sm font-mono text-blue-400 mb-4">
                  Check for expired holds and mark as available for withdrawal
                </p>
                <Button
                  onClick={handleProcessHolds}
                  disabled={processHoldsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-black font-mono"
                >
                  {processHoldsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      PROCESSING...
                    </>
                  ) : (
                    "PROCESS HOLDS"
                  )}
                </Button>
              </Card>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <Card className="border-2 border-cyan-500/30 bg-cyan-950/10 p-6">
                <h2 className="text-lg font-bold font-mono text-cyan-300 mb-4">[ VAULT CONFIGURATION ]</h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-cyan-600 block mb-2">HOLD PERIOD (HOURS)</label>
                    <input
                      type="number"
                      value={newHoldPeriod}
                      onChange={(e) => setNewHoldPeriod(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-black/50 border border-cyan-700/30 rounded font-mono text-cyan-300"
                    />
                    <p className="text-xs font-mono text-cyan-600 mt-2">
                      Current: {vaultConfig?.holdPeriodHours} hours ({(vaultConfig?.holdPeriodHours || 72) / 24} days)
                    </p>
                  </div>

                  <Button
                    onClick={handleUpdateConfig}
                    disabled={updateConfigMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-black font-mono"
                  >
                    {updateConfigMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        UPDATING...
                      </>
                    ) : (
                      "UPDATE CONFIG"
                    )}
                  </Button>
                </div>
              </Card>
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
