import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FileSearch, Info, ShieldQuestion, Waypoints, X } from "lucide-react";
import antImg from "@/assets/ant.jpg";
import trafficImg from "@/assets/traffic.jpg";
import { btn, Logo } from "@/components/lab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Serendipity Lab — Different fields. Same problems." },
      {
        name: "description",
        content:
          "An AI research agent that matches problems by structure, not keywords, to surface evidence-grounded ideas from other fields.",
      },
      { property: "og:title", content: "Serendipity Lab — Different fields. Same problems." },
      {
        property: "og:description",
        content:
          "Structural matching across research fields, with evidence and a skeptical reviewer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NODES = [
  { label: "Biology", x: 70, y: 14, c: "fill-forest" },
  { label: "Computer Science", x: 90, y: 40, c: "fill-primary" },
  { label: "Medicine", x: 84, y: 76, c: "fill-terracotta" },
  { label: "Ecology", x: 56, y: 92, c: "fill-forest" },
  { label: "Physics", x: 16, y: 72, c: "fill-ochre" },
  { label: "Engineering", x: 14, y: 28, c: "fill-terracotta" },
];

const MESH = NODES.flatMap((_, i) =>
  [1, 2].filter((k) => i + k < NODES.length).map((k) => [i, i + k] as const),
);

