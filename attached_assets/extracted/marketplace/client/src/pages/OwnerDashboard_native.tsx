import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Clock, DollarSign, LogOut, Settings, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OwnerDashboard() {
  const { user, loading } = useAuth();
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [selectedVaultEntries, setSelectedVaultEntries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch owner data
  const { data: settings, isLoading: settingsLoading } = trpc.owner.getSettings.useQuery();
  const { data: notifications, isLoading: notificationsLoading } = trpc.owner.getNotifications.useQuery();
  const { data: auditLog, isLoading: auditLoading } = trpc.owner.getAuditLog.useQuery({
    limit: 50,
    offset: 0,
  });
  const { data: systemStats, isLoading: statsLoading } = trpc.owner.getSystemStats.useQuery();
  const { data: vaultEntries, isLoading: vaultLoading } = trpc.vault.getAllEntries.useQuery();

  // Mutations
  const withdrawalMutation = trpc.owner.initiateWithdrawal.useMutation();

  // Check if user is admin
  if (!loading && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Only the system owner can access this dashboard.</p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  const handleWithdrawal = async () => {
    if (!withdrawalAddress.trim()) {
      toast.error("Please enter a withdrawal address");
      return;
    }

    if (selectedVaultEntries.length === 0) {
      toast.error("Please select at least one vault entry to withdraw");
      return;
    }

    try {
      const result = await withdrawalMutation.mutateAsync({
        entryIds: selectedVaultEntries,
        withdrawalAddress,
      });

      toast.success(`Withdrawal initiated: ${result.totalAmount} to ${withdrawalAddress}`);
      setWithdrawalAddress("");
      setSelectedVaultEntries([]);
    } catch (error: any) {
      toast.error(error.message || "Withdrawal failed");
    }
  };

  const availableEntries = vaultEntries?.filter((e) => e.status === "available") || [];
  const totalAvailable = availableEntries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SolveX Owner Dashboard</h1>
            <p className="text-muted-foreground mt-1">Complete system control and monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Logged in as: {user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vault Balance</p>
                <p className="text-2xl font-bold mt-2">${systemStats?.vaultBalance || "0"}</p>
              </div>
              <Wallet className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available for Withdrawal</p>
                <p className="text-2xl font-bold mt-2">${totalAvailable.toFixed(8)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-2">{systemStats?.totalOrders || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-2">${systemStats?.totalRevenue || "0"}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex gap-2 border-b border-border mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "vault"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Vault & Withdrawals
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "notifications"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Notifications ({              notifications?.filter((n: any) => !n.isRead).length || 0})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "audit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Settings
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">System Status</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">System Status</p>
                    <p className="text-lg font-semibold mt-1 capitalize">{settings?.systemStatus || "active"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Payment Detection</p>
                    <p className="text-lg font-semibold mt-1">{settings?.enableAutoPaymentDetection ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Delivery</p>
                    <p className="text-lg font-semibold mt-1">{settings?.enableAutoDelivery ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Withdrawal</p>
                    <p className="text-lg font-semibold mt-1">
                      {settings?.lastWithdrawalAt ? new Date(settings.lastWithdrawalAt).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLog && auditLog.length > 0 ? (
                    auditLog.slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">{log.eventType.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.status === "success"
                              ? "bg-green-500/20 text-green-700"
                              : log.status === "failed"
                                ? "bg-red-500/20 text-red-700"
                                : "bg-yellow-500/20 text-yellow-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Vault & Withdrawals Tab */}
          {activeTab === "vault" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">Initiate Withdrawal</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Withdrawal Address</label>
                    <Input
                      placeholder="Enter crypto wallet address"
                      value={withdrawalAddress}
                      onChange={(e) => setWithdrawalAddress(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Select Vault Entries to Withdraw</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-4">
                      {availableEntries.length > 0 ? (
                        availableEntries.map((entry) => (
                          <label key={entry.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedVaultEntries.includes(entry.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedVaultEntries([...selectedVaultEntries, entry.id]);
                                } else {
                                  setSelectedVaultEntries(selectedVaultEntries.filter((id) => id !== entry.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{entry.amount} {entry.paymentMethod.toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">Order: {entry.orderId}</p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No available funds for withdrawal</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total to Withdraw</p>
                    <p className="text-2xl font-bold mt-1">
                      {selectedVaultEntries
                        .reduce((sum, id) => {
                          const entry = availableEntries.find((e) => e.id === id);
                          return sum + (entry ? parseFloat(entry.amount.toString()) : 0);
                        }, 0)
                        .toFixed(8)}
                    </p>
                  </div>

                  <Button
                    onClick={handleWithdrawal}
                    disabled={withdrawalMutation.isPending || selectedVaultEntries.length === 0 || !withdrawalAddress.trim()}
                    className="w-full"
                  >
                    {withdrawalMutation.isPending ? "Processing..." : "Initiate Withdrawal"}
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">Vault Ledger</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="text-left py-2 px-2">Amount</th>
                        <th className="text-left py-2 px-2">Method</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Hold Until</th>
                        <th className="text-left py-2 px-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaultEntries && vaultEntries.length > 0 ? (
                        vaultEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border hover:bg-muted">
                            <td className="py-3 px-2 font-medium">{entry.amount}</td>
                            <td className="py-3 px-2 uppercase text-xs">{entry.paymentMethod}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  entry.status === "available"
                                    ? "bg-green-500/20 text-green-700"
                                    : entry.status === "held"
                                      ? "bg-yellow-500/20 text-yellow-700"
                                      : entry.status === "withdrawn"
                                        ? "bg-blue-500/20 text-blue-700"
                                        : "bg-gray-500/20 text-gray-700"
                                }`}
                              >
                                {entry.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-xs">
                              {new Date(entry.holdUntil).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2 text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No vault entries
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Payment Notifications</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-lg border ${notif.isRead ? "bg-muted border-border" : "bg-primary/5 border-primary"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium capitalize">{notif.notificationType.replace(/_/g, " ")}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            notif.isRead ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {notif.isRead ? "Read" : "New"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notifications</p>
                )}
              </div>
            </Card>
          )}

          {/* Audit Log Tab */}
          {activeTab === "audit" && (
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Audit Log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-2 px-2">Event</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">User ID</th>
                      <th className="text-left py-2 px-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog && auditLog.length > 0 ? (
                      auditLog.map((log: any) => (
                        <tr key={log.id} className="border-b border-border hover:bg-muted">
                          <td className="py-3 px-2 capitalize">{log.eventType.replace(/_/g, " ")}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                log.status === "success"
                                  ? "bg-green-500/20 text-green-700"
                                  : log.status === "failed"
                                    ? "bg-red-500/20 text-red-700"
                                    : "bg-yellow-500/20 text-yellow-700"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs">{log.userId || "-"}</td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No audit logs
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">System Settings</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Withdrawal Address</p>
                  <p className="text-lg font-mono mt-2">{settings?.withdrawalAddress || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Withdrawn</p>
                  <p className="text-lg font-bold mt-2">${settings?.totalWithdrawn || "0"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">System Status</p>
                  <p className="text-lg capitalize mt-2">{settings?.systemStatus || "active"}</p>
                </div>
              </div>
            </Card>
          )}
        </Tabs>
      </div>
    </div>
  );
}
