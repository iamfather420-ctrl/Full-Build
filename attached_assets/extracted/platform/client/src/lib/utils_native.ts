import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  legal: "Legal",
  business: "Business",
  medical: "Medical",
  financial: "Financial",
  academic: "Academic",
  creative: "Creative",
  general: "General",
  science: "Science",
  engineering: "Engineering",
  other: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  solution_submitted: "Solution Submitted",
  verifying: "Verifying",
  solved: "Solved",
  closed: "Closed",
  refunded: "Refunded",
};

export const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  quora: "Quora",
  stackoverflow: "Stack Overflow",
  hackernews: "Hacker News",
  direct: "Direct Post",
  other: "Other",
};

export const PLATFORM_COLORS: Record<string, string> = {
  reddit: "text-orange-400",
  quora: "text-red-400",
  stackoverflow: "text-amber-400",
  hackernews: "text-orange-300",
  direct: "text-primary",
  other: "text-muted-foreground",
};

export function formatCurrency(amount: string | number, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
