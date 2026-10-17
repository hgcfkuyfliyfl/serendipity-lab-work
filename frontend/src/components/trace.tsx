import { AlertTriangle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Run, TraceEvent, TraceState } from "@/lib/types";

const STATE: Record<TraceState, { label: string; icon: typeof Circle; cls: string }> = {
  waiting: { label: "Waiting", icon: Circle, cls: "text-muted-foreground" },
  running: { label: "Running", icon: Loader2, cls: "text-primary" },
  completed: { label: "Completed", icon: CheckCircle2, cls: "text-forest" },
  skipped: { label: "Skipped", icon: MinusCircle, cls: "text-muted-foreground" },
  failed: { label: "Failed", icon: AlertTriangle, cls: "text-terracotta" },
};

export function TraceRow({ e, index }: { e: TraceEvent; index: number }) {
  const s = STATE[e.state];
  const Icon = s.icon;
  return (
    <li
      className={cn(
        "grid grid-cols-[2rem_1fr_auto] gap-x-3 border-b border-border py-4 last:border-0",
        e.state === "waiting" && "opacity-60",
      )}
      aria-current={e.state === "running" ? "step" : undefined}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5", s.cls, e.state === "running" && "animate-spin")}
        aria-hidden
      />
      <div>
        <p className="font-medium">
          <span className="mr-2 font-mono text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          {e.step}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{e.message}</p>
        {e.detail && e.state !== "waiting" && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">{e.detail}</p>
        )}
      </div>
      <div className="text-right">
        <span className={cn("text-xs font-medium", s.cls)}>{s.label}</span>
        <p className="font-mono text-[11px] text-muted-foreground">
          {e.elapsedMs ? `+${(e.elapsedMs / 1000).toFixed(1)}s` : "–"}
        </p>
      </div>
    </li>
  );
}

export function TraceList({ run }: { run: Run }) {
  return (
    <ol aria-label="Agent workflow steps">
      {run.trace.map((e, i) => (
        <TraceRow key={e.id} e={e} index={i} />
      ))}
    </ol>
  );
}

/** Compact progress line, safe to drop on any page. */
export function TraceMini({ run }: { run: Run }) {
  const done = run.trace.filter((e) => e.state === "completed").length;
  const current = run.trace.find((e) => e.state === "running" || e.state === "failed");
  return (
    <div role="status" className="text-sm">
      <div className="flex justify-between gap-3">
        <span>
          {run.status === "completed"
            ? "Run complete"
            : run.status === "failed"
              ? `Failed at: ${current?.step}`
              : `Running: ${current?.step ?? "starting"}`}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {done}/{run.trace.length}
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-secondary">
        <div
          className="h-1 rounded-full bg-primary transition-[width]"
          style={{ width: `${(done / run.trace.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
