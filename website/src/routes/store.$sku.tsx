import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { StateChip } from "@/components/ui/badge";
import { productBySku } from "@/lib/catalog";
import { useAppStore } from "@/lib/store";
import { formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/store/$sku")({
  component: ProductPage,
});

function ProductPage() {
  const { sku } = Route.useParams();
  const product = productBySku(sku);
  const addToCart = useAppStore((s) => s.addToCart);
  if (!product) throw notFound();

  function buy() {
    const res = addToCart(product!.sku);
    if (!res.ok) toast.error(res.error);
    else toast.success("Added to verified cart.");
  }

  const blocked = product.evidence !== "VERIFIED";

  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-kicker text-muted hover:text-fg"
          >
            <ArrowLeft className="size-3.5" /> Catalog
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-3xs text-muted">{product.solutionId}</span>
            <StateChip state={product.evidence} />
            <span className="font-mono text-2xs uppercase tracking-kicker text-muted">
              {product.proofBundle}
            </span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            {product.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            {product.blurb}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3">
            {product.specs.map((s) => (
              <div key={s.label} className="rounded-lg bg-surface p-3 hairline">
                <dt className="font-mono text-2xs uppercase tracking-kicker text-muted">
                  {s.label}
                </dt>
                <dd className="mt-1 text-sm">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="h-fit rounded-xl bg-surface p-6 hairline">
          <p className="font-mono text-2xs uppercase tracking-mark text-muted">
            Defensible price v1.4
          </p>
          <p className="mt-3 font-display text-4xl font-bold tracking-tight tabular-nums">
            {product.priceCents === 0 ? "—" : formatUsd(product.priceCents)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {product.cadence === "seat" ? "Per execution seat" : "One-time entitlement"}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 text-ok" />
              Reversibility: {product.reversible ? "Guaranteed" : "Not established"}
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 text-ok" />
              SLA: {product.sla}
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 text-ok" />
              Capability does not authorize deployment
            </li>
          </ul>
          <Button
            className="mt-6 w-full"
            onClick={buy}
            disabled={blocked}
            variant={blocked ? "outline" : "primary"}
          >
            {blocked ? "Publication blocked" : "Add entitlement"}
          </Button>
          {blocked ? (
            <p className="mt-3 text-xs text-stamp">
              Fail-closed: {product.evidence} listings cannot occupy the verified
              marketplace.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">
              Purchase creates entitlement only. JIT execution still requires
              authorization on uarefake.space.
            </p>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
