import { create } from "zustand";
import { persist } from "zustand/middleware";
import { productBySku } from "@/lib/catalog";
import { paraiStages, type ParaiId } from "@/lib/proofs";

export type CartLine = { sku: string; qty: number };

export type OrderStatus =
  | "ORDER_CREATED"
  | "AUTHORIZATION_HOLD"
  | "FAIL_CLOSED"
  | "ESCROW_FUNDED"
  | "REVERSED";

export type Order = {
  id: string;
  items: { sku: string; title: string; priceCents: number; qty: number }[];
  totalCents: number;
  status: OrderStatus;
  createdAt: number;
  reason?: string;
  receipt: string;
};

export type RunStatus =
  | "QUEUED"
  | "CYCLING"
  | "FAIL_CLOSED"
  | "EXECUTED"
  | "REVERSED";

export type Run = {
  id: string;
  operation: string;
  authorized: boolean;
  reversible: boolean;
  status: RunStatus;
  stage: ParaiId;
  note: string;
  startedAt: number;
  receipt: string;
};

type AppState = {
  cart: CartLine[];
  orders: Order[];
  runs: Run[];
  addToCart: (sku: string) => { ok: true } | { ok: false; error: string };
  setQty: (sku: string, qty: number) => void;
  clearCart: () => void;
  checkout: () => { ok: true; order: Order } | { ok: false; error: string };
  attemptPay: (orderId: string) => void;
  reverseOrder: (orderId: string) => void;
  proposeRun: (input: {
    operation: string;
    authorized: boolean;
    reversible: boolean;
  }) => Run;
  advanceRun: (id: string) => void;
  reverseRun: (id: string) => void;
};

function receiptOf(prefix: string) {
  const n = Math.random().toString(16).slice(2, 10);
  const t = Date.now().toString(16);
  return `${prefix}:${t}:${n}`;
}

function orderId() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function runId() {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      orders: [],
      runs: [],
      addToCart: (sku) => {
        const product = productBySku(sku);
        if (!product) return { ok: false, error: "Unknown SKU." };
        if (product.evidence !== "VERIFIED") {
          return {
            ok: false,
            error: `Fail-closed: ${product.evidence} goods cannot enter the verified marketplace.`,
          };
        }
        set((s) => {
          const existing = s.cart.find((l) => l.sku === sku);
          const cart = existing
            ? s.cart.map((l) =>
                l.sku === sku ? { ...l, qty: l.qty + 1 } : l,
              )
            : [...s.cart, { sku, qty: 1 }];
          return { cart };
        });
        return { ok: true };
      },
      setQty: (sku, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((l) => l.sku !== sku)
              : s.cart.map((l) => (l.sku === sku ? { ...l, qty } : l)),
        })),
      clearCart: () => set({ cart: [] }),
      checkout: () => {
        const { cart } = get();
        if (cart.length === 0) return { ok: false, error: "Cart is empty." };
        const items = cart.map((l) => {
          const p = productBySku(l.sku)!;
          return {
            sku: l.sku,
            title: p.title,
            priceCents: p.priceCents,
            qty: l.qty,
          };
        });
        const totalCents = items.reduce(
          (n, i) => n + i.priceCents * i.qty,
          0,
        );
        const order: Order = {
          id: orderId(),
          items,
          totalCents,
          status: "ORDER_CREATED",
          createdAt: Date.now(),
          receipt: receiptOf("UAF-ORD"),
        };
        set((s) => ({ orders: [order, ...s.orders], cart: [] }));
        return { ok: true, order };
      },
      attemptPay: (orderId) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "FAIL_CLOSED",
                  reason:
                    "PayPal DN-35 adapter: EXTERNAL_PROVIDER_REQUIRED. Code exists ≠ provider connected. Success was not simulated.",
                }
              : o,
          ),
        })),
      reverseOrder: (orderId) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "REVERSED",
                  reason: "Compensating reverse applied. Entitlement withdrawn.",
                }
              : o,
          ),
        })),
      proposeRun: ({ operation, authorized, reversible }) => {
        const run: Run = {
          id: runId(),
          operation,
          authorized,
          reversible,
          status: "CYCLING",
          stage: "INPUT",
          note: "Cycle opened. Information is not yet evidence.",
          startedAt: Date.now(),
          receipt: receiptOf("UAF-RUN"),
        };
        set((s) => ({ runs: [run, ...s.runs].slice(0, 24) }));
        return run;
      },
      advanceRun: (id) =>
        set((s) => ({
          runs: s.runs.map((r) => {
            if (r.id !== id || r.status !== "CYCLING") return r;
            const i = paraiStages.findIndex((st) => st.id === r.stage);
            const next = paraiStages[i + 1];
            if (r.stage === "AUTHORIZE" && !r.authorized) {
              return {
                ...r,
                status: "FAIL_CLOSED",
                note: "Authorization unavailable. Capability does not imply permission. Execution refused.",
              };
            }
            if (r.stage === "GOVERN" && !r.reversible) {
              return {
                ...r,
                status: "FAIL_CLOSED",
                note: "Reversibility cannot be established. The system does nothing it cannot reverse.",
              };
            }
            if (!next) {
              return {
                ...r,
                status: "EXECUTED",
                stage: "LEARN",
                note: "Observable execution complete. Receipt sealed. Verified learning recorded.",
              };
            }
            return {
              ...r,
              stage: next.id,
              note: next.hint,
            };
          }),
        })),
      reverseRun: (id) =>
        set((s) => ({
          runs: s.runs.map((r) =>
            r.id === id && r.status === "EXECUTED"
              ? {
                  ...r,
                  status: "REVERSED",
                  note: "Rollback applied. Prior checkpoint restored. Forensic record retained.",
                }
              : r,
          ),
        })),
    }),
    { name: "uarefake-ledger" },
  ),
);
