import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useEffect } from "react";
import { btn, FieldTag, MockTag, PageHeader } from "@/components/lab";
import { CONVENTIONAL_RESULTS } from "@/lib/mock-data";
import { getResults } from "@/lib/service";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/compare")({ component: Compare });

const Ev = ({ yes }: { yes: boolean }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{yes ? <Check className="h-3.5 w-3.5 text-forest" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}{yes ? "Source found" : "No source shown"}</span>
);

function Compare() {
  const run = useStore((s) => s.run);
  useEffect(() => { actions.ensureRun(); }, []);
  if (!run) return null;
  const structural = getResults(run).slice(0, 4);

  return (
    <>
      <PageHeader eyebrow="Compare" title="Same problem, two kinds of search" aside={<MockTag>Illustrative, no benchmark run</MockTag>}>
        Both columns answer the same input. Neither is "better" here: they find different things. See the Validation page for how this will be measured.
      </PageHeader>
      <p className="mb-8 rounded-md bg-accent p-4 text-sm"><span className="font-medium">Shared input: </span>{run.input.text} <span className="text-muted-foreground">(Home field: {run.input.homeFields.join(", ")})</span></p>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="conv">
          <h2 id="conv" className="text-xl">Conventional search</h2>
          <p className="text-sm text-muted-foreground">Ranks by topic and keyword overlap. Strong for finding known work.</p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {CONVENTIONAL_RESULTS.map((r) => (
              <li key={r.title} className="py-4"><p className="font-medium">{r.title}</p><div className="mt-1 flex items-center gap-3"><FieldTag field={r.field} /><Ev yes={r.evidence} /></div><p className="mt-2 text-sm text-muted-foreground">{r.note}</p></li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">Example titles are illustrative and not linked to real papers.</p>
        </section>

        <section aria-labelledby="struct">
          <h2 id="struct" className="text-xl">Structural discovery</h2>
          <p className="text-sm text-muted-foreground">Ranks by problem structure, excludes the home field. Can surface weak or unproven analogies.</p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {structural.map((c) => (
              <li key={c.id} className="py-4"><p className="font-medium">{c.title}</p>
                <div className="mt-1 flex items-center gap-3"><FieldTag field={c.field} /><Ev yes={!!c.source.passage} /></div>
                <p className="mt-2 text-sm text-muted-foreground">{c.explanation}</p>
                <Link to="/app/candidate/$id" params={{ id: c.id }} className="mt-2 inline-block text-sm text-primary hover:underline">Inspect evidence</Link></li>
            ))}
          </ol>
        </section>
      </div>
      <div className="mt-8"><Link to="/app/discover" className={btn.secondary}>Back to Discover</Link></div>
    </>
  );
}
