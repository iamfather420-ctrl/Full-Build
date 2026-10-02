import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  CheckCircle,
  DollarSign,
  Globe,
  Lock,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import NavBar from "@/components/NavBar";
import ProblemCard from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Bot,
    title: "AI-Powered Crawler",
    description:
      "Our AI continuously scans Reddit, Quora, Stack Overflow, and Hacker News to surface unsolved problems across every domain.",
  },
  {
    icon: Lock,
    title: "Secure Escrow",
    description:
      "Clients deposit payment upfront into secure escrow. Funds are held safely until the solution is verified and approved.",
  },
  {
    icon: Shield,
    title: "AI Verification",
    description:
      "Every solution is evaluated by our AI verification engine before payment is released, ensuring quality and accuracy.",
  },
  {
    icon: Globe,
    title: "All Categories",
    description:
      "From technical debugging to legal questions, medical advice to business strategy — every problem category is covered.",
  },
  {
    icon: TrendingUp,
    title: "Earnings Tracking",
    description:
      "Real-time dashboard showing your solved problems, pending payments, and total earnings with detailed analytics.",
  },
  {
    icon: Sparkles,
    title: "Smart Matching",
    description:
      "AI categorizes and prioritizes problems, surfacing the highest-value opportunities that match your expertise.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Problem Discovered",
    description: "AI crawls the web or clients post directly with a payment offer locked in escrow.",
  },
  {
    step: "02",
    title: "Expert Reviews",
    description: "The solver reviews the problem, crafts a comprehensive solution, and submits it.",
  },
  {
    step: "03",
    title: "AI Verifies",
    description: "Our AI verification engine scores the solution for accuracy, completeness, and relevance.",
  },
  {
    step: "04",
    title: "Payment Released",
    description: "On approval, escrow funds are automatically released to the solver. Everyone wins.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: stats } = trpc.problems.stats.useQuery();
  const { data: recentProblems } = trpc.problems.list.useQuery({
    status: "open",
    limit: 6,
  });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.95 0.005 260) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0.005 260) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Problem Brokerage
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-foreground">Turn Problems Into</span>
              <br />
              <span className="text-gold-gradient" style={{ fontFamily: "'Playfair Display', serif" }}>
                Profitable Solutions
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              SolveX is the AI-powered platform that finds unsolved problems across the internet, connects them with
              expert solvers, and handles payment escrow — just like a talent agent for problem-solvers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/marketplace">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow px-8 h-12 text-base font-semibold"
                >
                  Browse Problems
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/post-problem">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:border-primary/50 hover:bg-accent px-8 h-12 text-base"
                >
                  Post a Problem
                </Button>
              </Link>
            </div>

            {/* Stats */}
            {stats && (
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                {[
                  { label: "Total Problems", value: stats.total.toLocaleString() },
                  { label: "Open Problems", value: stats.open.toLocaleString() },
                  { label: "Problems Solved", value: stats.solved.toLocaleString() },
                  { label: "In Progress", value: stats.inReview.toLocaleString() },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How <span className="text-gold-gradient">SolveX</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A transparent, AI-verified workflow that protects both clients and solvers at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="text-primary font-bold text-lg">{step.step}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-gold-gradient">Earn from Expertise</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Open Problems */}
      {recentProblems && recentProblems.length > 0 && (
        <section className="py-20 border-t border-border/50">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  Latest <span className="text-gold-gradient">Open Problems</span>
                </h2>
                <p className="text-muted-foreground">Problems waiting for expert solutions right now.</p>
              </div>
              <Link href="/marketplace">
                <Button variant="outline" className="border-border hover:border-primary/50">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentProblems.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-card p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/10 rounded-full blur-[80px]" />
            <div className="relative">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Solving?
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join SolveX today and turn your expertise into income. Problems are waiting — your solutions are worth
                real money.
              </p>
              {!isAuthenticated ? (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow px-10 h-12 text-base font-semibold"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Link href="/marketplace">
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow px-10 h-12 text-base font-semibold"
                  >
                    Browse Problems
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">SolveX</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered problem brokerage. Connecting expertise with opportunity.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/marketplace" className="hover:text-foreground transition-colors">Marketplace</Link>
            <Link href="/post-problem" className="hover:text-foreground transition-colors">Post Problem</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
