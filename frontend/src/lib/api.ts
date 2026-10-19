/**
 * Client for the team's FastAPI backend: POST /api/collide, then the SSE stream.
 *
 * The base URL comes from VITE_API_URL. When it is not set, the app has no backend
 * and the store keeps using the cached hero fixture and the direct Gemini path.
 * Nothing here invents data: results are only what the stream sends.
 */
import type { Abstraction, Candidate, Field, MatchedOn, TraceEvent } from "./types";

const RAW_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
export const isApiConfigured = () => API_BASE.length > 0;

/** Trace steps the contract allows. Anything else is ignored rather than rendered. */
export const TRACE_STEPS = [
  "abstracting",
  "decomposing",
  "retrieving",
  "reviewing",
  "rewriting",
  "translating",
  "ranking",
  "llm_retry",
  "cache_hit",
  "done",
] as const;
export type TraceStep = (typeof TRACE_STEPS)[number];
const isTraceStep = (s: unknown): s is TraceStep =>
  typeof s === "string" && (TRACE_STEPS as readonly string[]).includes(s);

/** Corpus field slugs to the labels the UI shows. Unknown slugs keep their own words. */
const FIELD_LABEL: Record<string, Field> = {
  soft_matter_stat_physics: "Soft Matter Physics",
  robotics_mech_eng: "Robotics",
  materials_fluids_aero: "Materials Science",
  organismal_bio_ecology: "Biology",
  civil_structural_eng: "Civil Engineering",
  computer_science: "Computer Science",
  ecology: "Ecology",
  medicine: "Medicine",
  economics: "Economics",
};
export const fieldLabel = (slug: string): Field => FIELD_LABEL[slug] ?? "Physics";

/** Home-field labels back to the corpus slugs the backend filters on. */
const FIELD_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_LABEL).map(([slug, label]) => [label, slug]),
);
export const fieldSlug = (label: string): string =>
  FIELD_SLUG[label] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "_");

export interface ApiTraceEvent {
  type: "trace";
  step: TraceStep;
  message: string;
  ts: number;
  meta?: { task?: string; cached?: boolean; attempt?: number; ms?: number; corpus?: string };
}
export interface ApiResultEvent {
  type: "result";
  id: string;
  title: string;
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  source_field: string;
  structural_score: number;
  matched_on: MatchedOn;
  heresy: "low" | "medium" | "high";
  hypothesis: string;
  source_passage: string;
  mapping: { source_concept: string; home_concept: string }[];
  reviewer_note: string;
}

const doiUrl = (d: string) => (d.startsWith("http") ? d : `https://doi.org/${d}`);

/** Evidence rule, applied again on the client: no passage or no mapping means it is never shown. */
export const survivesDropRule = (r: ApiResultEvent) =>
  typeof r.source_passage === "string" &&
  r.source_passage.trim().length > 0 &&
  Array.isArray(r.mapping) &&
  r.mapping.length > 0;

export function toCandidate(
  r: ApiResultEvent,
  runId: string,
  abstraction?: Abstraction,
  corpusStub = false,
): Candidate {
  const paper: NonNullable<Candidate["paper"]> = {};
  if (r.year !== undefined && r.year !== null) paper.year = r.year;
  if (r.venue) paper.venue = r.venue;
  if (r.doi) paper.doi = doiUrl(r.doi);
  return {
    id: `${runId}-${r.id}`,
    title: r.title,
    field: fieldLabel(r.source_field),
    tags: [],
    mockScore: Math.round(r.structural_score * 100),
    explanation: "",
    hypothesis: r.hypothesis,
    heresy: r.heresy,
    matchedOn: r.matched_on,
    paper,
    source: {
      citation: [r.venue, r.year ? `(${r.year})` : ""].filter(Boolean).join(" "),
      passage: r.source_passage,
    },
    mapping: r.mapping.map((m) => ({ source: m.source_concept, home: m.home_concept })),
    ...(r.reviewer_note ? { reviewerNote: r.reviewer_note } : {}),
    reviewer: { useful: "", similar: [], assumptions: [], failure: [], next: [] },
    corpus: true,
    ...(corpusStub ? { corpusStub: true } : {}),
    ...(abstraction ? { abstraction } : {}),
  };
}

/** One trace event from the stream, in the shape the trace panel renders. */
export function toTraceEvent(e: ApiTraceEvent, index: number): TraceEvent {
  return {
    id: `api-${index}`,
    step: e.step,
    message: e.message,
    state: "completed",
    ...(e.meta ? { meta: e.meta } : {}),
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Plain-English version of a backend failure, for the error panel. */
export function explainApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "The backend did not recognise that run.";
    if (error.status === 422) return "The backend rejected the request as invalid.";
    if (error.status && error.status >= 500) return "The backend hit an error of its own.";
    return error.message;
  }
  if (error instanceof DOMException && error.name === "AbortError") return "The run was cancelled.";
  return "Could not reach the backend. Check that it is running.";
}

export interface CollideBody {
  text: string;
  home_fields: string[];
  /** Accepted and ignored by the backend. Sent because the contract has the field. */
  chaos: number;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!isApiConfigured()) throw new ApiError("No backend is configured.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError("Could not reach the backend.");
  }
  if (!response.ok) throw new ApiError(`The backend returned ${response.status}.`, response.status);
  return response;
}

/** Start a run. Returns the run id the stream is read from. */
export async function startRun(body: CollideBody, signal?: AbortSignal): Promise<string> {
  const response = await request("/api/collide", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  const data = (await response.json()) as { run_id?: string };
  if (!data.run_id) throw new ApiError("The backend did not return a run id.");
  return data.run_id;
}

export interface StreamHandlers {
  onTrace?: (event: ApiTraceEvent) => void;
  onResult?: (event: ApiResultEvent) => void;
  onStatus?: (status: string) => void;
}

/** Split an SSE buffer into whole messages, returning the leftover partial one. */
export function parseSseChunk(buffer: string): { messages: string[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  return { messages: parts.filter((p) => p.trim().length > 0), rest };
}

/** The `data:` payload of one SSE message, or null when there is none. */
export function sseData(message: string): unknown {
  const line = message.split("\n").find((l) => l.startsWith("data:"));
  if (!line) return null;
  try {
    return JSON.parse(line.slice("data:".length).trim());
  } catch {
    return null;
  }
}

/** Route one parsed SSE payload to the right handler. Unknown events are ignored. */
export function dispatchEvent(payload: unknown, handlers: StreamHandlers): void {
  if (!payload || typeof payload !== "object") return;
  const event = payload as Record<string, unknown>;
  if (event["type"] === "trace" && isTraceStep(event["step"])) {
    handlers.onTrace?.(event as unknown as ApiTraceEvent);
    return;
  }
  if (event["type"] === "result") {
    const result = event as unknown as ApiResultEvent;
    if (survivesDropRule(result)) handlers.onResult?.(result);
    return;
  }
  if (event["type"] === "status" && typeof event["status"] === "string") {
    handlers.onStatus?.(event["status"]);
  }
}

/** Read the run's SSE stream to the end, calling the handlers as events arrive. */
export async function streamRun(
  runId: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await request(`/api/runs/${encodeURIComponent(runId)}/stream`, {
    headers: { accept: "text/event-stream" },
    ...(signal ? { signal } : {}),
  });
  const body = response.body;
  if (!body) throw new ApiError("The backend sent an empty stream.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { messages, rest } = parseSseChunk(buffer);
    buffer = rest;
    for (const message of messages) dispatchEvent(sseData(message), handlers);
  }
  if (buffer.trim()) dispatchEvent(sseData(buffer), handlers);
}
