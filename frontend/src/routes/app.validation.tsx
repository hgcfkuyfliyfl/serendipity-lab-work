import { createFileRoute } from "@tanstack/react-router";
import { CircleDashed } from "lucide-react";
import { MockTag, PageHeader } from "@/components/lab";
import { getValidationCases } from "@/lib/service";

export const Route = createFileRoute("/app/validation")({ component: Validation });

const dash = (v: string) =>
  v === "—" ? (
    <span aria-label="not measured" className="text-muted-foreground">
      —
    </span>
  ) : (
    v
  );

function Validation() {
  const cases = getValidationCases();
  const measured = cases.filter((c) => c.status !== "Not run").length;
  return (
    <>
      <PageHeader
        eyebrow="Validation"
        title="How do we know it works?"
        aside={<MockTag>{measured} cases measured</MockTag>}
      >
        We test on famous historical cross-domain breakthroughs. The question: does the true source
        field or paper show up in the top 5 or top 10, compared with plain embedding search?
      </PageHeader>

      <p role="status" className="mb-4 rounded-md border border-ochre/50 bg-card p-4 text-sm">
        <strong className="font-medium">
          {measured} of {cases.length} cases have been run.
        </strong>{" "}
        No hit rate, win rate or superiority claim is shown until real runs are recorded. Every
        number below is a dash on purpose.
      </p>
      <p className="mb-8 text-sm text-muted-foreground">
        Related work: Literature-Based Discovery finds hidden links inside connected literatures,
        analogy mining is our closest academic relative, and TRIZ is a manual method. We automate
        the cross-domain structural search and measure it against a baseline.
      </p>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[64rem] text-sm">
          <caption className="sr-only">
            Validation cases. Baseline and structural results, top 5 and top 10 shown separately.
          </caption>
          <thead className="bg-secondary text-left">
            <tr>
              <th scope="col" rowSpan={2} className="p-3 font-medium">
                Test case
              </th>
              <th scope="col" rowSpan={2} className="p-3 font-medium">
                Type
              </th>
              <th scope="col" rowSpan={2} className="p-3 font-medium">
                Researcher's field
              </th>
              <th scope="col" rowSpan={2} className="p-3 font-medium">
                Expected source
              </th>
              <th scope="colgroup" colSpan={2} className="border-l border-border p-2 font-medium">
                Baseline (raw abstracts)
              </th>
              <th scope="colgroup" colSpan={2} className="border-l border-border p-2 font-medium">
                Structural discovery
              </th>
              <th scope="col" rowSpan={2} className="border-l border-border p-3 font-medium">
                Status
              </th>
            </tr>
            <tr>
              {["Top 5", "Top 10", "Top 5", "Top 10"].map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`p-2 text-xs font-medium ${i % 2 === 0 ? "border-l border-border" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <th scope="row" className="p-3 text-left font-medium">
                  {c.name}
                  {c.note && (
                    <span className="mt-1 block max-w-xs text-xs font-normal text-muted-foreground">
                      {c.note}
                    </span>
                  )}
                </th>
                <td className="p-3 text-xs text-muted-foreground">{c.kind}</td>
                <td className="p-3 text-muted-foreground">{c.researcherField}</td>
                <td className="p-3 text-muted-foreground">{c.expectedSource}</td>
                <td className="border-l border-border p-3 font-mono">{dash(c.baselineTop5)}</td>
                <td className="p-3 font-mono">{dash(c.baselineTop10)}</td>
                <td className="border-l border-border p-3 font-mono">{dash(c.structuralTop5)}</td>
                <td className="p-3 font-mono">{dash(c.structuralTop10)}</td>
                <td className="border-l border-border p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <CircleDashed className="h-4 w-4" aria-hidden />
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl">Method</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Write each case as the researcher would have, in home-field words only.</li>
            <li>Baseline: embed raw abstracts and search them.</li>
            <li>
              Structural: abstract each paper and the query, then search those abstractions with the
              home field excluded.
            </li>
            <li>
              Record whether the true source appears in the top 5 and, separately, the top 10.
            </li>
            <li>
              Report every result as hits out of cases run, including losses. The denominator is
              always the number of cases actually run.
            </li>
          </ol>
        </div>
        <div>
          <h2 className="text-xl">Limits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>The source papers must exist in the corpus, or the test means nothing.</li>
            <li>A handful of cases is a sanity check, not a statistical proof.</li>
            <li>
              The development case was used to build the demo, so it cannot count as evidence.
            </li>
            <li>Historical cases are known now. The query wording may leak hints.</li>
            <li>Abstraction quality depends on the language model used.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