function Hub() {
  const svg = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const off = NODES.map(() => ({ x: 0, y: 0 }));
      const prog = NODES.map(() => ({ t: 0 }));
      const all = <T extends Element>(s: string) => Array.from(el.querySelectorAll<T>(s));
      const groups = all<SVGGElement>("[data-node]");
      const spokes = all<SVGLineElement>("[data-spoke]");
      const webs = all<SVGLineElement>("[data-web]");
      const dots = all<SVGCircleElement>("[data-dot]");
      const set = (e: Element, a: Record<string, number | string>) =>
        Object.entries(a).forEach(([k, v]) => e.setAttribute(k, String(v)));

      const draw = () => {
        NODES.forEach((n, i) => {
          const x = n.x + off[i].x,
            y = n.y + off[i].y,
            t = prog[i].t;
          set(groups[i], { transform: `translate(${off[i].x} ${off[i].y})` });
          set(spokes[i], { x2: x, y2: y });
          set(dots[i], { cx: 50 + (x - 50) * t, cy: 52 + (y - 52) * t });
          dots[i].style.opacity = t > 0 && t < 1 ? "1" : "0";
        });
        webs.forEach((w, k) => {
          const [a, b] = MESH[k];
          set(w, {
            x1: NODES[a].x + off[a].x,
            y1: NODES[a].y + off[a].y,
            x2: NODES[b].x + off[b].x,
            y2: NODES[b].y + off[b].y,
          });
        });
      };
      gsap.ticker.add(draw);

      NODES.forEach((_, i) => {
        gsap.to(off[i], {
          x: i % 2 ? 2.2 : -2.2,
          y: i % 3 === 0 ? 2.2 : -2.2,
          duration: 3 + i * 0.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to(prog[i], {
          t: 1,
          duration: 1.6,
          ease: "power1.inOut",
          repeat: -1,
          repeatDelay: 2.4 + i * 0.35,
          delay: 1 + i * 0.5,
        });
      });
      gsap.from(groups, { autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: "power1.out" });
      gsap.fromTo(
        el.querySelector("[data-ring]"),
        { attr: { r: 10 }, opacity: 0.6 },
        { attr: { r: 18 }, opacity: 0, duration: 2.4, repeat: -1, ease: "power1.out" },
      );
      return () => gsap.ticker.remove(draw);
    });
    return () => mm.revert();
  }, []);

  return (
    <svg
      ref={svg}
      viewBox="0 0 100 100"
      className="h-full w-full overflow-visible"
      role="group"
      aria-label="Diagram: one problem connecting to six research fields"
    >
      {MESH.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          data-web
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          className="stroke-border"
          strokeWidth="0.2"
          strokeDasharray="1 1"
        />
      ))}
      {NODES.map((n, i) => (
        <line
          key={n.label}
          data-spoke
          x1="50"
          y1="52"
          x2={n.x}
          y2={n.y}
          strokeWidth={active === i ? 0.8 : 0.4}
          className={`animate-draw transition-colors ${active === i ? "stroke-primary" : "stroke-border"}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
      <circle
        data-ring
        cx="50"
        cy="52"
        r="10"
        fill="none"
        className="stroke-primary"
        strokeWidth="0.4"
        opacity="0"
      />
      {NODES.map((n, i) => (
        <circle
          key={n.label + "d"}
          data-dot
          cx="50"
          cy="52"
          r="0.9"
          className="fill-terracotta"
          style={{ opacity: 0 }}
        />
      ))}
      <circle cx="50" cy="52" r="10" className="fill-primary" />
      <path
        d="M50 46 L45 57 L55 57 Z"
        className="stroke-primary-foreground"
        fill="none"
        strokeWidth="0.8"
      />
      {NODES.map((n, i) => (
        <g
          key={n.label + "n"}
          data-node
          tabIndex={0}
          aria-label={n.label}
          className="cursor-pointer outline-none"
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        >
          <circle cx={n.x} cy={n.y} r="7" fill="transparent" />
          <circle cx={n.x} cy={n.y} r={active === i ? 5 : 4} className={`${n.c} transition-[r]`} />
          <text
            x={n.x}
            y={n.y + 8}
            textAnchor="middle"
            className="fill-foreground font-sans"
            fontSize="3.4"
            fontWeight={active === i ? 600 : 400}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex" aria-label="Main">
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <Link to="/app/compare" className="hover:text-foreground">
            Examples
          </Link>
          <Link to="/app/validation" className="hover:text-foreground">
            Validation
          </Link>
        </nav>
        <Link to="/app/discover" className={btn.primary}>
          Get started
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-10 md:grid-cols-[1.1fr_1fr]">
        <div className="animate-fade-up">
          <p className="eyebrow mb-5">Research / Discovery / AI agents</p>
          <h1 className="text-5xl leading-[1.02] md:text-7xl">
            Different fields.
            <br />
            Same problems.
            <br />
            <em className="text-primary">New possibilities.</em>
          </h1>
          <p className="mt-6 max-w-md text-muted-foreground">
            Serendipity Lab finds solutions in fields you wouldn't search, by matching the{" "}
            <strong className="font-medium text-foreground">structure</strong> of a problem rather
            than its keywords.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app/discover" className={btn.primary}>
              Start discovering <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/app/trace" search={{ demo: true }} className={btn.secondary}>
              Explore the demo
            </Link>
          </div>
        </div>
        <div className="aspect-square max-h-[460px] w-full">
          <Hub />
        </div>
      </section>

      <section id="how" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
            {[
              ["Abstract", "Remove domain words and keep the underlying problem structure."],
              ["Search", "Look in other fields for the same structure, excluding your own."],
              ["Review", "A skeptical reviewer challenges weak matches and checks prior art."],
              ["Discover", "Get hypotheses grounded in source passages, with clear caveats."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-card p-6">
                <span className="font-mono text-xs text-terracotta">0{i + 1}</span>
                <h3 className="mt-3 text-xl">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Worked example</p>
        <h2 className="mt-2 text-3xl">From traffic routing to ant foraging</h2>
        <div className="mt-8 grid items-center gap-6 md:grid-cols-[auto_auto_1fr]">
          <div className="flex items-center gap-3">
            <img
              src={trafficImg}
              alt="Aerial view of a city grid"
              width={944}
              height={704}
              loading="lazy"
              className="h-28 w-36 rounded-md object-cover"
            />
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <img
              src={antImg}
              alt="An ant on sand"
              width={944}
              height={704}
              loading="lazy"
              className="h-28 w-36 rounded-md object-cover"
            />
          </div>
          <div className="hidden h-24 w-px bg-border md:block" />
          <dl className="grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow">Your problem</dt>
              <dd className="mt-2">
                Optimizing traffic routing through a city grid during accidents.
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Structural match</dt>
              <dd className="mt-2 text-muted-foreground">
                Decentralized rerouting of flow through a network when nodes fail, without central
                coordination.
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Cross-domain idea</dt>
              <dd className="mt-2">Ant foraging and pheromone-based path reinforcement.</dd>
              <Link
                to="/app/candidate/$id"
                params={{ id: "ant-pheromone" }}
                className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                See the evidence <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 md:grid-cols-3">
        {[
          [
            FileSearch,
            "Evidence you can inspect",
            "Every suggestion points to a source passage and a concept mapping.",
          ],
          [
            ShieldQuestion,
            "A skeptical reviewer",
            "An agent lists assumptions, failure modes and what to test next.",
          ],
          [
            Waypoints,
            "Not just your field",
            "Your home field is excluded, so you see genuinely new connections.",
          ],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof FileSearch;
          return (
            <div key={t as string} className="border-t-2 border-primary pt-5">
              <I className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-lg">{t as string}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-3xl">Topic search vs. structural matching</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr_0.9fr]">
          <ul className="space-y-3 rounded-lg border border-border bg-card p-6 text-sm">
            <li className="eyebrow">Topic-based search</li>
            {["Stays within your field", "Matches keywords", "Good at finding known work"].map(
              (t) => (
                <li key={t} className="flex gap-2">
                  <X className="h-4 w-4 text-terracotta" />
                  {t}
                </li>
              ),
            )}
          </ul>
          <ul className="space-y-3 rounded-lg border border-border bg-card p-6 text-sm">
            <li className="eyebrow">Structural matching</li>
            {[
              "Finds cross-domain analogies",
              "Focuses on problem structure",
              "Explains each connection",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="h-4 w-4 text-forest" />
                {t}
              </li>
            ))}
          </ul>
          <div className="rounded-lg bg-accent p-6 text-sm">
            <Info className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Important to know</p>
            <p className="mt-1 text-muted-foreground">
              Suggestions are starting points, not answers. Human judgment is essential, and this
              prototype runs on clearly labelled demonstration data.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <div>
            <Logo inverted />
            <p className="mt-1 text-sm text-ink-muted">Better questions. Broader perspectives.</p>
          </div>
          <p className="font-mono text-xs text-ink-muted">
            © 2026 Serendipity Lab · Built for curious minds
          </p>
        </div>
      </footer>
    </div>
  );
}
