import { formatCurrency, STATUS_LABELS, CATEGORY_LABELS, PLATFORM_LABELS, timeAgo, truncate } from "@/lib/utils";
import { Clock, DollarSign, Eye, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "./ui/badge";

interface ProblemCardProps {
  problem: {
    id: number;
    title: string;
    description: string;
    category: string;
    status: string;
    source: string;
    paymentOffer: string;
    currency: string;
    deadline?: Date | null;
    viewCount: number;
    createdAt: Date;
    sourceUrl?: string | null;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  legal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  business: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  medical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  financial: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  academic: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  creative: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  general: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  science: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  engineering: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function ProblemCard({ problem }: ProblemCardProps) {
  const categoryColor = CATEGORY_COLORS[problem.category] ?? CATEGORY_COLORS.other;
  const isHighValue = parseFloat(problem.paymentOffer) >= 100;

  return (
    <Link href={`/problems/${problem.id}`}>
      <div
        className={`group relative rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-200 cursor-pointer overflow-hidden ${
          isHighValue ? "ring-1 ring-primary/20" : ""
        }`}
      >
        {/* Top accent line for high-value problems */}
        {isHighValue && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
        )}

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor}`}>
                {CATEGORY_LABELS[problem.category] ?? problem.category}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full status-${problem.status}`}>
                {STATUS_LABELS[problem.status] ?? problem.status}
              </span>
              {problem.source !== "direct" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {PLATFORM_LABELS[problem.source] ?? problem.source}
                </span>
              )}
            </div>

            {/* Payment offer */}
            <div className={`flex items-center gap-1 shrink-0 ${isHighValue ? "text-primary" : "text-foreground"}`}>
              <DollarSign className="w-4 h-4" />
              <span className={`font-bold text-lg ${isHighValue ? "text-gold-gradient" : ""}`}>
                {formatCurrency(problem.paymentOffer, problem.currency)}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {problem.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {truncate(problem.description, 160)}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(problem.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {problem.viewCount}
              </span>
            </div>
            {problem.deadline && (
              <span className="text-amber-400 font-medium">
                Due {new Date(problem.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
