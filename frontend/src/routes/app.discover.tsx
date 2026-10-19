import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Play, RotateCcw, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { btn, Chip, MockTag, PageHeader } from "@/components/lab";
import { TraceMini } from "@/components/trace";
import { FIELDS, HERO_ABSTRACTION, HERO_TEXT, SAMPLE_SCENARIOS } from "@/lib/mock-data";
import { FIXED } from "@/lib/serendipity";
import { isApiConfigured } from "@/lib/api";
import { actions, useStore } from "@/lib/store";
import { isHeroInput } from "@/lib/service";
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
    navigate({ to: "/app/trace", search: { demo: false } });
  };
  const heroDraft = { text: HERO_TEXT, homeFields: ["Robotics" as Field], serendipity: FIXED };
  const playHero = () => {
    actions.setDraft(heroDraft);
    actions.run(heroDraft);
    navigate({ to: "/app/trace", search: { demo: false } });
  };
  const skipToResults = () => {
    actions.setDraft(heroDraft);
    actions.loadCached();
    navigate({ to: "/app/results" });
  };
  const loadDemo = () => {
    actions.setDraft({
      text: HERO_TEXT,
      homeFields: ["Robotics"],
      serendipity: FIXED,
    });
    toast("Hero text loaded. Press Find Collisions to replay the cached run.");
  };
  const live = run?.abstraction && run.input.text === text ? run.abstraction : null;
  const shownAbs = live ?? (text === HERO_TEXT ? HERO_ABSTRACTION : null);
  const isHero = isHeroInput(draft);

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Find Cross-Domain Collisions"
        aside={
          <MockTag>
            {isHero
              ? "Cached fixture"
              : isApiConfigured()
                ? "Live backend"
                : "Live model, unverified"}
          </MockTag>
        }
      >
        Describe your research problem in plain terms. The agent strips the domain words, then looks
        for problems with the same structure in other fields.
      </PageHeader>

      <section
        aria-labelledby="hero-h"
        className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-5"
      >
        <div className="max-w-xl">
          <p className="eyebrow">Start here</p>
          <h2 id="hero-h" className="mt-1 text-xl">
            Play the cached hero demo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A frozen run on a robot-gripper problem. Real papers, real source passages and DOIs.
            Scores, heresy labels and reviewer notes are placeholders. No live model and no corpus
            are used.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={playHero} className={btn.primary}>
            <Play className="h-4 w-4" />
            Play cached hero demo
          </button>
          <button onClick={skipToResults} className={btn.secondary}>
            <Zap className="h-4 w-4" />
            Skip to results
          </button>
        </div>
      </section>

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
                placeholder="Describe your problem in your own field's words…"
                className="mt-2 block w-full resize-none bg-transparent font-serif text-2xl font-semibold leading-snug outline-none placeholder:font-normal placeholder:text-muted-foreground/50 md:text-3xl"
              />
              <div id="problem-help" className="mt-2 flex justify-between gap-4 text-xs">
                <span
                  className={
                    error ? "flex items-center gap-1 text-terracotta-ink" : "text-muted-foreground"
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
                  <span className="mr-1 text-xs text-muted-foreground">
                    Home field (excluded from results)
                  </span>
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
                    Load hero text
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

          <p
            role="status"
            className={`rounded-md border p-4 text-sm ${isHero ? "border-forest/40" : "border-ochre/50"}`}
          >
            {isHero ? (
              <>
                <strong className="font-medium">Cached fixture.</strong> Running this replays a
                frozen run. Real papers, passages and DOIs; placeholder scores. No live model and no
                corpus are used.
              </>
            ) : isApiConfigured() ? (
              <>
                <strong className="font-medium">Live backend run.</strong> This text has no fixture.
                Running it sends your text to the team&rsquo;s API, which abstracts it, searches the
                corpus with your home field excluded, and quotes a passage from each paper it
                returns. Anything without a passage and a mapping is dropped. If the run fails you
                get an error, not the hero results.
              </>
            ) : (
              <>
                <strong className="font-medium">Live model, no corpus.</strong> This text has no
                fixture. Running it asks Gemini from its general knowledge. Results are unverified
                suggestions with no source passages, and they are labelled ungrounded. If Gemini
                fails you get an error, not the hero results.
              </>
            )}
          </p>

          <div>
            <p className="eyebrow mb-2">Try a sample scenario</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SCENARIOS.map((s) => (
                <Chip
                  key={s.id}
                  active={text === s.text}
                  onClick={() => actions.setDraft({ text: s.text, homeFields: s.home })}
                >
                  {s.id === "grasp"
                    ? `${s.label} (cached fixture)`
                    : `${s.label} (live, experimental)`}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-8 lg:border-l lg:border-border lg:pl-8">
          <section>
            <p className="eyebrow">
              Structural abstraction{" "}
              <MockTag>{live ? "Gemini live, unverified" : "Cached fixture"}</MockTag>
            </p>
            {shownAbs ? (
              <div className="mt-3 text-sm">
                <p className="font-serif text-lg leading-snug">{shownAbs.functional_problem}</p>
                {shownAbs.mechanism && (
                  <p className="mt-3 text-muted-foreground">{shownAbs.mechanism}</p>
                )}
                {shownAbs.domain_tags && shownAbs.domain_tags.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Tags: {shownAbs.domain_tags.join(", ")}
                  </p>
                )}
                <ul className="mt-3 list-disc space-y-1 pl-4 text-muted-foreground">
                  {shownAbs.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing yet. Run your text and Gemini writes the abstraction, marked unverified.
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
                <Link
                  to="/app/trace"
                  search={{ demo: false }}
                  className="text-primary hover:underline"
                >
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
