import { createFileRoute } from "@tanstack/react-router";
import { CircleDashed, Hourglass } from "lucide-react";
import { MockTag, PageHeader } from "@/components/lab";
import { getValidationCases } from "@/lib/service";

export const Route = createFileRoute("/app/validation")({ component: Validation });

function Validation() {
  const cases = getValidationCases();
  const run = cases.filter((c) => c.baseline !== "—").length;
  return (
    <>
      <PageHeader eyebrow="Validation" title="How do we know it works?" aside={<MockTag>{run} cases measured</MockTag>}>
        We test on famous historical cross-domain breakthroughs. The question: does the true source field show up in the top 5 or top 10?
      </PageHeader>

      <p role="status" className="mb-8 rounded-md border border-ochre/50 bg-card p-4 text-sm"><strong className="font-medium">{run} of {cases.length} cases have been run.</strong> No hit rate or superiority claim is made until measured data is entered below.</p>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-secondary text-left"><tr>{["Test case", "Researcher's field", "Expected source", "Baseline (raw abstracts)", "Structural discovery", "Top-5 / Top-10", "Status"].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <th scope="row" className="p-3 text-left font-medium">{c.name}</th>
                <td className="p-3 text-muted-foreground">{c.researcherField}</td>
                <td className="p-3 text-muted-foreground">{c.expectedSource}</td>
                <td className="p-3 font-mono text-muted-foreground">{c.baseline}</td>
                <td className="p-3 font-mono text-muted-foreground">{c.structural}</td>
                <td className="p-3 font-mono text-muted-foreground">{c.topK}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1.5">{c.status === "Not Run" ? <CircleDashed className="h-4 w-4" aria-hidden /> : <Hourglass className="h-4 w-4" aria-hidden />}{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div><h2 className="text-xl">Method</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Write each case as the researcher would have, in home-field words only.</li>
            <li>Baseline: embed raw abstracts and search them.</li>
            <li>Structural: abstract each paper and the query, then search those abstractions with the home field excluded.</li>
            <li>Record whether the true source appears in the top 5 and top 10.</li>
            <li>Report all results, including losses.</li></ol></div>
        <div><h2 className="text-xl">Limits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>The source papers must exist in the corpus, or the test means nothing.</li>
            <li>Seven cases are a sanity check, not a statistical proof.</li>
            <li>Historical cases are known now. The query wording may leak hints.</li>
            <li>Abstraction quality depends on the language model used.</li></ul></div>
      </section>
    </>
  );
}
