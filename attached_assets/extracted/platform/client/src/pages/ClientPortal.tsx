import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import ProblemCard from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatCurrency, STATUS_LABELS, timeAgo } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import {
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  DollarSign,
  Lock,
  Plus,
  Shield,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const TABS = ["problems", "notifications"] as const;
type Tab = (typeof TABS)[number];

import { useState } from "react";

const NOTIFICATION_ICONS: Record<string, any> = {
  new_problem: Zap,
  solution_submitted: Shield,
  solution_verified: CheckCircle,
  payment_released: DollarSign,
  payment_refunded: DollarSign,
  problem_closed: BellOff,
  crawler_found: Zap,
};

export default function ClientPortal() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("problems");

  const { data: myProblems, isLoading: problemsLoading } = trpc.problems.myProblems.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: notifications, refetch: refetchNotifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read.");
      refetchNotifications();
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 container max-w-lg text-center py-20">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Sign in to view your problems and notifications.</p>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                My <span className="text-gold-gradient">Portal</span>
              </h1>
              <p className="text-muted-foreground text-sm">Track your problems and stay updated on solutions.</p>
            </div>
            <Link href="/post-problem">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Post Problem
              </Button>
            </Link>
          </div>

          {/* Stats */}
          {myProblems && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Posted", value: myProblems.length, color: "text-foreground" },
                {
                  label: "Open",
                  value: myProblems.filter((p) => p.status === "open").length,
                  color: "text-emerald-400",
                },
                {
                  label: "In Progress",
                  value: myProblems.filter((p) =>
                    ["in_review", "solution_submitted", "verifying"].includes(p.status)
                  ).length,
                  color: "text-amber-400",
                },
                {
                  label: "Solved",
                  value: myProblems.filter((p) => p.status === "solved").length,
                  color: "text-primary",
                },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-card text-center">
                  <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-card rounded-xl border border-border w-fit">
            <button
              onClick={() => setActiveTab("problems")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "problems"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Problems
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === "notifications"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Notifications
              {unreadCount > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Problems Tab */}
          {activeTab === "problems" && (
            <div>
              {problemsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : myProblems && myProblems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {myProblems.map((problem) => (
                    <ProblemCard key={problem.id} problem={problem} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold mb-2">No problems posted yet</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Post your first problem and get an expert solution.
                  </p>
                  <Link href="/post-problem">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Post a Problem
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">({unreadCount} unread)</span>
                  )}
                </h2>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    className="border-border text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>

              {notifications && notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((notif) => {
                    const Icon = NOTIFICATION_ICONS[notif.type] ?? Bell;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => !notif.isRead && markRead.mutate({ id: notif.id })}
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                          notif.isRead
                            ? "border-border bg-card opacity-60"
                            : "border-primary/20 bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          notif.isRead ? "bg-muted" : "bg-primary/10"
                        }`}>
                          <Icon className={`w-4 h-4 ${notif.isRead ? "text-muted-foreground" : "text-primary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium ${notif.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                        </div>
                        {notif.problemId && (
                          <Link
                            href={`/problems/${notif.problemId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:text-primary/80 shrink-0"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <p className="text-muted-foreground">No notifications yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
