import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Cpu,
  Eye,
  LogOut,
  Plus,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UserControlPanel() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [showNodePurchase, setShowNodePurchase] = useState(false);
  const [nodesToPurchase, setNodesToPurchase] = useState(1);
  const [selectedParadoxId, setSelectedParadoxId] = useState("");

  // Fetch user data
  const { data: subscriptions, isLoading: subsLoading } = trpc.user.getSubscriptions.useQuery();
  const { data: nodes, isLoading: nodesLoading } = trpc.user.getNodes.useQuery();
  const { data: devices, isLoading: devicesLoading } = trpc.user.getDevices.useQuery();
  const { data: enterpriseSettings, isLoading: settingsLoading } = trpc.user.getEnterpriseSettings.useQuery();
  const { data: accessLogs, isLoading: logsLoading } = trpc.user.getAccessLogs.useQuery({ limit: 50 }, { enabled: activeTab === "access" });
  const { data: products } = trpc.marketplace.getProducts.useQuery();

  // Mutations
  const updateSettingsMutation = trpc.user.updateEnterpriseSettings.useMutation();
  const generateApiKeyMutation = trpc.user.generateApiKey.useMutation();
  const revokeDeviceMutation = trpc.user.revokeDevice.useMutation();
  const purchaseNodesMutation = trpc.user.purchaseNodes.useMutation();

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Please log in to access your control panel.</p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  const handleUpdateSettings = async (key: string, value: any) => {
    try {
      await updateSettingsMutation.mutateAsync({ [key]: value });
      toast.success("Settings updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      const result = await generateApiKeyMutation.mutateAsync();
      toast.success("API key generated");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate API key");
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await revokeDeviceMutation.mutateAsync({ deviceId });
      toast.success("Device revoked");
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke device");
    }
  };

  const handlePurchaseNodes = async () => {
    if (!selectedParadoxId) {
      toast.error("Please select a solution");
      return;
    }

    try {
      const result = await purchaseNodesMutation.mutateAsync({
        paradoxId: selectedParadoxId,
        nodeCount: nodesToPurchase,
        paymentMethod: "eth",
      });

      toast.success(`Node purchase initiated. Vault address: ${result.vaultAddress}`);
      setShowNodePurchase(false);
      setNodesToPurchase(1);
      setSelectedParadoxId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase nodes");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Control Panel</h1>
            <p className="text-muted-foreground mt-1">Manage subscriptions, devices, and enterprise settings</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
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
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold mt-2">{subscriptions?.length || 0}</p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Nodes</p>
                <p className="text-2xl font-bold mt-2">{nodes?.filter((n: any) => n.status === "active").length || 0}</p>
              </div>
              <Cpu className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registered Devices</p>
                <p className="text-2xl font-bold mt-2">{devices?.length || 0}</p>
              </div>
              <Smartphone className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="text-lg font-semibold mt-2">{enterpriseSettings?.companyName || "Not set"}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border mb-6">
          {[
            { id: "subscriptions", label: "Subscriptions", icon: Eye },
            { id: "nodes", label: "Nodes & Devices", icon: Cpu },
            { id: "enterprise", label: "Enterprise Settings", icon: Settings },
            { id: "access", label: "Access Logs", icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Your Subscriptions</h2>
              <Button onClick={() => setShowNodePurchase(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Purchase Nodes
              </Button>
            </div>

            {showNodePurchase && (
              <Card className="p-6 bg-primary/5 border-primary">
                <h3 className="font-bold mb-4">Purchase Additional Nodes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Solution</label>
                    <select
                      value={selectedParadoxId}
                      onChange={(e) => setSelectedParadoxId(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-lg bg-background"
                    >
                      <option value="">Choose a solution...</option>
                      {products?.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Number of Nodes</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={nodesToPurchase}
                      onChange={(e) => setNodesToPurchase(parseInt(e.target.value))}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handlePurchaseNodes} disabled={purchaseNodesMutation.isPending}>
                      {purchaseNodesMutation.isPending ? "Processing..." : "Purchase Nodes"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowNodePurchase(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {subscriptions && subscriptions.length > 0 ? (
                subscriptions.map((sub: any) => (
                  <Card key={sub.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{sub.paradoxName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Access Level: <span className="capitalize">{sub.accessLevel}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Access Count: {sub.currentAccessCount} {sub.maxAccessCount && `/ ${sub.maxAccessCount}`}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          sub.status === "active"
                            ? "bg-green-500/20 text-green-700"
                            : "bg-gray-500/20 text-gray-700"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No subscriptions yet. Visit the marketplace to purchase.</p>
              )}
            </div>
          </div>
        )}

        {/* Nodes & Devices Tab */}
        {activeTab === "nodes" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-4">Your Nodes</h2>
              <div className="space-y-3">
                {nodes && nodes.length > 0 ? (
                  nodes.map((node: any) => (
                    <Card key={node.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-sm bg-muted px-2 py-1 rounded w-fit">{node.nodeKey}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Devices: {node.currentDeviceCount} / {node.maxDevices}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(node.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(node.nodeKey);
                              toast.success("Node key copied");
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              node.status === "active"
                                ? "bg-green-500/20 text-green-700"
                                : "bg-gray-500/20 text-gray-700"
                            }`}
                          >
                            {node.status}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No nodes yet. Purchase nodes to extend access.</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Registered Devices</h2>
              <div className="space-y-3">
                {devices && devices.length > 0 ? (
                  devices.map((device: any) => (
                    <Card key={device.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{device.deviceName}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Type: <span className="capitalize">{device.deviceType}</span>
                          </p>
                          {device.ipAddress && (
                            <p className="text-sm text-muted-foreground">IP: {device.ipAddress}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Last Accessed: {device.lastAccessedAt ? new Date(device.lastAccessedAt).toLocaleString() : "Never"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              device.status === "active"
                                ? "bg-green-500/20 text-green-700"
                                : "bg-gray-500/20 text-gray-700"
                            }`}
                          >
                            {device.status}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeDevice(device.id)}
                            disabled={revokeDeviceMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No devices registered yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Settings Tab */}
        {activeTab === "enterprise" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Enterprise Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={enterpriseSettings?.companyName || ""}
                    onChange={(e) => handleUpdateSettings("companyName", e.target.value)}
                    placeholder="Your company name"
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Max Devices Per Node</label>
                  <Input
                    type="number"
                    min="1"
                    value={enterpriseSettings?.maxDevicesPerNode || 1}
                    onChange={(e) => handleUpdateSettings("maxDevicesPerNode", parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Data Retention (days)</label>
                  <Input
                    type="number"
                    min="1"
                    value={enterpriseSettings?.dataRetentionDays || 90}
                    onChange={(e) => handleUpdateSettings("dataRetentionDays", parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Feature Toggles</h2>
              <div className="space-y-3">
                {[
                  { key: "enableDeviceSync", label: "Enable Device Sync" },
                  { key: "enableOfflineAccess", label: "Enable Offline Access" },
                  { key: "enableAuditLogging", label: "Enable Audit Logging" },
                  { key: "enableIPRestriction", label: "Enable IP Restriction" },
                  { key: "enableTwoFactor", label: "Enable Two-Factor Authentication" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 p-3 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enterpriseSettings?.[key as keyof typeof enterpriseSettings] || false}
                      onChange={(e) => handleUpdateSettings(key, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">API Access</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {enterpriseSettings?.apiKeyEnabled ? "API key is enabled" : "API key is disabled"}
                  </p>
                  <Button onClick={handleGenerateApiKey} disabled={generateApiKeyMutation.isPending}>
                    <Zap className="w-4 h-4 mr-2" />
                    {enterpriseSettings?.apiKeyEnabled ? "Regenerate" : "Generate"} API Key
                  </Button>
                </div>
                {enterpriseSettings && 'apiKey' in enterpriseSettings && enterpriseSettings.apiKey && (
                  <div>
                    <p className="text-sm font-mono bg-muted px-3 py-2 rounded break-all">
                      {(enterpriseSettings as any).apiKey}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText((enterpriseSettings as any).apiKey || "");
                        toast.success("API key copied");
                      }}
                      className="mt-2"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Access Logs Tab */}
        {activeTab === "access" && (
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Device Access Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Device</th>
                    <th className="text-left py-2 px-2">Access Type</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs && accessLogs.length > 0 ? (
                    accessLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted">
                        <td className="py-3 px-2">{log.deviceName}</td>
                        <td className="py-3 px-2 capitalize">{log.accessType}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.status === "success"
                                ? "bg-green-500/20 text-green-700"
                                : log.status === "denied"
                                  ? "bg-red-500/20 text-red-700"
                                  : "bg-yellow-500/20 text-yellow-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No access logs yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
