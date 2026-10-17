import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, FileWarning, Info } from "lucide-react";
import { toast } from "sonner";
import antImg from "@/assets/ant.jpg";
import {
  btn,
  copyText,
  EmptyState,
  FieldTag,
  MockTag,
  priorArtLabel,
  ReviewBadge,
  SaveButton,
  ScoreBar,
} from "@/components/lab";
import { HERO_ABSTRACTION, HERO_TEXT } from "@/lib/mock-data";
import { getCandidate } from "@/lib/service";
import { CANDIDATES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/candidate/$id")({ component: Inspector });

function Block({ title, items, open }: { title: string; items: string[]; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-ink-line py-3">
      <summary className="cursor-pointer text-sm font-medium marker:text-ochre">{title}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </details>
  );
}

function Inspector() {
  const { id } = Route.useParams();
  const draft = useStore((s) => s.draft);
  const c = getCandidate(id);
  if (!c)
    return (
      <EmptyState
        title="Candidate not found"
        action={
          <Link to="/app/results" className={btn.primary}>
            Back to results
          </Link>
        }
      >
        This idea is not in the demo data.
      </EmptyState>
    );
  const problem = draft.text || HERO_TEXT;

  return (
    <>
      <Link to="/app/results" className={`${btn.ghost} -ml-4 mb-4`}>
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Why this collided</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{c.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FieldTag field={c.field} />
            <ReviewBadge status={c.reviewStatus} />
            <MockTag>Demo data</MockTag>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveButton id={c.id} />
          <button className={btn.secondary} onClick={() => copyText(c.hypothesis, (m) => toast(m))}>
            <Copy className="h-4 w-4" />
            Copy hypothesis
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl">The connection</h2>
            <dl className="mt-3 grid gap-5 text-sm md:grid-cols-2">
              <div>
                <dt className="eyebrow">Your problem</dt>
                <dd className="mt-1">{problem}</dd>
              </div>
              <div>
                <dt className="eyebrow">Structural abstraction</dt>
                <dd className="mt-1 text-muted-foreground">
                  {HERO_ABSTRACTION.functional_problem}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-l-2 border-primary pl-3">
              <span className="eyebrow block">Proposed hypothesis (interpretation)</span>
              {c.hypothesis}
            </p>
          </section>

          <section>
            <h2 className="text-xl">Source evidence</h2>
            {c.source.passage ? (
              <figure className="evidence mt-3 p-5">
                <figcaption className="eyebrow mb-2 flex items-center gap-2">
                  Source passage <MockTag>Illustrative, not verified</MockTag>
                </figcaption>
                <blockquote className="font-serif text-lg leading-relaxed">
                  “{c.source.passage}”
                </blockquote>
                <p className="mt-3 text-xs text-muted-foreground">{c.source.citation}</p>
                {c.image === "ant" && (
                  <img
                    src={antImg}
                    alt="An ant walking on sand"
                    width={944}
                    height={704}
                    loading="lazy"
                    className="mt-4 h-32 w-48 rounded-md object-cover"
                  />
                )}
              </figure>
            ) : (
              <div
                role="status"
                className="mt-3 flex gap-3 rounded-md border border-dashed border-terracotta/60 bg-card p-5 text-sm"
              >
                <FileWarning className="h-5 w-5 shrink-0 text-terracotta" aria-hidden />
                <div>
                  <p className="font-medium">Incomplete evidence</p>
                  <p className="mt-1 text-muted-foreground">
                    No source passage was retrieved. A real run would drop this suggestion. It is
                    kept here only so you can see the state. Treat the mapping below as unverified.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl">
              Concept mapping <MockTag>Illustrative</MockTag>
            </h2>
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    <th scope="col" className="p-3 font-medium">
                      Source concept ({c.field})
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Home-field concept
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.mapping.map((m) => (
                    <tr key={m.source} className="border-t border-border">
                      <td className="p-3">{m.source}</td>
                      <td className="p-3 text-muted-foreground">{m.home}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl">Prior-art status</h2>
            <p className="mt-2 text-sm">
              <span className="font-medium">{priorArtLabel[c.priorArt]}.</span>{" "}
              <span className="text-muted-foreground">{c.priorArtNote}</span>
            </p>
            <p className="mt-2 flex gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" aria-hidden />
              This is mock status for the demo. It is not a real novelty determination.
            </p>
          </section>

          <section>
            <h2 className="text-xl">Other candidates</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {CANDIDATES.filter((x) => x.id !== c.id).map((x) => (
                <li key={x.id}>
                  <Link
                    to="/app/candidate/$id"
                    params={{ id: x.id }}
                    className="block rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/50"
                  >
                    {x.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit self-start rounded-lg bg-ink p-6 text-ink-foreground lg:sticky lg:top-20">
          <h2 className="text-xl">Skeptical reviewer</h2>
          <div className="mt-3 flex gap-6">
            <ScoreBar value={c.mockScore} label="Demo score" />
            <ScoreBar value={c.reviewerConfidence} label="Confidence" />
          </div>
          <p className="mt-4 text-sm text-ink-muted">{c.reviewer.useful}</p>
          <div className="mt-3">
            <Block title="Mechanisms that look similar" items={c.reviewer.similar} open />
            <Block title="Assumptions required" items={c.reviewer.assumptions} />
            <Block title="Where it may fail" items={c.reviewer.failure} open />
            <Block title="Investigate next" items={c.reviewer.next} />
          </div>
          <p className="mt-4 font-mono text-[10px] text-ink-muted">
            Reviewer notes are demo content and express real uncertainty. Expert judgment is
            required.
          </p>
        </aside>
      </div>
    </>
  );
}
