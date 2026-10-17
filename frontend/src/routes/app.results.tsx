import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck2, FileWarning } from "lucide-react";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  btn,
  EmptyState,
  FieldTag,
  MockTag,
  PageHeader,
  priorArtLabel,
  ReviewBadge,
  SaveButton,
  ScoreBar,
} from "@/components/lab";
import { MiniGraph } from "@/components/mini-graph";
import { ADJACENT } from "@/lib/mock-data";
import { getResults } from "@/lib/service";
import { actions, useStore } from "@/lib/store";
import type { ReviewStatus } from "@/lib/types";

export const Route = createFileRoute("/app/results")({ component: Results });

const sel = "h-9 rounded-md border border-input bg-card px-2 text-sm";

function Results() {
  const run = useStore((s) => s.run);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        autoAlpha: 0,
        y: 14,
        duration: 0.45,
        stagger: 0.07,
        ease: "power2.out",
      });
    }, el);
    return () => ctx.revert();
  }, [run]);

  useEffect(() => {
    const el = statRef.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
        const end = Number(n.dataset.count);
        if (calm) return void (n.textContent = String(end));
        const o = { v: 0 };
        gsap.to(o, {
          v: end,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => (n.textContent = String(Math.round(o.v))),
        });
      });
    }, el);
    return () => ctx.revert();
  }, [run]);

  useEffect(() => {
    actions.ensureRun();
  }, []);
  const [hot, setHot] = useState<string | null>(null);
  const statRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState("all");
  const [status, setStatus] = useState<"all" | ReviewStatus>("all");
  const [evidence, setEvidence] = useState<"all" | "complete" | "incomplete">("all");
  const [sort, setSort] = useState<"score" | "confidence">("score");

  const all = useMemo(() => (run ? getResults(run) : []), [run]);
  const shown = useMemo(
    () =>
      all
        .filter(
          (c) =>
            (field === "all" || c.field === field) &&
            (status === "all" || c.reviewStatus === status) &&
            (evidence === "all" || (evidence === "complete") === !!c.source.passage),
        )
        .sort((a, b) =>
          sort === "score"
            ? b.mockScore - a.mockScore
            : b.reviewerConfidence - a.reviewerConfidence,
        ),
    [all, field, status, evidence, sort],
  );
  if (!run) return null;
  const home = run.input.homeFields[0];
  const fields = [...new Set(all.map((c) => c.field))];

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title={`${all.length} cross-domain candidates`}
        aside={<MockTag>Scores are demo values</MockTag>}
      >
        Home field excluded: {run.input.homeFields.join(", ")}. Level: {run.input.serendipity.level}
        .{" "}
        {run.rejected.length > 0 &&
          `${run.rejected.length} candidates were dropped by the exclusion rules.`}
      </PageHeader>

      <div ref={statRef} className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Candidates", all.length],
          ["Fields reached", fields.length],
          ["With source passage", all.filter((c) => c.source.passage).length],
          ["Contested", all.filter((c) => c.reviewStatus === "contested").length],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-card p-3">
            <div className="font-serif text-3xl leading-none" data-count={v}>
              0
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>

      <form
        className="mb-6 flex flex-wrap items-end gap-4 text-sm"
        aria-label="Filter and sort"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="grid gap-1">
          Source field
          <select className={sel} value={field} onChange={(e) => setField(e.target.value)}>
            <option value="all">All fields</option>
            {fields.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Reviewer status
          <select
            className={sel}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">Any</option>
            <option value="supported">Supported</option>
            <option value="plausible">Plausible</option>
            <option value="contested">Contested</option>
          </select>
        </label>
        <label className="grid gap-1">
          Evidence
          <select
            className={sel}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value as typeof evidence)}
          >
            <option value="all">Any</option>
            <option value="complete">Source passage found</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <label className="grid gap-1">
          Sort by
          <select
            className={sel}
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="score">Demo structural score</option>
            <option value="confidence">Reviewer confidence</option>
          </select>
        </label>
      </form>

      {shown.length === 0 ? (
        <EmptyState
          title="No candidates match these filters"
          action={
            <button
              className={btn.secondary}
              onClick={() => {
                setField("all");
                setStatus("all");
                setEvidence("all");
              }}
            >
              Clear filters
            </button>
          }
        >
          Loosen a filter, or raise the Serendipity Slider on Discover to explore further down the
          ranked list.
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ul ref={listRef} className="divide-y divide-border border-y border-border">
            {shown.map((c) => {
              const adjacent = ADJACENT[home]?.includes(c.field);
              return (
                <li
                  key={c.id}
                  onMouseEnter={() => setHot(c.id)}
                  onMouseLeave={() => setHot(null)}
                  className={`grid gap-4 px-2 py-6 transition-colors md:grid-cols-[1fr_9rem] ${hot === c.id ? "bg-secondary" : ""}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FieldTag field={c.field} />
                      <span className="text-xs text-muted-foreground">
                        {adjacent ? `Adjacent to ${home}` : `Distant from ${home}`}
                      </span>
                      <ReviewBadge status={c.reviewStatus} />
                    </div>
                    <h2 className="mt-2 text-xl">
                      <Link
                        to="/app/candidate/$id"
                        params={{ id: c.id }}
                        className="hover:underline"
                      >
                        {c.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{c.explanation}</p>
                    <p className="mt-3 border-l-2 border-primary pl-3 text-sm">
                      <span className="font-medium">What if: </span>
                      {c.hypothesis}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {c.source.passage ? (
                          <FileCheck2 className="h-3.5 w-3.5 text-forest" aria-hidden />
                        ) : (
                          <FileWarning className="h-3.5 w-3.5 text-terracotta" aria-hidden />
                        )}
                        {c.source.passage ? "Source passage (illustrative)" : "Evidence incomplete"}
                      </span>
                      <span>Prior art: {priorArtLabel[c.priorArt]}</span>
                      {c.tags.map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-row items-start justify-between gap-3 md:flex-col md:items-stretch">
                    <ScoreBar value={c.mockScore} label="Demo score" />
                    <ScoreBar value={c.reviewerConfidence} label="Reviewer conf." />
                    <div className="flex items-center gap-1">
                      <Link to="/app/candidate/$id" params={{ id: c.id }} className={btn.primary}>
                        Why?
                      </Link>
                      <SaveButton id={c.id} compact />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside
            aria-label="Live map"
            className="h-fit rounded-lg bg-ink p-4 text-ink-foreground lg:sticky lg:top-6"
          >
            <h2 className="text-sm font-medium">Live map</h2>
            <p className="text-xs text-ink-muted">
              Hover a node to find its card. Demo layout only.
            </p>
            <MiniGraph
              items={shown}
              hot={hot}
              onHot={setHot}
              label={`${shown.length} candidates linked to your problem`}
            />
            <ul className="mt-2 grid gap-1 text-xs text-ink-muted">
              {fields.map((f) => (
                <li key={f} className="flex justify-between">
                  <span>{f}</span>
                  <span className="font-mono">{shown.filter((c) => c.field === f).length}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
