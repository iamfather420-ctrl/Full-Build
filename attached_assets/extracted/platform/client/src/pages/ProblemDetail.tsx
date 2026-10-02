import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CATEGORY_LABELS,
  formatCurrency,
  formatDate,
  PLATFORM_LABELS,
  STATUS_LABELS,
  timeAgo,
} from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  Lock,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import EscrowPayment from "@/components/EscrowPayment";
import OffersNegotiation from "@/components/OffersNegotiation";

export default function ProblemDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const { user, isAuthenticated } = useAuth();
  const isOwner = user?.role === "admin";

  const { data, isLoading, refetch } = trpc.problems.get.useQuery({ id }, { enabled: !!id });

  const [solutionText, setSolutionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitSolution = trpc.solutions.submit.useMutation({
    onSuccess: () => {
      toast.success("Solution submitted successfully!");
      setSolutionText("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const verifySolution = trpc.verification.verify.useMutation({
    onSuccess: (result) => {
      if (result.approved) {
        toast.success(`Solution approved! Score: ${result.score}/100. Payment released.`);
      } else {
        toast.error(`Solution rejected. Score: ${result.score}/100. ${result.notes}`);
      }
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-card rounded w-1/3" />
            <div className="h-64 bg-card rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 container text-center">
          <h2 className="text-2xl font-bold mb-4">Problem Not Found</h2>
          <Link href="/marketplace">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { problem, solutions, escrow } = data;
  const pendingSolution = solutions.find((s) => s.status === "pending" || s.status === "verifying");
  const approvedSolution = solutions.find((s) => s.status === "approved");

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="container max-w-5xl">
          {/* Back */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Problem Header */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border status-${problem.status}`}>
                    {STATUS_LABELS[problem.status] ?? problem.status}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {CATEGORY_LABELS[problem.category] ?? problem.category}
                  </span>
                  {problem.source !== "direct" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {PLATFORM_LABELS[problem.source] ?? problem.source}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-4">{problem.title}</h1>

                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {problem.description}
                </div>

                {problem.sourceUrl && (
                  <a
                    href={problem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Original Source
                  </a>
                )}

                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Posted {timeAgo(problem.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {problem.viewCount} views
                  </span>
                  {problem.deadline && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Calendar className="w-3 h-3" />
                      Due {formatDate(problem.deadline)}
                    </span>
                  )}
                </div>
              </div>

              {/* Solutions History */}
              {solutions.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Solution History ({solutions.length})
                  </h2>
                  <div className="space-y-4">
                    {solutions.map((sol) => (
                      <div
                        key={sol.id}
                        className={`p-4 rounded-lg border ${
                          sol.status === "approved"
                            ? "border-primary/30 bg-primary/5"
                            : sol.status === "rejected"
                            ? "border-destructive/30 bg-destructive/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {sol.status === "approved" ? (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            ) : sol.status === "rejected" ? (
                              <XCircle className="w-4 h-4 text-destructive" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={`text-xs font-medium capitalize status-${sol.status}`}>
                              {sol.status}
                            </span>
                          </div>
                          {sol.verificationScore && (
                            <span className="text-xs font-bold text-primary">
                              Score: {sol.verificationScore}/100
                            </span>
                          )}
                        </div>

                        {/* Show solution content to owner or if approved */}
                        {(isOwner || sol.status === "approved") && (
                          <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{sol.content}</p>
                        )}
                        {!isOwner && sol.status !== "approved" && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lock className="w-3.5 h-3.5" />
                            Solution content is hidden until verified
                          </div>
                        )}

                        {sol.verificationNotes && (
                          <div className="mt-3 p-3 rounded-md bg-background/50 border border-border">
                            <p className="text-xs text-muted-foreground font-medium mb-1">AI Verification Notes:</p>
                            <p className="text-xs text-foreground">{sol.verificationNotes}</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">{timeAgo(sol.createdAt)}</p>

                        {/* Verify button for owner */}
                        {isOwner && sol.status === "pending" && (
                          <Button
                            size="sm"
                            className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => verifySolution.mutate({ solutionId: sol.id })}
                            disabled={verifySolution.isPending}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1.5" />
                            {verifySolution.isPending ? "Verifying..." : "Run AI Verification"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Solution (Owner Only) */}
              {isOwner && problem.status === "open" && (
                <div className="rounded-xl border border-primary/20 bg-card p-6">
                  <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Submit Your Solution
                  </h2>
                  <Textarea
                    placeholder="Write your comprehensive solution here. Be thorough, accurate, and actionable..."
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    className="min-h-[200px] bg-background border-border focus:border-primary/50 mb-4 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Solution will be AI-verified before payment is released.
                    </p>
                    <Button
                      onClick={() => submitSolution.mutate({ problemId: problem.id, content: solutionText })}
                      disabled={solutionText.length < 20 || submitSolution.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {submitSolution.isPending ? "Submitting..." : "Submit Solution"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Payment Card */}
              <div className="rounded-xl border border-primary/20 bg-card p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Payment Offer
                </h3>
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatCurrency(problem.paymentOffer, problem.currency)}
                </div>
                <p className="text-xs text-muted-foreground mb-4">Held in secure escrow</p>

                {/* Escrow Status */}
                {escrow ? (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium status-${escrow.status}`}>
                    <Lock className="w-3.5 h-3.5" />
                    Escrow: {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </div>
                ) : isAuthenticated && problem.clientId === user?.id && problem.status === "open" ? (
                  <div className="mt-4">
                    <EscrowPayment
                      problemId={problem.id}
                      amount={parseFloat(problem.paymentOffer)}
                      problemTitle={problem.title}
                      onSuccess={() => refetch()}
                    />
                  </div>
                ) : null}

                {/* Payment flow explanation */}
                <div className="mt-4 space-y-2">
                  {[
                    { icon: Lock, text: "Funds held in escrow", done: !!escrow },
                    { icon: Shield, text: "AI verifies solution", done: approvedSolution !== undefined },
                    { icon: CheckCircle, text: "Payment released to solver", done: problem.status === "solved" },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${step.done ? "text-primary" : "text-muted-foreground"}`}>
                      <step.icon className="w-3.5 h-3.5 shrink-0" />
                      {step.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Offers & Negotiation */}
              {problem.status === "open" && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <OffersNegotiation
                    problemId={problem.id}
                    clientId={problem.clientId ?? 0}
                    originalPaymentOffer={parseFloat(problem.paymentOffer)}
                    onOfferAccepted={() => refetch()}
                  />
                </div>
              )}

              {/* Problem Meta */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-foreground font-medium">{CATEGORY_LABELS[problem.category]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span className="text-foreground font-medium">{PLATFORM_LABELS[problem.source] ?? problem.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span className="text-foreground font-medium">{formatDate(problem.createdAt)}</span>
                  </div>
                  {problem.deadline && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="text-amber-400 font-medium">{formatDate(problem.deadline)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views</span>
                    <span className="text-foreground font-medium">{problem.viewCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solutions</span>
                    <span className="text-foreground font-medium">{solutions.length}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {problem.tags && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(problem.tags).map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
