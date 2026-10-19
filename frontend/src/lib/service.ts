/**
 * Service layer. The hero text replays the frozen fixture in src/mock. Any other text goes to
 * Gemini (general knowledge, no corpus). Replace with POST /api/collide and the SSE stream
 * without changing pages.
 */
import { HERO_TEXT, VALIDATION_CASES } from "./mock-data";
import { FIXED } from "./serendipity";
import {
  HERO_CANDIDATES,
  HERO_DELAYS,
  HERO_FIXTURE_ABSTRACTION,
  heroTrace,
  isHeroInput,
  isHeroText,
} from "@/mock/hero";
import type { Candidate, CollisionInput, Run, TraceEvent } from "./types";

export const STEP_MS = 1900;
export { isHeroInput, isHeroText };

/** Only the home field is excluded. There is no slider in the locked contract. */
export const excludedFields = (home: CollisionInput["homeFields"]) => [...new Set(home)];

/** Steps that really happen in a live run. Nothing is claimed beyond two Gemini calls. */
function buildLiveTrace(input: CollisionInput): TraceEvent[] {
  const home = input.homeFields.join(", ");
  const steps: [string, string][] = [
    ["Structural abstraction", "Asking Gemini to restate your problem without domain words"],
    [
      "Candidate generation",
      `Asking Gemini for analogous mechanisms outside ${home}. No paper corpus is searched`,
    ],
    ["Skeptical review", "A second Gemini call challenges each candidate"],
    ["Ranking", "Ordering by the model's own estimate. Not a measured score"],
    ["Results preparation", "Marking every result as ungrounded: no source passage is retrieved"],
  ];
  return steps.map(([step, message], i) => ({
    id: `t${i}`,
    step,
    message,
    state: "waiting" as const,
  }));
}

/** Live run (non-hero text). Starts with no results, so nothing unrelated can show. */
export function startCollisionRun(input: CollisionInput): Run {
  return {
    id: `run_${Date.now().toString(36)}`,
    input,
    status: "running",
    startedAt: Date.now(),
    trace: buildLiveTrace(input),
    resultIds: [],
    rejected: [],
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
    abstraction: HERO_FIXTURE_ABSTRACTION,
    candidates: HERO_CANDIDATES,
    fixture: true,
    delays: HERO_DELAYS,
  };
}

/** Advance the trace by one step. */
export function advanceRun(run: Run): Run {
  const trace = run.trace.map((e) => ({ ...e }));
  const runningIdx = trace.findIndex((e) => e.state === "running");
  const cur = trace[runningIdx];
  if (cur) {
    cur.state = "completed";
    if (!run.fixture) cur.elapsedMs = (runningIdx + 1) * STEP_MS;
  }
  const nextIdx = trace.findIndex((e) => e.state === "waiting");
  const nxt = trace[nextIdx];
  if (nxt) nxt.state = "running";
  return { ...run, trace, status: nextIdx < 0 ? "completed" : "running" };
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
/** Remember live candidates so detail and saved pages can find them after navigation. */
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
  HERO_CANDIDATES.find((c) => c.id === id) ?? liveCache().get(id);
export const getResults = (run: Run) => run.candidates ?? [];
export const getValidationCases = () => VALIDATION_CASES;

/** Evidence rule: a suggestion is grounded only with a source passage AND a mapping. */
export const isGrounded = (c: Candidate) => !!c.source.passage && c.mapping.length > 0;

export type ActivityKind = "search" | "open" | "read" | "infer" | "objection" | "dropped" | "kept";
export interface Activity {
  kind: ActivityKind;
  text: string;
}
const a = (kind: ActivityKind, text: string): Activity => ({ kind, text });

/** Feed for live runs, one list per live trace step. Every line comes from the Gemini responses. */
export function activityFor(run: Run): Activity[][] {
  const cs = run.candidates ?? [];
  const abs = run.abstraction;
  const home = run.input.homeFields.join(", ");
  return [
    [
      a("infer", `Reading your problem (${run.input.text.trim().split(/\s+/).length} words)`),
      a(
        "infer",
        abs
          ? `Functional problem: ${abs.functional_problem}`
          : (run.abstractionNote ?? "Waiting for Gemini's abstraction..."),
      ),
      ...(abs?.mechanism ? [a("infer", `Mechanism: ${abs.mechanism}`)] : []),
      ...(abs?.constraints ?? []).map((c) => a("infer", `Constraint to respect: ${c}`)),
    ],
    [
      a("search", `Asking Gemini for analogous mechanisms. Home field excluded: ${home}`),
      ...cs.flatMap((c) => [
        a("open", `Proposed "${c.title}" (${c.field})`),
        ...(c.explanation ? [a("infer", c.explanation)] : []),
      ]),
    ],
    [
      ...cs.flatMap((c) => {
        const f = c.reviewer.failure[0];
        return f ? [a("objection", `Against "${c.title}": ${f}`)] : [];
      }),
      ...run.rejected.map((r) => a("dropped", `"${r.title ?? r.id}": ${r.reason}`)),
      a("infer", "No refinement loop runs in live mode. This is a single pass"),
    ],
    cs.map((c) =>
      a(
        "kept",
        `${c.title}: model estimate ${c.mockScore}${c.reviewerConfidence !== undefined ? `, reviewer ${c.reviewerConfidence}` : ""}`,
      ),
    ),
    [a("infer", "Gemini quotes no source passage, so every result stays marked as ungrounded")],
  ];
}
