import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { LogoLink } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: ".com" },
  { to: "/demo", label: "Judge demo" },
  { to: "/store", label: "Storefront" },
  { to: "/registry", label: "AI Registry" },
  { to: "/space", label: ".space" },
  { to: "/manifesto", label: "Manifesto" },
] as const;

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = useAppStore((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const cartCount = ready ? count : 0;
  const domain = pathname.startsWith("/space")
    ? "space"
    : pathname.startsWith("/registry")
      ? "registry"
      : "com";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <LogoLink domain={domain} />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active =
              l.to === "/"
                ? pathname === "/"
                : pathname === l.to || pathname.startsWith(`${l.to}/`);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-medium uppercase tracking-kicker transition-colors duration-150",
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            to="/cart"
            className="relative grid size-11 place-items-center rounded-md text-fg hover:bg-elevated"
            aria-label="Cart"
          >
            <ShoppingBag className="size-4" />
            {cartCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-stamp px-1 font-mono text-2xs text-stamp-fg">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-fg"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted md:flex-row md:items-center md:justify-between">
        <p className="font-display text-sm font-semibold tracking-tight text-fg">
          UAREFAKE
        </p>
        <p className="max-w-xl">
          Evidence before claims. Verification before publication. Authorization
          before execution. Observability after. Reversibility throughout.
        </p>
        <p className="font-mono text-2xs uppercase tracking-kicker">
          Solvex · Daisy Haminja · Human root of trust
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
