import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, RefreshCw, Zap } from "lucide-react";
import { useEffect } from "react";
import { btn, MockTag, PageHeader } from "@/components/lab";
import { LiveFeed, StageRail, TraceList, TraceMini } from "@/components/trace";
import { getCandidate } from "@/lib/service";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/trace")({
  validateSearch: (s: Record<string, unknown>) => ({ demo: s.demo === true || s.demo === "true" }),
  component: TracePage,
});

function TracePage() {
  const { demo } = Route.useSearch();
  const run = useStore((s) => s.run);
  useEffect(() => {
    if (demo) actions.loadCached();
    else actions.ensureRun();
  }, [demo]);
  if (!run) return null;

  const failed = run.status === "failed";
  const done = run.status === "completed";
  const stopped = run.trace.find((e) => e.state === "failed");

  return (
    <>
      <PageHeader
        eyebrow="Agent trace"
        title="What the agent did"
        aside={
          <MockTag>
            {run.fixture
              ? "Cached fixture playback"
              : run.backend
                ? "Live backend run"
                : "Live model, no corpus"}
          </MockTag>
        }
      >
        {run.fixture
          ? "The agent decomposes your problem, retrieves, lets a skeptic reject candidates, then rewrites its own queries and retrieves again. Each line is one event from the run."
          : run.backend
            ? "Live run on the team's backend. Every line below is one event the server sent while the agent loop was running. Nothing is added here."
            : "Live run: Gemini restates your problem, proposes analogies from its own knowledge, and a second call challenges them. No paper corpus is searched and no refinement loop runs."}
      </PageHeader>

      {run.seeded && (
        <p role="status" className="mb-6 rounded-md border border-ochre/50 bg-card p-4 text-sm">
          <strong className="font-medium">This is the cached hero demo, not your run.</strong> No
          run was in progress, so the app opened the frozen example about robot grasping.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-live="polite">
          {run.fixture ? <StageRail run={run} /> : run.backend ? null : <LiveFeed run={run} />}
          <TraceList run={run} />
          {failed && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-terracotta/50 bg-card p-4 text-sm"
            >
              <p className="font-medium">This run did not finish.</p>
              <p className="mt-1 text-muted-foreground">
                {stopped?.message} Nothing was lost: your input is kept.
              </p>
            </div>
          )}
          {run.liveNote && (
            <p className="mt-4 text-sm text-terracotta" role="status">
              {run.liveNote}
            </p>
          )}
          {done && run.fixture && (
            <p className="mt-4 text-sm text-muted-foreground">
              This is a replay of a frozen fixture. Titles, years, DOIs and source passages are real
              (checked against OpenAlex and Europe PMC). Scores, heresy labels, hypotheses and
              reviewer notes are placeholders and will change when real output lands.
            </p>
          )}
          {done && run.candidates && run.backend && (
            <p className="mt-4 text-sm text-muted-foreground">
              Each result quotes a passage from the paper the backend retrieved. Anything the server
              could not ground in a passage and a mapping was dropped before it reached this page.
              The scores are the system&rsquo;s own and have not been validated against a baseline.
            </p>
          )}
          {done && run.candidates && !run.fixture && !run.backend && (
            <p className="mt-4 text-sm text-muted-foreground">
              These candidates were generated live by Gemini from its general knowledge. No paper
              corpus is connected, so no source passages were retrieved and nothing here is
              verified.
            </p>
          )}
        </section>

        <aside className="space-y-6 lg:border-l lg:border-border lg:pl-8">
          <TraceMini run={run} />
          <div className="flex flex-col gap-2">
            <Link
              to="/app/results"
              className={btn.primary}
              aria-disabled={!done}
              onClick={(e) => !done && e.preventDefault()}
              style={!done ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              View results <ArrowRight className="h-4 w-4" />
            </Link>
            <button className={btn.secondary} onClick={() => actions.run(run.input)}>
              <RefreshCw className="h-4 w-4" />
              Retry run
            </button>
            <button className={btn.secondary} onClick={actions.loadCached}>
              <Zap className="h-4 w-4" />
              {run.fixture ? "Open cached demo run" : "Play cached hero demo (different problem)"}
            </button>
            <Link to="/app/discover" className={btn.ghost}>
              <ArrowLeft className="h-4 w-4" />
              Back to Discover
            </Link>
          </div>
          {done && (
            <section>
              <h2 className="text-lg">Why candidates were kept or dropped</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {run.resultIds.map((id) => (
                  <li key={id}>
                    <span className="text-forest">Kept:</span> {getCandidate(id)?.title}
                  </li>
                ))}
                {run.rejected.map((r) => (
                  <li key={r.id}>
                    <span className="text-terracotta">Dropped:</span>{" "}
                    {r.title ?? getCandidate(r.id)?.title}
                    <span className="block text-xs text-muted-foreground">{r.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
