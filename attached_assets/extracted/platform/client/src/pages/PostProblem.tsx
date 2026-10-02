import { useAuth } from "@/_core/hooks/useAuth";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS } from "@/lib/utils";
import { AlertCircle, CheckCircle, DollarSign, Lock, Shield, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PROBLEM_CATEGORIES } from "../../../drizzle/schema";

export default function PostProblem() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general" as string,
    paymentOffer: "",
    deadline: "",
    tags: "",
  });

  const createProblem = trpc.problems.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Problem posted successfully! Our team will review it shortly.");
      const id = (data as any)?.insertId;
      if (id) navigate(`/problems/${id}`);
      else navigate("/portal");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.paymentOffer) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createProblem.mutate({
      title: form.title,
      description: form.description,
      category: form.category as any,
      paymentOffer: parseFloat(form.paymentOffer),
      deadline: form.deadline || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="pt-24 container max-w-lg text-center py-20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to sign in to post a problem. Your payment will be held in secure escrow until the solution is
            verified.
          </p>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="container max-w-3xl">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3">
              Post a <span className="text-gold-gradient">Problem</span>
            </h1>
            <p className="text-muted-foreground">
              Describe your problem clearly and set a payment offer. Funds are held in escrow until our expert provides
              a verified solution.
            </p>
          </div>

          {/* How it works reminder */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: Zap, text: "Post your problem with a payment offer" },
              { icon: Shield, text: "Expert submits solution, AI verifies it" },
              { icon: CheckCircle, text: "Payment released only after verification" },
            ].map((step, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card text-center">
                <step.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground font-medium">
                Problem Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. How do I file a trademark for my startup in the US?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-card border-border focus:border-primary/50 h-11"
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">{form.title.length}/512 characters</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground font-medium">
                Detailed Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Provide as much context as possible. Include what you've already tried, specific constraints, and what a successful solution looks like..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-card border-border focus:border-primary/50 min-h-[160px] resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Category</Label>
              <div className="flex flex-wrap gap-2">
                {PROBLEM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      form.category === cat
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Offer */}
            <div className="space-y-2">
              <Label htmlFor="payment" className="text-foreground font-medium">
                Payment Offer (USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="payment"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="50"
                  value={form.paymentOffer}
                  onChange={(e) => setForm({ ...form, paymentOffer: e.target.value })}
                  className="pl-10 bg-card border-border focus:border-primary/50 h-11"
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  This amount will be held in secure escrow and only released when the solution passes AI verification.
                </p>
              </div>
            </div>

            {/* Deadline (optional) */}
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-foreground font-medium">
                Deadline <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="bg-card border-border focus:border-primary/50 h-11"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Tags (optional) */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-foreground font-medium">
                Tags <span className="text-muted-foreground font-normal">(optional, comma-separated)</span>
              </Label>
              <Input
                id="tags"
                placeholder="e.g. startup, trademark, intellectual property"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="bg-card border-border focus:border-primary/50 h-11"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                Payment will be processed via Stripe
              </div>
              <Button
                type="submit"
                disabled={createProblem.isPending || !form.title || !form.description || !form.paymentOffer}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow px-8 h-11"
              >
                {createProblem.isPending ? "Posting..." : "Post Problem"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
