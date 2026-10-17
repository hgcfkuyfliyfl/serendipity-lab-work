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
import { LEVELS } from "./serendipity";
import type { Candidate, CollisionInput, Field, Run, TraceEvent } from "./types";

export const STEP_MS = 650;

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
    ["Prior-art check", "Checked home-field literature (demo fixtures only)"],
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

/** Advance the deterministic trace by one step. */
export function advanceRun(run: Run): Run {
  const trace = run.trace.map((e) => ({ ...e }));
  const runningIdx = trace.findIndex((e) => e.state === "running");
  if (runningIdx >= 0) {
    trace[runningIdx].state = "completed";
    trace[runningIdx].elapsedMs = (runningIdx + 1) * STEP_MS;
  }
  const next = trace.findIndex((e) => e.state === "waiting");
  if (next >= 0) trace[next].state = "running";
  return { ...run, trace, status: next < 0 ? "completed" : "running" };
}

export function getDemoRun(): Run {
  const run = startCollisionRun({
    text: HERO_TEXT,
    homeFields: ["Civil Engineering"],
    serendipity: LEVELS.balanced,
  });
  return {
    ...run,
    status: "completed",
    trace: run.trace.map((e, i) => ({ ...e, state: "completed", elapsedMs: (i + 1) * STEP_MS })),
  };
}

export const getCandidate = (id: string) => CANDIDATES.find((c) => c.id === id);
export const getResults = (run: Run) =>
  run.resultIds.map((id) => getCandidate(id)!).filter(Boolean);
export const getValidationCases = () => VALIDATION_CASES;
