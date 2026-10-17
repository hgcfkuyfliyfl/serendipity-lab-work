/**
 * Mock service layer. Replace these implementations with calls to
 * POST /api/collide and GET /api/runs/{id}/stream without changing pages.
 */
import {
  ADJACENT,
  CANDIDATES,
  DECOMPOSITION,
  HERO_ABSTRACTION,
  HERO_TEXT,
  VALIDATION_CASES,
} from "./mock-data";
import { FIXED } from "./serendipity";
import {
  HERO_CANDIDATES,
  HERO_DELAYS,
  HERO_FIXTURE_ABSTRACTION,
  heroTrace,
  isHeroText,
} from "@/mock/hero";
import type { Candidate, CollisionInput, Field, Run, TraceEvent } from "./types";

export const STEP_MS = 1900;

/** Pure: which candidates survive home/adjacent exclusion and rank depth. */
export function selectCandidates(homeFields: Field[], excludedAdjacent: number, rankDepth: number) {
  const excluded = new Set<Field>(homeFields);
  for (const h of homeFields)
    ADJACENT[h].slice(0, excludedAdjacent).forEach((f) => excluded.add(f));
  const ranked = [...CANDIDATES].sort((a, b) => b.mockScore - a.mockScore).slice(0, rankDepth);
  const kept: Candidate[] = [];
  const rejected: { id: string; reason: string }[] = [];
  for (const c of ranked) {
    if (excluded.has(c.field))
      rejected.push({
        id: c.id,
        reason: homeFields.includes(c.field)
          ? `Same as home field (${c.field})`
          : `Adjacent field excluded by slider (${c.field})`,
      });
    else kept.push(c);
  }
  return { kept, rejected, excluded: [...excluded] };
}

function buildTrace(input: CollisionInput, keptCount: number, rejectedCount: number): TraceEvent[] {
  const s = input.serendipity;
  const steps: [string, string, string?][] = [
    [
      "Structural abstraction",
      `Removed domain vocabulary → "${HERO_ABSTRACTION.functional_problem}"`,
    ],
    [
      "Problem decomposition",
      `Split into ${DECOMPOSITION.length} sub-problems`,
      DECOMPOSITION.join(" · "),
    ],
    [
      "Cross-domain retrieval",
      `Searched structure space to rank ${s.rankDepth}, excluding ${input.homeFields.join(", ")}${s.excludedAdjacent ? ` + ${s.excludedAdjacent} adjacent field(s)` : ""}`,
    ],
    [
      "Skeptical peer review",
      `Reviewer challenged ${keptCount + rejectedCount} candidates; ${rejectedCount} filtered`,
    ],
    [
      "Search refinement",
      "Iteration 1 of max 2: tightened 'no central controller' constraint",
      "Second iteration not needed — enough candidates retained",
    ],
    ["Candidate ranking", `Ranked ${keptCount} candidates by mock structural score`],
    ["Hypothesis translation", "Translated mechanisms back into home-field language"],
    ["Results preparation", "Attached evidence, mappings and reviewer notes"],
  ];
  return steps.map(([step, message, detail], i) => ({
    id: `t${i}`,
    step,
    message,
    detail,
    state: "waiting" as const,
  }));
}

export function startCollisionRun(input: CollisionInput): Run {
  const { kept, rejected } = selectCandidates(
    input.homeFields,
    input.serendipity.excludedAdjacent,
    input.serendipity.rankDepth,
  );
  return {
    id: `run_${Date.now().toString(36)}`,
    input,
    status: "running",
    startedAt: Date.now(),
    trace: buildTrace(input, kept.length, rejected.length),
    resultIds: kept.map((c) => c.id),
    rejected,
    cachedFallback: input.text.trim() !== HERO_TEXT,
  };
}

/** Replay of the frozen hero fixture: contract trace events, then the five contract results. */
export function startFixtureRun(input: CollisionInput): Run {
  return {
    id: `run_${Date.now().toString(36)}`,
    input,
    status: "running",
    startedAt: Date.now(),
    trace: heroTrace(),
    resultIds: HERO_CANDIDATES.map((c) => c.id),
    rejected: [],
    cachedFallback: false,
    abstraction: HERO_FIXTURE_ABSTRACTION,
    candidates: HERO_CANDIDATES,
    fixture: true,
    delays: HERO_DELAYS,
  };
}

