import NavBar from "@/components/NavBar";
import ProblemCard from "@/components/ProblemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABELS } from "@/lib/utils";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { PROBLEM_CATEGORIES } from "../../../drizzle/schema";

const STATUS_OPTIONS = [
  { value: undefined, label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "solved", label: "Solved" },
];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const { data: problems, isLoading } = trpc.problems.list.useQuery({
    search: search || undefined,
    category: category as any,
    status: status as any,
    limit: LIMIT,
    offset,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setOffset(0);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategory(undefined);
    setStatus(undefined);
    setOffset(0);
  };

  const hasFilters = search || category || status;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="container">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3">
              Problem <span className="text-gold-gradient">Marketplace</span>
            </h1>
            <p className="text-muted-foreground">
              Browse unsolved problems from across the internet. Find one you can solve and earn.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-card border-border focus:border-primary/50 h-11"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6"
              >
                Search
              </Button>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-border hover:border-destructive/50 hover:text-destructive h-11"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCategory(undefined); setOffset(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  !category
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                All Categories
              </button>
              {PROBLEM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setOffset(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    category === cat
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Status filters */}
            <div className="flex gap-2 items-center">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => { setStatus(opt.value); setOffset(0); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    status === opt.value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : problems && problems.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {problems.length} problem{problems.length !== 1 ? "s" : ""}
                  {hasFilters ? " matching your filters" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {problems.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 mt-10">
                {offset > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    className="border-border"
                  >
                    Previous
                  </Button>
                )}
                {problems.length === LIMIT && (
                  <Button
                    variant="outline"
                    onClick={() => setOffset(offset + LIMIT)}
                    className="border-border"
                  >
                    Next
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No problems found</h3>
              <p className="text-muted-foreground mb-6">
                {hasFilters
                  ? "Try adjusting your filters or search terms."
                  : "No problems have been posted yet. Be the first!"}
              </p>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
