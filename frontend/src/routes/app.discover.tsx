import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Play, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { btn, Chip, MockTag, PageHeader } from "@/components/lab";
import { TraceMini } from "@/components/trace";
import { Slider } from "@/components/ui/slider";
import { ADJACENT, FIELDS, HERO_ABSTRACTION, HERO_TEXT, SAMPLE_SCENARIOS } from "@/lib/mock-data";
import { LEVELS, LEVEL_ORDER } from "@/lib/serendipity";
import { actions, useStore } from "@/lib/store";
import type { Field } from "@/lib/types";

export const Route = createFileRoute("/app/discover")({ component: Discover });

const MAX = 1000;
const MIN = 30;

function Discover() {
  const navigate = useNavigate();
  const draft = useStore((s) => s.draft);
  const run = useStore((s) => s.run);
  const { text, homeFields, serendipity: sl } = draft;

  const error = text.trim().length < MIN ? `Describe the problem in at least ${MIN} characters (${text.trim().length} so far).` : homeFields.length === 0 ? "Select at least one home field so it can be excluded from the search." : null;
  const excluded = new Set<Field>(homeFields);
  homeFields.forEach((h) => ADJACENT[h].slice(0, sl.excludedAdjacent).forEach((f) => excluded.add(f)));
  const adjacentOnly = [...excluded].filter((f) => !homeFields.includes(f));

  const toggleField = (f: Field) => actions.setDraft({ homeFields: homeFields.includes(f) ? homeFields.filter((x) => x !== f) : [...homeFields, f] });
  const find = () => { if (error) return; actions.run(draft); navigate({ to: "/app/trace" }); };
  const loadDemo = () => { actions.setDraft({ text: HERO_TEXT, homeFields: ["Civil Engineering"], serendipity: LEVELS.balanced }); toast("Demo scenario loaded: traffic routing"); };
  const isHero = text === HERO_TEXT;

  return (
    <>
      <PageHeader eyebrow="Discover" title="Find Cross-Domain Collisions" aside={<MockTag>Runs on demo data</MockTag>}>
        Describe your research problem in plain terms. The agent strips the domain words, then looks for problems with the same structure in other fields.
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section>
            <label htmlFor="problem" className="text-sm font-medium">Research problem</label>
            <textarea id="problem" value={text} maxLength={MAX} rows={5}
              onChange={(e) => actions.setDraft({ text: e.target.value })}
              aria-invalid={!!error && text.trim().length < MIN} aria-describedby="problem-help"
              placeholder="e.g. Optimizing traffic routing through a city grid during accidents…"
              className="mt-2 w-full resize-y rounded-md border border-input bg-card p-3 text-sm leading-relaxed placeholder:text-muted-foreground/70" />
            <div id="problem-help" className="mt-1 flex justify-between gap-4 text-xs">
              <span className={error ? "flex items-center gap-1 text-terracotta" : "text-muted-foreground"} role={error ? "alert" : undefined}>
                {error && <AlertCircle className="h-3.5 w-3.5" aria-hidden />}{error ?? "Looks good. Use home-field language; the agent abstracts it for you."}
              </span>
              <span className="font-mono text-muted-foreground">{text.length}/{MAX}</span>
            </div>
          </section>

          <fieldset>
            <legend className="text-sm font-medium">Home field <span className="font-normal text-muted-foreground">(excluded from results)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FIELDS.map((f) => <Chip key={f} active={homeFields.includes(f)} onClick={() => toggleField(f)}>{f}</Chip>)}
            </div>
          </fieldset>

          <section className="border-y border-border py-6" aria-labelledby="slider-h">
            <div className="flex items-baseline justify-between">
              <h2 id="slider-h" className="text-xl">Serendipity Slider</h2>
              <span className="text-sm font-medium text-primary">{LEVELS[sl.level].label}</span>
            </div>
            <Slider className="mt-5" min={0} max={2} step={1} value={[LEVEL_ORDER.indexOf(sl.level)]} aria-label="Serendipity level"
              onValueChange={([v]) => actions.setDraft({ serendipity: LEVELS[LEVEL_ORDER[v]] })} />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {LEVEL_ORDER.map((l) => <span key={l} className={l === sl.level ? "font-medium text-foreground" : ""}>{LEVELS[l].label}</span>)}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{LEVELS[sl.level].summary}</p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="eyebrow">Adjacent fields excluded</dt><dd className="mt-1 font-mono">{sl.excludedAdjacent}{adjacentOnly.length > 0 && <span className="ml-2 font-sans text-muted-foreground">({adjacentOnly.join(", ")})</span>}</dd></div>
              <div><dt className="eyebrow">Ranked list explored to</dt><dd className="mt-1 font-mono">top {sl.rankDepth}</dd></div>
            </dl>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button className={btn.primary} onClick={find} disabled={!!error}><Search className="h-4 w-4" />Find Collisions</button>
            <button className={btn.secondary} onClick={loadDemo}><Play className="h-4 w-4" />Load Demo Scenario</button>
            <button className={btn.ghost} onClick={() => { actions.resetDemo(); toast("Workspace reset"); }}><RotateCcw className="h-4 w-4" />Reset</button>
          </div>

          <div>
            <p className="eyebrow mb-2">Try a sample scenario</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SCENARIOS.map((s) => <Chip key={s.id} active={text === s.text} onClick={() => actions.setDraft({ text: s.text, homeFields: s.home })}>{s.label}</Chip>)}
            </div>
            {!isHero && <p className="mt-3 text-xs text-muted-foreground">Prototype note: only the traffic-routing scenario has a full set of fixtures. Other text falls back to the cached hero results and the trace says so.</p>}
          </div>
        </div>

        <aside className="space-y-8 lg:border-l lg:border-border lg:pl-8">
          <section>
            <p className="eyebrow">Structural abstraction <MockTag>Cached</MockTag></p>
            {isHero ? (
              <div className="mt-3 text-sm">
                <p className="font-serif text-lg leading-snug">{HERO_ABSTRACTION.functional_problem}</p>
                <p className="mt-3 text-muted-foreground">{HERO_ABSTRACTION.mechanism}</p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-muted-foreground">{HERO_ABSTRACTION.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">The abstraction for custom text is produced when you run it. This prototype shows the cached example.</p>}
          </section>
          <section className="rounded-lg bg-accent p-5 text-sm">
            <h2 className="text-lg">Structure, not keywords</h2>
            <p className="mt-2 text-muted-foreground">Traffic jams and ant trails share no words. They share a shape: many agents, local signals, no central planner, sudden failures.</p>
          </section>
          {run && (
            <section>
              <p className="eyebrow mb-2">Latest run</p>
              <TraceMini run={run} />
              <div className="mt-3 flex gap-4 text-sm"><Link to="/app/trace" className="text-primary hover:underline">Agent trace</Link><Link to="/app/results" className="text-primary hover:underline">Results</Link></div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
