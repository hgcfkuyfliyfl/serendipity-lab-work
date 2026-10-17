import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, RefreshCw, Zap } from "lucide-react";
import { useEffect } from "react";
import { btn, MockTag, PageHeader } from "@/components/lab";
import { TraceList, TraceMini } from "@/components/trace";
import { getCandidate } from "@/lib/service";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/trace")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s.demo === true || s.demo === "true" }),
  component: TracePage,
});

function TracePage() {
  const { demo } = Route.useSearch();
  const run = useStore((s) => s.run);
  useEffect(() => { if (demo) actions.loadCached(); else actions.ensureRun(); }, [demo]);
  if (!run) return null;

  const failed = run.status === "failed";
  const done = run.status === "completed";
  const retrieval = run.trace[2];

  return (
    <>
      <PageHeader eyebrow="Agent trace" title="What the agent did" aside={<MockTag>Simulated workflow</MockTag>}>
        Nine steps run in a fixed order, so the demo is the same every time. Refinement is capped at two loops.
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-live="polite">
          <TraceList run={run} />
          {failed && (
            <div role="alert" className="mt-4 rounded-md border border-terracotta/50 bg-card p-4 text-sm">
              <p className="font-medium">Retrieval did not finish.</p>
              <p className="mt-1 text-muted-foreground">{retrieval.message} Nothing was lost: your input is kept.</p>
            </div>
          )}
          {run.cachedFallback && done && <p className="mt-4 text-sm text-muted-foreground">Your text is not one of the prepared scenarios, so the agent showed the cached traffic-routing results as a fallback.</p>}
        </section>

        <aside className="space-y-6 lg:border-l lg:border-border lg:pl-8">
          <TraceMini run={run} />
          <div className="flex flex-col gap-2">
            <Link to="/app/results" className={btn.primary} aria-disabled={!done} onClick={(e) => !done && e.preventDefault()} style={!done ? { opacity: 0.5, pointerEvents: "none" } : undefined}>View results <ArrowRight className="h-4 w-4" /></Link>
            <button className={btn.secondary} onClick={() => actions.run(run.input)}><RefreshCw className="h-4 w-4" />Retry run</button>
            <button className={btn.secondary} onClick={actions.loadCached}><Zap className="h-4 w-4" />Open cached demo run</button>
            <Link to="/app/discover" className={btn.ghost}><ArrowLeft className="h-4 w-4" />Back to Discover</Link>
          </div>
          {done && (
            <section>
              <h2 className="text-lg">Why candidates were kept or dropped</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {run.resultIds.map((id) => <li key={id}><span className="text-forest">Kept:</span> {getCandidate(id)?.title}</li>)}
                {run.rejected.map((r) => <li key={r.id}><span className="text-terracotta">Dropped:</span> {getCandidate(r.id)?.title}<span className="block text-xs text-muted-foreground">{r.reason}</span></li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
