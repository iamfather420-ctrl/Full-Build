import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { StateChip } from "@/components/ui/badge";
import { productBySku } from "@/lib/catalog";
import { useAppStore } from "@/lib/store";
import { formatUsd, shortHash } from "@/lib/utils";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const cart = useAppStore((s) => s.cart);
  const orders = useAppStore((s) => s.orders);
  const setQty = useAppStore((s) => s.setQty);
  const checkout = useAppStore((s) => s.checkout);
  const attemptPay = useAppStore((s) => s.attemptPay);
  const reverseOrder = useAppStore((s) => s.reverseOrder);

  const lines = cart
    .map((l) => {
      const p = productBySku(l.sku);
      return p ? { ...l, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const total = lines.reduce((n, l) => n + l.product.priceCents * l.qty, 0);

  function place() {
    const res = checkout();
    if (!res.ok) toast.error(res.error);
    else toast.success(`Order ${res.order.id} created. Payment not claimed.`);
  }

  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_1fr]">
        <section>
          <p className="font-mono text-2xs uppercase tracking-mark text-muted">
            Entitlement cart
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
            Proof before payment.
          </h1>
          {lines.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              Cart is empty.{" "}
              <Link to="/store" className="text-fg underline-offset-4 hover:underline">
                Browse verified catalog
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {lines.map((l) => (
                <li
                  key={l.sku}
                  className="flex items-start justify-between gap-3 rounded-xl bg-surface p-4 hairline"
                >
                  <div>
                    <p className="font-display font-semibold">{l.product.title}</p>
                    <p className="font-mono text-3xs text-muted">
                      {formatUsd(l.product.priceCents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="grid size-10 place-items-center rounded-md hairline"
                      onClick={() => setQty(l.sku, l.qty - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono text-sm tabular-nums">
                      {l.qty}
                    </span>
                    <button
                      type="button"
                      className="grid size-10 place-items-center rounded-md hairline"
                      onClick={() => setQty(l.sku, l.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {lines.length > 0 ? (
            <div className="mt-6 flex items-center justify-between">
              <p className="font-mono text-lg tabular-nums">{formatUsd(total)}</p>
              <Button onClick={place}>Create escrow order</Button>
            </div>
          ) : null}
        </section>
        <section>
          <p className="font-mono text-2xs uppercase tracking-mark text-muted">
            Crystal Clear Box · orders
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
            Observable commerce.
          </h2>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-xl bg-surface p-4 hairline">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-3xs text-muted">{o.id}</p>
                      <p className="mt-1 font-mono text-sm tabular-nums">
                        {formatUsd(o.totalCents)}
                      </p>
                    </div>
                    <StateChip state={o.status} />
                  </div>
                  <p className="mt-2 font-mono text-3xs text-muted">
                    {shortHash(o.receipt, 12)}
                  </p>
                  {o.reason ? (
                    <p className="mt-2 text-xs leading-relaxed text-stamp">{o.reason}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.status === "ORDER_CREATED" ? (
                      <Button size="sm" variant="stamp" onClick={() => attemptPay(o.id)}>
                        Capture PayPal
                      </Button>
                    ) : null}
                    {o.status === "FAIL_CLOSED" || o.status === "ORDER_CREATED" ? (
                      <Button size="sm" variant="outline" onClick={() => reverseOrder(o.id)}>
                        Reverse
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
