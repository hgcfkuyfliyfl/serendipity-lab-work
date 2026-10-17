/**
 * Adapter for the Hour-2 contract fixture (hero_run.json). Shapes only: the scores,
 * heresy labels, reviewer notes and hypotheses in it are placeholders written by the
 * contract owner. Real output replaces this file's data, not its shape.
 */
import heroRun from "./hero_run.json";
import type { Abstraction, Candidate, Field, TraceEvent } from "@/lib/types";

/** The frozen contract, spelled out so JSON inference cannot widen it. */
interface TraceEv {
  type: "trace";
  step: string;
  message: string;
  ts: number;
  meta?: { task: string; cached: boolean; attempt: number; ms: number };
}
interface ResultEv {
  type: "result";
  id: string;
  title: string;
  year?: number | string;
  venue?: string | null;
  doi?: string;
  source_field: string;
  structural_score: number;
  matched_on: "problem" | "mechanism";
  heresy: "low" | "medium" | "high";
  hypothesis: string;
  source_passage: string | null;
  mapping: { source_concept: string; home_concept: string }[];
  reviewer_note: string | null;
}
interface DoneEv {
  type: "done";
  run_id: string;
  ts: number;
  results_shown: number;
  candidates_reviewed: number;
  loops_used: number;
}
type Ev = TraceEv | ResultEv | DoneEv;
const stream = heroRun.stream as unknown as Ev[];

const FIELD: Record<string, Field> = {
  soft_matter_stat_physics: "Soft Matter Physics",
  robotics_mech_eng: "Robotics",
  materials_fluids_aero: "Materials Science",
};

export const HERO_REQUEST_TEXT: string = heroRun.request.text;

const user = heroRun.abstractions.find((a) => a.role === "user")!;
export const HERO_FIXTURE_ABSTRACTION: Abstraction = {
  functional_problem: user.functional_problem,
  constraints: user.constraints,
};

export const isHeroText = (t: string) => t.trim() === HERO_REQUEST_TEXT;

const doiUrl = (d: string) => (d.startsWith("http") ? d : `https://doi.org/${d}`);

function toCandidate(r: ResultEv): Candidate {
  const paper: NonNullable<Candidate["paper"]> = {};
  if (r.year !== undefined) paper.year = r.year;
  if (r.doi) paper.doi = doiUrl(r.doi);
  if (r.venue) paper.venue = r.venue;
  return {
    id: `hero-${r.id}`,
    title: r.title,
    field: FIELD[r.source_field] ?? "Physics",
    tags: [],
    mockScore: Math.round(r.structural_score * 100),
    explanation: "",
    hypothesis: r.hypothesis,
    heresy: r.heresy,
    matchedOn: r.matched_on,
    paper,
    source: {
      citation: [r.venue, `(${r.year})`].filter(Boolean).join(" "),
      passage: r.source_passage,
    },
    mapping: r.mapping.map((m) => ({ source: m.source_concept, home: m.home_concept })),
    ...(r.reviewer_note ? { reviewerNote: r.reviewer_note } : {}),
    reviewer: { useful: "", similar: [], assumptions: [], failure: [], next: [] },
    fixture: true,
    abstraction: HERO_FIXTURE_ABSTRACTION,
    problem: HERO_REQUEST_TEXT,
  };
}

/** Drop rule from config/models.yaml: no passage AND no mapping => never shown. */
const survives = (r: ResultEv) => !!r.source_passage && r.mapping.length > 0;

export const HERO_CANDIDATES: Candidate[] = stream
  .filter((e): e is ResultEv => e.type === "result")
  .filter(survives)
  .map(toCandidate);

const traces = stream.filter((e): e is TraceEv => e.type === "trace");

export function heroTrace(): TraceEvent[] {
  return traces.map((e, i) => {
    return {
      id: `h${i}`,
      step: e.step,
      message: e.message,
      state: "waiting" as const,
      ...(e.meta ? { meta: e.meta } : {}),
    };
  });
}

/** Wait before each event, from the ts deltas (about 1s apart), clamped so it reads as a process. */
export const HERO_DELAYS: number[] = traces.map((e, i) => {
  const prev = traces[i - 1];
  const d = prev ? (e.ts - prev.ts) * 1000 : 0;
  return Math.min(Math.max(d, 600), 1400);
});

export const HERO_DONE = stream.find((e): e is DoneEv => e.type === "done")!;
