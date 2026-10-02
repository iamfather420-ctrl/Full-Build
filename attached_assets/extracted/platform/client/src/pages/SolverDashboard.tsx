import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import ProblemCard from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  STATUS_LABELS,
  PLATFORM_LABELS,
  CATEGORY_LABELS,
  timeAgo,
  truncate,
} from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Bot,
  DollarSign,
  Download,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { PROBLEM_CATEGORIES } from "../../../drizzle/schema";

const TABS = ["overview", "problems", "crawler", "earnings"] as const;
type Tab = (typeof TABS)[number];

export default function SolverDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [crawlerPlatforms, setCrawlerPlatforms] = useState<string[]>(["reddit", "stackoverflow"]);
  const [crawlerCategory, setCrawlerCategory] = useState<string | undefined>(undefined);
  const [crawlerLimit, setCrawlerLimit] = useState(10);
  const [crawlerPlatformFilter, setCrawlerPlatformFilter] = useState("all");

  const isOwner = user?.role === "admin";

  const { data: stats } = trpc.problems.stats.useQuery();
  const { data: earningStats } = trpc.earnings.stats.useQuery(undefined, { enabled: isOwner });
  const { data: earningsList } = trpc.earnings.list.useQuery(undefined, { enabled: isOwner && activeTab === "earnings" });
  const { data: openProblems } = trpc.problems.list.useQuery(
    { status: "open", limit: 20 },
    { enabled: isOwner && activeTab === "problems" }
  );
  const { data: crawledList, refetch: refetchCrawled } = trpc.crawler.list.useQuery(
    { platform: crawlerPlatformFilter, limit: 20 },
    { enabled: isOwner && activeTab === "crawler" }
  );

  const runCrawler = trpc.crawler.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Crawler found ${data.found} new problems!`);
      refetchCrawled();
    },
    onError: (err) => toast.error(err.message),
  });

  const importProblem = trpc.crawler.import.useMutation({
    onSuccess: () => {
      toast.success("Problem imported to marketplace!");
      refetchCrawled();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated || !isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 container text-center py-20">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Owner Access Only</h2>
          <p className="text-muted-foreground mb-6">The Solver Dashboard is exclusively for the platform owner.</p>
          <Link href="/"><Button variant="outline">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  // Mock earnings chart data
  const earningsChartData = earningsList
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayEarnings = earningsList
          .filter((e) => new Date(e.createdAt).toDateString() === d.toDateString())
          .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        return { day: d.toLocaleDateString("en-US", { weekday: "short" }), amount: dayEarnings };
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="container">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Solver HQ</span>
              </div>
              <h1 className="text-3xl font-bold">
                Welcome back, <span className="text-gold-gradient">{user?.name?.split(" ")[0]}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Active</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 bg-card rounded-xl border border-border w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Earned",
                    value: formatCurrency(earningStats?.total ?? 0),
                    icon: DollarSign,
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    label: "Pending Payout",
                    value: formatCurrency(earningStats?.pending ?? 0),
                    icon: Clock,
                    color: "text-amber-400",
                    bg: "bg-amber-400/10",
                  },
                  {
                    label: "Problems Solved",
                    value: earningStats?.count ?? 0,
                    icon: CheckCircle,
                    color: "text-emerald-400",
                    bg: "bg-emerald-400/10",
                  },
                  {
                    label: "Open Problems",
                    value: stats?.open ?? 0,
                    icon: Globe,
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                  },
                ].map((stat, i) => (
                  <div key={i} className="p-5 rounded-xl border border-border bg-card">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("problems")}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left group"
                >
                  <Globe className="w-6 h-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Browse Open Problems</h3>
                  <p className="text-sm text-muted-foreground">{stats?.open ?? 0} problems waiting for solutions</p>
                </button>
                <button
                  onClick={() => setActiveTab("crawler")}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left group"
                >
                  <Bot className="w-6 h-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Run AI Crawler</h3>
                  <p className="text-sm text-muted-foreground">Scan Reddit, SO, Quora for new problems</p>
                </button>
                <button
                  onClick={() => setActiveTab("earnings")}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left group"
                >
                  <TrendingUp className="w-6 h-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">View Earnings</h3>
                  <p className="text-sm text-muted-foreground">Track your income and payment history</p>
                </button>
              </div>
            </div>
          )}

          {/* Problems Tab */}
          {activeTab === "problems" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Open Problems</h2>
                <span className="text-sm text-muted-foreground">{openProblems?.length ?? 0} available</span>
              </div>
              {openProblems && openProblems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {openProblems.map((problem) => (
                    <ProblemCard key={problem.id} problem={problem} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p>No open problems right now. Run the crawler to find more!</p>
                </div>
              )}
            </div>
          )}

          {/* Crawler Tab */}
          {activeTab === "crawler" && (
            <div className="space-y-6">
              {/* Crawler Controls */}
              <div className="p-6 rounded-xl border border-primary/20 bg-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">AI Web Crawler</h2>
                    <p className="text-xs text-muted-foreground">Scan platforms for unsolved problems</p>
                  </div>
                </div>

                {/* Platform Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {["reddit", "stackoverflow", "quora", "hackernews"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setCrawlerPlatforms((prev) =>
                            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          crawlerPlatforms.includes(p)
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-background text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {PLATFORM_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">Category Focus (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCrawlerCategory(undefined)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        !crawlerCategory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Categories
                    </button>
                    {PROBLEM_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCrawlerCategory(cat)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          crawlerCategory === cat
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limit */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Problems to find: <span className="text-primary">{crawlerLimit}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    value={crawlerLimit}
                    onChange={(e) => setCrawlerLimit(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <Button
                  onClick={() =>
                    runCrawler.mutate({
                      platforms: crawlerPlatforms as any,
                      category: crawlerCategory as any,
                      limit: crawlerLimit,
                    })
                  }
                  disabled={runCrawler.isPending || crawlerPlatforms.length === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                >
                  {runCrawler.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Crawling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run AI Crawler
                    </>
                  )}
                </Button>
              </div>

              {/* Crawled Results */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Crawled Problems</h3>
                  <div className="flex gap-2">
                    {["all", "reddit", "stackoverflow", "quora", "hackernews"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setCrawlerPlatformFilter(p)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          crawlerPlatformFilter === p
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p === "all" ? "All" : PLATFORM_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {crawledList && crawledList.length > 0 ? (
                  <div className="space-y-3">
                    {crawledList.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-orange-400">
                                {PLATFORM_LABELS[item.platform]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[item.suggestedCategory]}
                              </span>
                              {item.upvotes && item.upvotes > 0 && (
                                <span className="text-xs text-muted-foreground">{item.upvotes} upvotes</span>
                              )}
                            </div>
                            <h4 className="font-medium text-foreground mb-1 line-clamp-1">{item.title}</h4>
                            {item.aiSummary && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{item.aiSummary}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-primary font-medium">
                                Suggested: {formatCurrency(item.suggestedPayment ?? "25")}
                              </span>
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Source
                              </a>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={item.isImported || importProblem.isPending}
                            onClick={() =>
                              importProblem.mutate({
                                crawledId: item.id,
                                paymentOffer: parseFloat(item.suggestedPayment ?? "25"),
                              })
                            }
                            className={`shrink-0 ${
                              item.isImported
                                ? "border-primary/30 text-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {item.isImported ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                Imported
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 mr-1" />
                                Import
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                    <Bot className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No crawled problems yet. Run the crawler above to find problems.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === "earnings" && (
            <div className="space-y-6">
              {/* Earnings Summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Earned", value: formatCurrency(earningStats?.total ?? 0), color: "text-primary" },
                  { label: "Pending", value: formatCurrency(earningStats?.pending ?? 0), color: "text-amber-400" },
                  { label: "Paid Out", value: formatCurrency(earningStats?.paid ?? 0), color: "text-emerald-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-5 rounded-xl border border-border bg-card text-center">
                    <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Earnings Chart */}
              {earningsChartData.length > 0 && (
                <div className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="font-semibold mb-4">Earnings (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={earningsChartData}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.78 0.14 75)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.78 0.14 75)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                      <XAxis dataKey="day" tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "oklch(0.55 0.01 260)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.12 0.008 260)", border: "1px solid oklch(0.22 0.01 260)", borderRadius: "8px" }}
                        labelStyle={{ color: "oklch(0.95 0.005 260)" }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, "Earned"]}
                      />
                      <Area type="monotone" dataKey="amount" stroke="oklch(0.78 0.14 75)" strokeWidth={2} fill="url(#goldGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Earnings List */}
              <div>
                <h3 className="font-semibold mb-4">Payment History</h3>
                {earningsList && earningsList.length > 0 ? (
                  <div className="space-y-3">
                    {earningsList.map((earning) => (
                      <div key={earning.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                        <div>
                          <p className="text-sm font-medium text-foreground">Problem #{earning.problemId}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(earning.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${earning.status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                            {formatCurrency(earning.amount, earning.currency)}
                          </p>
                          <p className={`text-xs capitalize ${earning.status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                            {earning.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No earnings yet. Start solving problems to earn!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
