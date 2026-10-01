import { paraiStages, type ParaiId } from "@/lib/proofs";
import { cn } from "@/lib/utils";

export function ParaiStrip({
  active,
  compact = false,
}: {
  active?: ParaiId;
  compact?: boolean;
}) {
  const activeIndex = active
    ? paraiStages.findIndex((s) => s.id === active)
    : -1;
  return (
    <ol
      className={cn(
        "grid gap-1",
        compact
          ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
      )}
    >
      {paraiStages.map((s, i) => {
        const on = i === activeIndex;
        const done = activeIndex >= 0 && i < activeIndex;
        return (
          <li
            key={s.id}
            className={cn(
              "rounded-md px-2 py-2 hairline",
              on && "bg-fg text-bg",
              done && "bg-elevated",
            )}
          >
            <p className="font-mono text-2xs uppercase tracking-kicker opacity-70">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p
              className={cn(
                "font-display text-sm font-semibold tracking-tight",
                compact && "text-xs",
              )}
            >
              {s.label}
            </p>
            {!compact ? (
              <p className={cn("mt-1 text-3xs", on ? "opacity-80" : "text-muted")}>
                {s.hint}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
