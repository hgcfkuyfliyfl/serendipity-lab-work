import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import { activityFor, type ActivityKind } from "@/lib/service";
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
  const row = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // Fixture playback has 15 rows: keep the one that is running in view.
    if (e.meta && e.state === "running")
      row.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [e.meta, e.state]);
  return (
    <li
      ref={row}
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
          {e.step.replace("_", " ")}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{e.message}</p>
        {e.meta && e.state !== "waiting" && (
          <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {e.meta.cached && (
              <span className="rounded-sm bg-accent px-1.5 py-0.5 text-accent-foreground">
                cached
              </span>
            )}
            {e.step === "llm_retry" && (
              <span className="rounded-sm border border-ochre/50 px-1.5 py-0.5 text-ochre">
                retry {e.meta.attempt}
              </span>
            )}
            {e.meta.task && (
              <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono">{e.meta.task}</span>
            )}
          </p>
        )}
        {e.detail && e.state !== "waiting" && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">{e.detail}</p>
        )}
      </div>
      <div className="text-right">
        <span className={cn("text-xs font-medium", s.cls)}>{s.label}</span>
        <p className="font-mono text-[11px] text-muted-foreground">
          {e.meta?.ms
            ? `${(e.meta.ms / 1000).toFixed(1)}s`
            : e.elapsedMs
              ? `+${(e.elapsedMs / 1000).toFixed(1)}s`
              : "–"}
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

const KIND: Record<ActivityKind, string> = {
  search: "SEARCH",
  open: "OPEN",
  read: "READ",
  infer: "INFER",
  objection: "OBJECTION",
  dropped: "DROPPED",
  kept: "KEPT",
};

/** Terminal-style feed of what the agent is doing. Simulated, built from the demo fixtures. */
export function LiveFeed({ run }: { run: Run }) {
  const box = useRef<HTMLDivElement>(null);
  const steps = activityFor(run);
  const runIdx = run.trace.findIndex((e) => e.state === "running");
  const [n, setN] = useState(0);
  const lenRef = useRef(0);
  lenRef.current = steps[runIdx]?.length ?? 0;
  useEffect(() => {
    setN(0);
    if (runIdx < 0) return;
    const t = setInterval(() => setN((v) => Math.min(v + 1, lenRef.current)), 350);
    return () => clearInterval(t);
  }, [runIdx, run.id]);

  const lines = steps.flatMap((list, i) => {
    const st = run.trace[i]?.state;
    if (st === "completed") return list.map((l) => ({ ...l, i }));
    if (st === "running") return list.slice(0, n).map((l) => ({ ...l, i }));
    return [];
  });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const last = el.lastElementChild;
    if (last) gsap.from(last, { autoAlpha: 0, x: -8, duration: 0.3 });
  }, [lines.length]);

  return (
    <div className="mb-8 overflow-hidden rounded-xl bg-ink text-ink-foreground">
      <div className="flex items-center justify-between border-b border-ink-line px-4 py-2 text-xs text-ink-muted">
        <span>
          {run.liveStage === "pending" || run.liveStage === "done"
            ? "Live activity (Gemini)"
            : "Activity (simulated)"}
        </span>
        <span>{run.status === "running" ? "working..." : "finished"}</span>
      </div>
      <div
        ref={box}
        className="max-h-80 space-y-1.5 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        role="log"
        aria-live="polite"
      >
        {lines.map((l, k) => (
          <p key={k} className="grid grid-cols-[5.5rem_1fr] gap-2">
            <span
              className={cn(
                "text-ink-muted",
                l.kind === "objection" && "text-ochre",
                l.kind === "dropped" && "text-terracotta",
              )}
            >
              {KIND[l.kind]}
            </span>
            <span>{l.text}</span>
          </p>
        ))}
        {run.status === "running" && <p className="animate-pulse text-ink-muted">...</p>}
      </div>
    </div>
  );
}
