import { createRouter, Link } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <p className="font-mono text-2xs uppercase tracking-mark text-muted">
        404
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Unregistered path.
      </h1>
      <p className="text-sm text-muted">Not evidence of a missing product.</p>
      <Link to="/" className="mt-2 text-sm underline-offset-4 hover:underline">
        Return to uarefake.com
      </Link>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFound,
  });
}
