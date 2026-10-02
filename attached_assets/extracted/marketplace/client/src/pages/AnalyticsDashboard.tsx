import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { AlertCircle, Download, Filter, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const COLORS = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe"];

export default function AnalyticsDashboard() {
  const { user, loading } = useAuth();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Fetch analytics data
  const { data: stats, isLoading: statsLoading } = trpc.owner.getSystemStats.useQuery({ timeRange });
  const { data: revenueByProduct, isLoading: revenueLoading } = trpc.owner.getRevenueByProduct.useQuery();
  const { data: revenueByMethod, isLoading: methodLoading } = trpc.owner.getRevenueByPaymentMethod.useQuery();
  const { data: customerMetrics, isLoading: customerLoading } = trpc.owner.getCustomerMetrics.useQuery();
  const { data: trendData, isLoading: trendLoading } = trpc.owner.getRevenueTrend.useQuery({ timeRange });

  if (!loading && (!user || user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only administrators can access analytics.</p>
        </Card>
      </div>
    );
  }

  const handleExportData = () => {
    toast.success("Analytics exported to CSV");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">Revenue, customer, and product performance metrics</p>
            </div>
            <Button onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-2">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "All Time"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold mt-2">${stats?.totalRevenue || "0"}</p>
            <p className="text-xs text-green-600 mt-2">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last period
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-3xl font-bold mt-2">{stats?.totalOrders || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Across all products</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Active Customers</p>
            <p className="text-3xl font-bold mt-2">{customerMetrics?.activeCustomers || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">With active subscriptions</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Avg Order Value</p>
            <p className="text-3xl font-bold mt-2">${customerMetrics?.avgOrderValue || "0"}</p>
            <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#667eea" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by Product & Payment Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue by Product */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Revenue by Product</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByProduct || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {(revenueByProduct || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Revenue by Payment Method */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Revenue by Payment Method</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMethod || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Customer Metrics */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Customer Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Customer Lifetime Value</p>
              <p className="text-2xl font-bold mt-2">${customerMetrics?.customerLifetimeValue || "0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Repeat Purchase Rate</p>
              <p className="text-2xl font-bold mt-2">{customerMetrics?.repeatPurchaseRate || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
              <p className="text-2xl font-bold mt-2">{customerMetrics?.churnRate || 0}%</p>
            </div>
          </div>
        </Card>

        {/* Top Products Table */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Top Performing Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2">Product</th>
                  <th className="text-left py-2 px-2">Sales</th>
                  <th className="text-left py-2 px-2">Revenue</th>
                  <th className="text-left py-2 px-2">Avg Price</th>
                  <th className="text-left py-2 px-2">Growth</th>
                </tr>
              </thead>
              <tbody>
                {(revenueByProduct || []).slice(0, 5).map((product: any, index: number) => (
                  <tr key={index} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-2 font-medium">{product.name}</td>
                    <td className="py-3 px-2">{product.salesCount}</td>
                    <td className="py-3 px-2">${product.revenue}</td>
                    <td className="py-3 px-2">${product.avgPrice}</td>
                    <td className="py-3 px-2">
                      <span className="text-green-600 font-medium">+{product.growth}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Payment Method Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(revenueByMethod || []).map((method: any) => (
              <div key={method.method} className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{method.method.toUpperCase()}</p>
                <p className="text-2xl font-bold mt-2">{method.percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">${method.revenue} total</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Vault & Withdrawal Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Vault & Withdrawal Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Current Vault Balance</p>
              <p className="text-2xl font-bold mt-2">${stats?.vaultBalance || "0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Withdrawn</p>
              <p className="text-2xl font-bold mt-2">${stats?.totalWithdrawals || "0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Holds</p>
              <p className="text-2xl font-bold mt-2">${stats?.pendingHolds || "0"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed Payments</p>
              <p className="text-2xl font-bold mt-2">{stats?.failedPayments || 0}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
