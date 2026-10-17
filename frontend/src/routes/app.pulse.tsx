import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { btn, FIELD_FILL, FieldTag, MockTag, PageHeader, ScoreBar } from "@/components/lab";
import { cn } from "@/lib/utils";
import { getResults } from "@/lib/service";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/app/pulse")({ component: Pulse });

const C = 50;
const R = 34;

function Pulse() {
  const run = useStore((s) => s.run);
  const reduce = useStore((s) => s.reduceMotion);
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => { actions.ensureRun(); }, []);
  const items = useMemo(() => (run ? getResults(run) : []), [run]);

  useEffect(() => {
    if (view !== "map" || !svg.current) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (reduce) return;
      gsap.from(svg.current!.querySelectorAll(".edge"), { strokeDashoffset: 60, strokeDasharray: 60, duration: 0.7, stagger: 0.08, ease: "power2.out" });
      gsap.from(svg.current!.querySelectorAll(".node"), { autoAlpha: 0, duration: 0.4, stagger: 0.08, delay: 0.2, ease: "power1.out" });
    });
    return () => mm.revert();
  }, [view, items.length, reduce]);

  if (!run) return null;
  const sel = items.find((c) => c.id === selected);
  const pos = (i: number) => {
    const a = (-90 + (360 / items.length) * i) * (Math.PI / 180);
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };

  return (
    <>
      <PageHeader eyebrow="Pulse map" title="Your problem and its candidate collisions" aside={
        <div className="flex rounded-md border border-border bg-card p-0.5 text-sm" role="group" aria-label="View">
          {(["map", "list"] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={cn("rounded px-3 py-1", view === v && "bg-primary text-primary-foreground")}>{v === "map" ? "Map" : "List"}</button>)}
        </div>}>
        Lines show that the agent proposed a connection. Placement is for readability only: distance on this map has no calibrated meaning.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {view === "map" ? (
          <div className="rounded-lg bg-ink p-2 text-ink-foreground">
            <svg ref={svg} viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-[640px]" role="group" aria-label="Relationship map">
              {items.map((c, i) => { const p = pos(i); return <line key={c.id} className="edge" x1={C} y1={C} x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity={selected === c.id ? 0.9 : 0.3} strokeWidth={selected === c.id ? 0.5 : 0.25} />; })}
              <circle cx={C} cy={C} r="9" className="fill-primary stroke-ink-foreground" strokeWidth="0.4" />
              <text x={C} y={C - 0.5} textAnchor="middle" fontSize="2.6" className="fill-ink-foreground">Your problem</text>
              <text x={C} y={C + 3} textAnchor="middle" fontSize="2.2" className="fill-ink-muted">{run.input.homeFields[0]}</text>
              {items.map((c, i) => {
                const p = pos(i);
                const on = selected === c.id;
                return (
                  <g key={c.id} className="node cursor-pointer" tabIndex={0} role="button" aria-pressed={on} aria-label={`${c.title}, ${c.field}`}
                    onClick={() => setSelected(c.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(c.id))}>
                    <circle cx={p.x} cy={p.y} r="7" fill="transparent" />
                    <circle cx={p.x} cy={p.y} r={on ? 5 : 4} className={FIELD_FILL[c.field]} stroke={on ? "currentColor" : "none"} strokeWidth="0.6" />
                    <text x={p.x} y={p.y + 8} textAnchor="middle" fontSize="2.4" className="fill-ink-foreground">{c.field}</text>
                  </g>
                );
              })}
            </svg>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-ink-muted" aria-label="Legend">
              {[...new Set(items.map((c) => c.field))].map((f) => <li key={f} className="flex items-center gap-1.5"><svg width="10" height="10"><circle cx="5" cy="5" r="4" className={FIELD_FILL[f]} /></svg>{f}</li>)}
            </ul>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {items.map((c) => (
              <li key={c.id}><button onClick={() => setSelected(c.id)} aria-pressed={selected === c.id} className={cn("flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-secondary", selected === c.id && "bg-accent")}>
                <span><span className="block text-sm font-medium">{c.title}</span><span className="text-xs text-muted-foreground">{c.field}</span></span>
                <span className="font-mono text-xs">{c.mockScore}</span></button></li>
            ))}
          </ul>
        )}

        <aside className="lg:border-l lg:border-border lg:pl-8" aria-live="polite">
          {sel ? (
            <div className="animate-fade-up">
              <FieldTag field={sel.field} /> <MockTag>Demo score</MockTag>
              <h2 className="mt-3 text-xl">{sel.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{sel.explanation}</p>
              <div className="mt-4 max-w-40"><ScoreBar value={sel.mockScore} /></div>
              <div className="mt-5 flex gap-2">
                <Link to="/app/candidate/$id" params={{ id: sel.id }} className={btn.primary}>Open candidate</Link>
                <button className={btn.ghost} onClick={() => setSelected(null)}>Reset view</button>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Select a field node, or switch to the list, to inspect a candidate. On touch screens, tap a node or use the list.</p>}
        </aside>
      </div>
    </>
  );
}
