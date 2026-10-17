import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FIELD_FILL } from "@/components/lab";

type Item = { id: string; field: string; mockScore: number };
const C = 50;
const R = 32;
const pos = (i: number, n: number) => {
  const a = (-90 + (360 / n) * i) * (Math.PI / 180);
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
};

/** Small live graph: drifting nodes, pulses along edges. Hover a node to highlight its card. */
export function MiniGraph({
  items,
  hot,
  onHot,
  label,
}: {
  items: Item[];
  hot: string | null;
  onHot: (id: string | null) => void;
  label: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const n = items.length;
  useEffect(() => {
    const el = svg.current;
    if (!el || !n) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...el.querySelectorAll<SVGGElement>("[data-n]")];
    const edges = [...el.querySelectorAll<SVGLineElement>("[data-e]")];
    const dots = [...el.querySelectorAll<SVGCircleElement>("[data-d]")];
    const off = nodes.map(() => ({ x: 0, y: 0 }));
    const prog = nodes.map(() => ({ t: 0 }));
    const draw = () =>
      nodes.forEach((g, i) => {
        const o = off[i]!;
        const pr = prog[i]!;
        const b = pos(i, n);
        const x = b.x + o.x;
        const y = b.y + o.y;
        g.setAttribute("transform", `translate(${o.x} ${o.y})`);
        edges[i]!.setAttribute("x2", String(x));
        edges[i]!.setAttribute("y2", String(y));
        dots[i]!.setAttribute("cx", String(C + (x - C) * pr.t));
        dots[i]!.setAttribute("cy", String(C + (y - C) * pr.t));
        dots[i]!.setAttribute("opacity", String(calm ? 0 : Math.sin(Math.PI * pr.t)));
      });
    const ctx = gsap.context(() => {
      const amp = calm ? 0.5 : 1.8;
      off.forEach((o, i) =>
        gsap.to(o, {
          x: i % 2 ? amp : -amp,
          y: i % 3 ? -amp : amp,
          duration: (calm ? 5 : 2.4) + i * 0.3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        }),
      );
      if (calm) return;
      prog.forEach((p, i) =>
        gsap.to(p, {
          t: 1,
          duration: 1.3,
          ease: "power1.inOut",
          repeat: -1,
          repeatDelay: 0.4 + i * 0.2,
          delay: i * 0.25,
        }),
      );
    }, el);
    draw();
    gsap.ticker.add(draw);
    return () => {
      gsap.ticker.remove(draw);
      ctx.revert();
    };
  }, [n]);

  return (
    <svg ref={svg} viewBox="0 0 100 100" className="w-full" role="img" aria-label={label}>
      {items.map((c) => (
        <line
          key={c.id}
          data-e=""
          x1={C}
          y1={C}
          x2={C}
          y2={C}
          stroke="currentColor"
          strokeOpacity={hot === c.id ? 0.9 : 0.3}
          strokeWidth={hot === c.id ? 0.6 : 0.3}
        />
      ))}
      {items.map((c) => (
        <circle key={c.id} data-d="" r="1" cx={C} cy={C} opacity="0" fill="currentColor" />
      ))}
      <circle cx={C} cy={C} r="6" className="fill-primary" />
      <text x={C} y={C + 1} textAnchor="middle" fontSize="2.6" className="fill-ink-foreground">
        You
      </text>
      {items.map((c, i) => {
        const p = pos(i, n);
        return (
          <g
            key={c.id}
            data-n=""
            tabIndex={0}
            onMouseEnter={() => onHot(c.id)}
            onMouseLeave={() => onHot(null)}
            onFocus={() => onHot(c.id)}
            onBlur={() => onHot(null)}
          >
            <circle cx={p.x} cy={p.y} r="7" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={(hot === c.id ? 1.2 : 0) + 2.5 + Math.min(c.mockScore, 100) / 45}
              className={FIELD_FILL[c.field]}
            />
            <text
              x={p.x}
              y={p.y + 6.5}
              textAnchor="middle"
              fontSize="2.4"
              className="fill-ink-foreground"
            >
              {c.field}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