/** Advance the deterministic trace by one step. */
export function advanceRun(run: Run): Run {
  const trace = run.trace.map((e) => ({ ...e }));
  const runningIdx = trace.findIndex((e) => e.state === "running");
  if (runningIdx >= 0) {
    trace[runningIdx].state = "completed";
    if (!run.fixture) trace[runningIdx].elapsedMs = (runningIdx + 1) * STEP_MS;
  }
  const next = trace.findIndex((e) => e.state === "waiting");
  if (next >= 0) trace[next].state = "running";
  return { ...run, trace, status: next < 0 ? "completed" : "running" };
}

/** Instant replay of the hero run. This is the expected path on stage. */
export function getDemoRun(): Run {
  const run = startFixtureRun({ text: HERO_TEXT, homeFields: ["Robotics"], serendipity: FIXED });
  return {
    ...run,
    status: "completed",
    trace: run.trace.map((e) => ({ ...e, state: "completed" })),
  };
}
export { isHeroText };

const LIVE_KEY = "sl_live_candidates";
let liveMap: Map<string, Candidate> | null = null;
function liveCache() {
  if (!liveMap) {
    liveMap = new Map();
    try {
      const raw = localStorage.getItem(LIVE_KEY);
      if (raw) (JSON.parse(raw) as Candidate[]).forEach((c) => liveMap!.set(c.id, c));
    } catch {
      /* server render or blocked storage */
    }
  }
  return liveMap;
}
/** Remember live candidates so detail, saved and compare pages can find them after navigation. */
export function registerLive(cs: Candidate[]) {
  const m = liveCache();
  cs.forEach((c) => m.set(c.id, c));
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify([...m.values()].slice(-60)));
  } catch {
    /* storage blocked: kept in memory only */
  }
}
/** Other live candidates from the same run (same id prefix). */
export const liveSiblings = (id: string) => {
  const pre = id.slice(0, id.lastIndexOf("-") + 1);
  return [...liveCache().values()].filter((c) => c.id.startsWith(pre));
};
export const getCandidate = (id: string) =>
  HERO_CANDIDATES.find((c) => c.id === id) ??
  CANDIDATES.find((c) => c.id === id) ??
  liveCache().get(id);
export const getResults = (run: Run) =>
  run.candidates ?? run.resultIds.map((id) => getCandidate(id)!).filter(Boolean);
export const getValidationCases = () => VALIDATION_CASES;

export type ActivityKind = "search" | "open" | "read" | "infer" | "objection" | "dropped" | "kept";
export interface Activity {
  kind: ActivityKind;
  text: string;
}
const a = (kind: ActivityKind, text: string): Activity => ({ kind, text });

/** Simulated activity feed, one list per trace step. Built from the same fixtures as the results. */
function liveActivity(run: Run): Activity[][] {
  const cs = run.candidates ?? [];
  const abs = run.abstraction;
  const { excluded } = selectCandidates(
    run.input.homeFields,
    run.input.serendipity.excludedAdjacent,
    run.input.serendipity.rankDepth,
  );
  return [
    [
      a("infer", `Reading your problem (${run.input.text.trim().split(/\s+/).length} words)`),
      a(
        "infer",
        abs
          ? `Mechanism in neutral terms: ${abs.mechanism ?? "not stated"}`
          : "Stripping domain nouns...",
      ),
      a(
        "infer",
        abs ? `Functional problem: ${abs.functional_problem}` : "Waiting for the abstraction...",
      ),
    ],
    (abs?.constraints ?? []).map((c) => a("infer", `Constraint to respect: ${c}`)),
    [
      a(
        "search",
        `Asking Gemini for analogous mechanisms. Excluded fields: ${excluded.join(", ")}`,
      ),
      ...cs.flatMap((c) => [
        a("open", `Proposed "${c.title}" (${c.field})`),
        a("infer", c.explanation),
      ]),
    ],
    [
      ...cs.flatMap((c) => {
        const f = c.reviewer.failure[0];
        return f ? [a("objection", `Against "${c.title}": ${f}`)] : [];
      }),
      ...run.rejected.map((r) => a("dropped", `"${r.title ?? r.id}": ${r.reason}`)),
    ],
    [a("infer", `Refinement loops used: 0 of 2. ${cs.length} candidates survived review`)],
    cs.map((c) =>
      a(
        "kept",
        `${c.title}: model estimate ${c.mockScore}, reviewer ${c.reviewerConfidence ?? "n/a"}`,
      ),
    ),
    cs.map((c) =>
      a(
        "infer",
        `Mapped "${c.title}": ${c.mapping.map((m) => `${m.source} ~ ${m.home}`).join("; ")}`,
      ),
    ),
    [
      a(
        "infer",
        "Results are model-generated. No source passages were retrieved, so none are shown",
      ),
    ],
  ];
}

