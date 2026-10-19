import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useEffect } from "react";
import { btn, FieldTag, MockTag, PageHeader } from "@/components/lab";
import { getResults, isGrounded } from "@/lib/service";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/compare")({ component: Compare });

const Ev = ({ yes }: { yes: boolean }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    {yes ? (
      <Check className="h-3.5 w-3.5 text-forest" aria-hidden />
    ) : (
      <Minus className="h-3.5 w-3.5" aria-hidden />
    )}
    {yes ? "Source found" : "No source shown"}
  </span>
);

function Compare() {
  const run = useStore((s) => s.run);
  useEffect(() => {
    actions.ensureRun();
  }, []);
  if (!run) return null;
  const structural = getResults(run).filter(isGrounded).slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        title="Same problem, two kinds of search"
        aside={<MockTag>No benchmark run</MockTag>}
      >
        Both columns answer the same input. Neither is "better" here: they find different things.
        See the Validation page for how this will be measured.
      </PageHeader>
      <p className="mb-8 rounded-md bg-accent p-4 text-sm">
        <span className="font-medium">Shared input: </span>
        {run.input.text}{" "}
        <span className="text-muted-foreground">
          (Home field: {run.input.homeFields.join(", ")})
        </span>
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="conv">
          <h2 id="conv" className="text-xl">
            Conventional search
          </h2>
          <p className="text-sm text-muted-foreground">
            Ranks by topic and keyword overlap. Strong for finding known work.
          </p>
          <div
            role="status"
            className="mt-4 rounded-md border border-dashed border-border bg-card p-5 text-sm"
          >
            <p className="font-medium">No baseline search is connected yet.</p>
            <p className="mt-1 text-muted-foreground">
              Nothing is shown here rather than invented titles. The baseline (embedding search over
              raw abstracts) is measured on the Validation page, where every number is still unrun.
            </p>
          </div>
        </section>

        <section aria-labelledby="struct">
          <h2 id="struct" className="text-xl">
            Structural discovery
          </h2>
          <p className="text-sm text-muted-foreground">
            Ranks by problem structure, excludes the home field. Can surface weak or unproven
            analogies.
          </p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {structural.map((c) => (
              <li key={c.id} className="py-4">
                <p className="font-medium">{c.title}</p>
                <div className="mt-1 flex items-center gap-3">
                  <FieldTag field={c.field} />
                  <Ev yes={!!c.source.passage} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.explanation || c.hypothesis}
                </p>
                <Link
                  to="/app/candidate/$id"
                  params={{ id: c.id }}
                  className="mt-2 inline-flex min-h-11 items-center text-sm text-primary hover:underline sm:min-h-0"
                >
                  Inspect evidence
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="mt-8">
        <Link to="/app/discover" className={btn.secondary}>
          Back to Discover
        </Link>
      </div>
    </>
  );
}
