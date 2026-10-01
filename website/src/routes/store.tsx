import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/nav";
import { StateChip } from "@/components/ui/badge";
import { categories, products, type Product } from "@/lib/catalog";
import { formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/store")({ component: Store });

function Store() {
  const [cat, setCat] = useState<(typeof categories)[number]["id"]>("all");
  const list =
    cat === "all" ? products : products.filter((p) => p.category === cat);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-2xs uppercase tracking-mark text-muted">
          uarefake.com · verified marketplace
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Solutions that survived the gate.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Unverified products cannot enter the verified marketplace state.
          Entitlement is not execution authority. PayPal remains fail-closed
          until the external provider is actually connected.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={
                cat === c.id
                  ? "rounded-md bg-fg px-3 py-2 text-xs uppercase tracking-kicker text-bg"
                  : "rounded-md px-3 py-2 text-xs uppercase tracking-kicker text-muted hairline"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/store/$sku"
      params={{ sku: product.sku }}
      className="flex flex-col rounded-xl bg-surface p-5 hairline hairline-hover transition-[box-shadow] duration-150"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-2xs uppercase tracking-kicker text-muted">
          {product.solutionId}
        </span>
        <StateChip state={product.evidence} />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
        {product.title}
      </h2>
      <p className="mt-2 flex-1 text-sm text-muted">{product.short}</p>
      <div className="mt-5 flex items-end justify-between">
        <p className="font-mono text-sm tabular-nums">
          {product.priceCents === 0 ? "Not for sale" : formatUsd(product.priceCents)}
          {product.cadence === "seat" && product.priceCents > 0 ? " / seat" : ""}
        </p>
        <span className="font-mono text-2xs uppercase tracking-kicker text-muted">
          {product.category}
        </span>
      </div>
    </Link>
  );
}