export function activityFor(run: Run): Activity[][] {
  if (run.liveStage === "pending" || run.liveStage === "done") return liveActivity(run);
  const kept = getResults(run);
  const top = kept.slice(0, 3);
  const words = run.input.text.trim().split(/\s+/).length;
  const home = run.input.homeFields.join(", ");
  return [
    [
      a("infer", `Reading your problem (${words} words)`),
      a(
        "infer",
        run.abstraction && run.cachedFallback
          ? `Dropping domain nouns. Mechanism in neutral terms: ${run.abstraction.mechanism ?? "not stated"}`
          : "Dropping domain nouns. Keeping the shape: many agents, local signals, sudden failures",
      ),
      a("infer", `Functional problem: ${(run.abstraction ?? HERO_ABSTRACTION).functional_problem}`),
      a(
        "infer",
        run.abstraction
          ? "Abstraction written by Gemini through the server (live call)"
          : (run.abstractionNote ?? "Waiting for the abstraction..."),
      ),
    ],
    run.abstraction && run.cachedFallback
      ? run.abstraction.constraints.map((c) => a("infer", `Constraint to respect: ${c}`))
      : DECOMPOSITION.map((d) => a("infer", `Sub-problem: ${d}`)),
    [
      a("search", `Searching the demo structure index. Home field excluded: ${home}`),
      a(
        "search",
        `Skimming demo abstracts from ${[...new Set(kept.map((c) => c.field))].join(", ")}`,
      ),
      ...top.flatMap((c) => [
        a("open", `Opened "${c.title}" (${c.field}, illustrative record)`),
        a(
          "read",
          c.source.passage
            ? `Passage: "${c.source.passage.slice(0, 120)}..."`
            : "No quotable passage found in this record",
        ),
        a(
          "infer",
          c.source.passage
            ? `Same shape as your problem: ${c.mapping[0]?.source ?? "local signal"} plays the role of ${c.mapping[0]?.home ?? "a route cost"}`
            : "Cannot confirm the match without a passage. Marking evidence as incomplete",
        ),
      ]),
      ...(kept.length > 1
        ? [
            a(
              "infer",
              `Sources disagree: "${kept[0]?.title}" assumes identical agents, "${kept[kept.length - 1]?.title}" assumes agents that react to incentives`,
            ),
          ]
        : []),
    ],
    [
      ...kept.flatMap((c) => {
        const f = c.reviewer.failure[0];
        return f ? [a("objection", `Against "${c.title}": ${f}`)] : [];
      }),
      ...run.rejected.map((r) =>
        a("dropped", `"${getCandidate(r.id)?.title ?? r.id}": ${r.reason}`),
      ),
    ],
    [
      a("infer", "Two objections hit the same weak point: no central controller in the source"),
      a("search", "Re-querying with that constraint made explicit (loop 1 of 2)"),
      a("infer", "Enough candidates kept. Loop 2 not needed"),
    ],
    kept.slice(0, 4).map((c) => a("kept", `${c.title}: demo score ${c.mockScore}`)),
    top.map((c) => a("infer", `Mapping "${c.title}" back into ${home} language`)),
    [a("infer", "Attaching passages, mapping tables and reviewer notes to each result")],
  ];
}
