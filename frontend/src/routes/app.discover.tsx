import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Play, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { btn, Chip, MockTag, PageHeader } from "@/components/lab";
import { TraceMini } from "@/components/trace";
import { FIELDS, HERO_ABSTRACTION, HERO_TEXT, SAMPLE_SCENARIOS } from "@/lib/mock-data";
import { FIXED } from "@/lib/serendipity";
import { actions, useStore } from "@/lib/store";
import type { Field } from "@/lib/types";

export const Route = createFileRoute("/app/discover")({ component: Discover });

const MAX = 1000;
const MIN = 30;

function Discover() {
  const navigate = useNavigate();
  const draft = useStore((s) => s.draft);
  const run = useStore((s) => s.run);
  const { text, homeFields } = draft;

  const error =
    text.trim().length < MIN
      ? `Describe the problem in at least ${MIN} characters (${text.trim().length} so far).`
      : homeFields.length === 0
        ? "Select at least one home field so it can be excluded from the search."
        : null;
  const excluded = new Set<Field>(homeFields);
  const adjacentOnly = [...excluded].filter((f) => !homeFields.includes(f));

  const toggleField = (f: Field) =>
    actions.setDraft({
      homeFields: homeFields.includes(f) ? homeFields.filter((x) => x !== f) : [...homeFields, f],
    });
  const find = () => {
    if (error) return;
    actions.run(draft);
    navigate({ to: "/app/trace" });
  };
  const loadDemo = () => {
    actions.setDraft({
      text: HERO_TEXT,
      homeFields: ["Robotics"],
      serendipity: FIXED,
    });
    toast("Demo scenario loaded: robot grasping");
  };
  const live = run?.abstraction && run.input.text === text ? run.abstraction : null;
  const shownAbs = live ?? (text === HERO_TEXT ? HERO_ABSTRACTION : null);
  const isHero = text === HERO_TEXT;

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Find Cross-Domain Collisions"
        aside={<MockTag>Live Gemini, unverified</MockTag>}
      >
        Describe your research problem in plain terms. The agent strips the domain words, then looks
        for problems with the same structure in other fields.
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section
            aria-label="Research problem"
            className="rounded-[1.75rem] bg-accent p-2 shadow-[0_24px_48px_-28px_rgba(23,63,56,0.6)]"
          >
            <div className="rounded-[1.4rem] bg-gradient-to-b from-card via-card to-accent/60 p-5 md:p-6">
              <label htmlFor="problem" className="text-sm font-medium text-muted-foreground">
                What are you trying to solve?
              </label>
              <textarea
                id="problem"
                value={text}
                maxLength={MAX}
                rows={4}
                onChange={(e) => actions.setDraft({ text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) find();
                }}
                aria-invalid={!!error && text.trim().length < MIN}
                aria-describedby="problem-help"
                placeholder="Optimizing traffic routing through a city grid during accidents…"
                className="mt-2 block w-full resize-none bg-transparent font-serif text-2xl font-semibold leading-snug outline-none placeholder:font-normal placeholder:text-muted-foreground/50 md:text-3xl"
              />
              <div id="problem-help" className="mt-2 flex justify-between gap-4 text-xs">
                <span
                  className={
                    error ? "flex items-center gap-1 text-terracotta" : "text-muted-foreground"
                  }
                  role={error ? "alert" : undefined}
                >
                  {error && <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
                  {error ?? "Looks good. Use your own field's words; the agent abstracts them."}
                </span>
                <span className="font-mono text-muted-foreground">
                  {text.length}/{MAX}
                </span>
              </div>
              <fieldset className="mt-4 border-t border-border/70 pt-4">
                <legend className="sr-only">Home field, excluded from results</legend>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-muted-foreground">Home field</span>
                  {FIELDS.map((f) => (
                    <Chip key={f} active={homeFields.includes(f)} onClick={() => toggleField(f)}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1">
                  <button className={btn.ghost} onClick={loadDemo}>
                    <Play className="h-4 w-4" />
                    Load demo
                  </button>
                  <button
                    className={btn.ghost}
                    onClick={() => {
                      actions.resetDemo();
                      toast("Workspace reset");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
                <button
                  onClick={find}
                  disabled={!!error}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  <Search className="h-5 w-5" />
                  Find Collisions
                  <kbd className="hidden rounded bg-primary-foreground/15 px-1.5 font-mono text-[10px] md:inline">
                    Ctrl Enter
                  </kbd>
                </button>
              </div>
            </div>
          </section>

          <div>
            <p className="eyebrow mb-2">Try a sample scenario</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SCENARIOS.map((s) => (
                <Chip
                  key={s.id}
                  active={text === s.text}
                  onClick={() => actions.setDraft({ text: s.text, homeFields: s.home })}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
            {!isHero && (
              <p className="mt-3 text-xs text-muted-foreground">
                Prototype note: only the traffic-routing scenario has a full set of fixtures. Other
                text falls back to the cached hero results and the trace says so.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-8 lg:border-l lg:border-border lg:pl-8">
          <section>
            <p className="eyebrow">
              Structural abstraction <MockTag>{live ? "Gemini live" : "Cached"}</MockTag>
            </p>
            {shownAbs ? (
              <div className="mt-3 text-sm">
                <p className="font-serif text-lg leading-snug">{shownAbs.functional_problem}</p>
                {shownAbs.mechanism && (
                  <p className="mt-3 text-muted-foreground">{shownAbs.mechanism}</p>
                )}
                <ul className="mt-3 list-disc space-y-1 pl-4 text-muted-foreground">
                  {shownAbs.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Run it and Gemini writes the abstraction for your text.
              </p>
            )}
          </section>
          <section className="rounded-lg bg-accent p-5 text-sm">
            <h2 className="text-lg">Structure, not keywords</h2>
            <p className="mt-2 text-muted-foreground">
              Two fields can describe the same problem in different words. The agent keeps the
              shape: what must change, under which constraints, driven by what signal.
            </p>
          </section>
          {run && (
            <section>
              <p className="eyebrow mb-2">Latest run</p>
              <TraceMini run={run} />
              <div className="mt-3 flex gap-4 text-sm">
                <Link to="/app/trace" className="text-primary hover:underline">
                  Agent trace
                </Link>
                <Link to="/app/results" className="text-primary hover:underline">
                  Results
                </Link>
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
