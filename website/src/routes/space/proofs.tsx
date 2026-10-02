import { createFileRoute } from "@tanstack/react-router";
import { StateChip } from "@/components/ui/badge";
import { manifest, proofs } from "@/lib/proofs";

export const Route = createFileRoute("/space/proofs")({ component: ProofsPage });

export function ProofsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        DFRL registry
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Registered ≠ verified. Historical counts are not interchangeable with
        the current production state. Duplicates are not extra proofs.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-4 hairline">
          <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
            Z3 WASM
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">
            {manifest.dfrl.unsat} UNSAT
          </p>
          <p className="text-xs text-muted">
            {manifest.dfrl.sat} SAT · {manifest.dfrl.errors} err · {manifest.dfrl.timeouts} to · {manifest.dfrl.seconds}s
          </p>
        </div>
        <div className="rounded-xl bg-surface p-4 hairline">
          <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
            Bootstrap 32
          </p>
          <p className="mt-2 text-sm">
            {manifest.bootstrap.verified} verified · {manifest.bootstrap.family} family · {manifest.bootstrap.claim} claim · {manifest.bootstrap.partial} partial
          </p>
        </div>
        <div className="rounded-xl bg-surface p-4 hairline">
          <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
            Scope
          </p>
          <p className="mt-2 text-sm">{manifest.claimScope}</p>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface hairline">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="font-mono text-2xs uppercase tracking-kicker text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {proofs.map((p) => (
              <tr key={p.code} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-muted">{p.domain}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.result}</td>
                <td className="px-4 py-3">
                  <StateChip state={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
