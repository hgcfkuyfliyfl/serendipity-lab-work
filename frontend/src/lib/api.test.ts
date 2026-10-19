import { describe, expect, it, vi } from "vitest";
import {
  dispatchEvent,
  fieldLabel,
  fieldSlug,
  parseSseChunk,
  sseData,
  survivesDropRule,
  toCandidate,
  type ApiResultEvent,
} from "./api";

const result = (patch: Partial<ApiResultEvent> = {}): ApiResultEvent => ({
  type: "result",
  id: "r1",
  title: "Jamming at zero temperature and zero applied stress",
  year: 2003,
  venue: "Physical Review E",
  doi: "10.1103/PhysRevE.68.011306",
  source_field: "soft_matter_stat_physics",
  structural_score: 0.82,
  matched_on: "mechanism",
  heresy: "high",
  hypothesis: "What if confinement does the gripping?",
  source_passage: "A disordered assembly transitions from fluid-like to rigid.",
  mapping: [{ source_concept: "packing fraction", home_concept: "vacuum level" }],
  reviewer_note: "Fails on very heavy objects.",
  ...patch,
});

describe("drop rule", () => {
  it("keeps a candidate with a passage and a mapping", () => {
    expect(survivesDropRule(result())).toBe(true);
  });

  it("drops a candidate with no passage", () => {
    expect(survivesDropRule(result({ source_passage: "   " }))).toBe(false);
  });

  it("drops a candidate with an empty mapping", () => {
    expect(survivesDropRule(result({ mapping: [] }))).toBe(false);
  });
});

describe("field slugs", () => {
  it("maps corpus slugs to UI labels", () => {
    expect(fieldLabel("soft_matter_stat_physics")).toBe("Soft Matter Physics");
    expect(fieldLabel("robotics_mech_eng")).toBe("Robotics");
  });

  it("falls back for an unknown slug instead of throwing", () => {
    expect(fieldLabel("quantum_basket_weaving")).toBe("Physics");
  });

  it("maps UI labels back to slugs for home-field exclusion", () => {
    expect(fieldSlug("Robotics")).toBe("robotics_mech_eng");
    expect(fieldSlug("Something New")).toBe("something_new");
  });
});

describe("toCandidate", () => {
  it("carries the real passage, mapping and DOI, and marks the result as corpus-sourced", () => {
    const candidate = toCandidate(result(), "run_1");
    expect(candidate.id).toBe("run_1-r1");
    expect(candidate.corpus).toBe(true);
    expect(candidate.fixture).toBeUndefined();
    expect(candidate.source.passage).toContain("disordered assembly");
    expect(candidate.mapping).toEqual([{ source: "packing fraction", home: "vacuum level" }]);
    expect(candidate.paper?.doi).toBe("https://doi.org/10.1103/PhysRevE.68.011306");
    expect(candidate.mockScore).toBe(82);
  });

  it("leaves bibliographic fields out when the backend omits them", () => {
    const candidate = toCandidate(result({ year: null, venue: null, doi: null }), "run_1");
    expect(candidate.paper).toEqual({});
  });
});

describe("SSE parsing", () => {
  it("returns whole messages and keeps the partial tail", () => {
    const { messages, rest } = parseSseChunk(
      'event: trace\ndata: {"a":1}\n\nevent: result\ndata: {"b":2}\n\nevent: sta',
    );
    expect(messages).toHaveLength(2);
    expect(rest).toBe("event: sta");
  });

  it("reads the data line of a message", () => {
    expect(sseData('event: trace\ndata: {"type":"trace"}')).toEqual({ type: "trace" });
  });

  it("returns null for a message with no data line or broken JSON", () => {
    expect(sseData("event: ping")).toBeNull();
    expect(sseData("data: {oops")).toBeNull();
  });
});

describe("dispatchEvent", () => {
  it("passes through a trace event whose step is in the frozen list", () => {
    const onTrace = vi.fn();
    dispatchEvent({ type: "trace", step: "retrieving", message: "m", ts: 1 }, { onTrace });
    expect(onTrace).toHaveBeenCalledOnce();
  });

  it("ignores a trace event with a step outside the contract", () => {
    const onTrace = vi.fn();
    dispatchEvent({ type: "trace", step: "inventing", message: "m", ts: 1 }, { onTrace });
    expect(onTrace).not.toHaveBeenCalled();
  });

  it("does not emit a result that fails the drop rule", () => {
    const onResult = vi.fn();
    dispatchEvent(result({ mapping: [] }), { onResult });
    expect(onResult).not.toHaveBeenCalled();
    dispatchEvent(result(), { onResult });
    expect(onResult).toHaveBeenCalledOnce();
  });

  it("ignores junk payloads", () => {
    const handlers = { onTrace: vi.fn(), onResult: vi.fn(), onStatus: vi.fn() };
    dispatchEvent(null, handlers);
    dispatchEvent("nope", handlers);
    dispatchEvent({ type: "unknown" }, handlers);
    expect(handlers.onTrace).not.toHaveBeenCalled();
    expect(handlers.onResult).not.toHaveBeenCalled();
    expect(handlers.onStatus).not.toHaveBeenCalled();
  });
});
