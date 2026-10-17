export type Field =
  | "Civil Engineering" | "Biology" | "Materials Science" | "Physics"
  | "Computer Science" | "Ecology" | "Medicine" | "Economics";

export type SerendipityLevel = "focused" | "balanced" | "exploratory";

export interface SerendipitySettings {
  level: SerendipityLevel;
  /** How many adjacent fields (beyond the home field) are excluded */
  excludedAdjacent: number;
  /** How far down the ranked candidate list the agent explores */
  rankDepth: number;
}

export interface CollisionInput {
  text: string;
  homeFields: Field[];
  serendipity: SerendipitySettings;
}

export interface Abstraction {
  functional_problem: string;
  constraints: string[];
  mechanism: string;
  domain_tags: string[];
}

export type ReviewStatus = "supported" | "plausible" | "contested";
export type PriorArt = "related-found" | "no-direct-match" | "pending" | "not-performed";

export interface Candidate {
  id: string;
  title: string;
  field: Field;
  tags: string[];
  /** Demonstration score 0-100 — NOT a measured value */
  mockScore: number;
  reviewerConfidence: number;
  explanation: string;
  hypothesis: string;
  reviewStatus: ReviewStatus;
  priorArt: PriorArt;
  priorArtNote: string;
  source: { citation: string; passage: string | null };
  mapping: { source: string; home: string }[];
  reviewer: {
    useful: string;
    similar: string[];
    assumptions: string[];
    failure: string[];
    next: string[];
  };
  image?: "ant";
}

export type TraceState = "waiting" | "running" | "completed" | "skipped" | "failed";
export interface TraceEvent {
  id: string;
  step: string;
  message: string;
  detail?: string;
  state: TraceState;
  elapsedMs?: number;
}

export interface Run {
  id: string;
  input: CollisionInput;
  status: "running" | "completed" | "failed";
  startedAt: number;
  trace: TraceEvent[];
  resultIds: string[];
  rejected: { id: string; reason: string }[];
  cachedFallback: boolean;
}

export interface ValidationCase {
  id: string;
  name: string;
  researcherField: string;
  expectedSource: string;
  baseline: string;
  structural: string;
  topK: string;
  status: "Not Run" | "Awaiting Measured Data";
}
