/**
 * Server-only Gemini calls. The key is read from process.env["GEMINI_API_KEY"] on the server
 * (local .env, never committed) and is never sent to the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Abstraction, Candidate } from "./types";

const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const urlFor = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const ALL_FIELDS = [
  "Robotics",
  "Soft Matter Physics",
  "Civil Engineering",
  "Biology",
  "Materials Science",
  "Physics",
  "Computer Science",
  "Ecology",
  "Medicine",
  "Economics",
] as const;

async function gemini<T>(
  key: string,
  system: string,
  user: string,
  ms = 25000,
  modelIdx = 0,
): Promise<T> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
  let res: Response | null = null;
  // Slow or flaky connections fail with "fetch failed" before Google answers: retry once.
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    try {
      res = await fetch(urlFor(MODELS[modelIdx] ?? MODELS[0]!), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(ms),
      });
    } catch (e) {
      if (attempt === 1)
        throw new Error("Could not reach Google (slow or no connection)", { cause: e });
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (res && res.status === 429 && modelIdx + 1 < MODELS.length) {
    // Quota used up on this model: fall back to the next one.
    return gemini<T>(key, system, user, ms, modelIdx + 1);
  }
  if (!res || !res.ok) {
    let why = "";
    try {
      const e = (await res?.json()) as { error?: { message?: string } };
      why = e.error?.message?.slice(0, 160) ?? "";
    } catch {
      /* no body */
    }
    throw new Error(`Gemini returned HTTP ${res?.status ?? "none"}${why ? `: ${why}` : ""}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as T;
}
const msg = (e: unknown) => (e instanceof Error ? e.message : "Gemini request failed");
const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.map(String).slice(0, n) : []);
const clamp = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/* ---------- 1. Structural abstraction ---------- */

const ABSTRACT_PROMPT = `You abstract research problems. Rewrite the user's problem with every domain-specific noun removed, keeping only its functional structure. Reply with JSON only:
{"functional_problem": "one sentence, no domain nouns", "constraints": ["short phrases, max 4"], "mechanism": "one sentence: how a solution would work, domain-neutral", "domain_tags": ["the user's own fields, max 3"]}`;

export type AbstractResult = { ok: true; abstraction: Abstraction } | { ok: false; reason: string };

export const abstractProblem = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => ({ text: String(d.text ?? "").slice(0, 1000) }))
  .handler(async ({ data }): Promise<AbstractResult> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { ok: false, reason: "GEMINI_API_KEY is not set on the server" };
    try {
      const p = await gemini<Partial<Abstraction>>(key, ABSTRACT_PROMPT, data.text, 20000);
      if (typeof p.functional_problem !== "string" || typeof p.mechanism !== "string")
        return { ok: false, reason: "Gemini reply was not in the expected shape" };
      return {
        ok: true,
        abstraction: {
          functional_problem: p.functional_problem,
          mechanism: p.mechanism,
          constraints: strs(p.constraints, 4),
          domain_tags: strs(p.domain_tags, 3),
        },
      };
    } catch (e) {
      return { ok: false, reason: msg(e) };
    }
  });

/* ---------- 2. Cross-domain candidates + skeptical reviewer ---------- */

interface Gen {
  title?: string;
  field?: string;
  explanation?: string;
  useful?: string;
  hypothesis?: string;
  mapping?: { source?: string; home?: string }[];
  tags?: string[];
  similar_work?: string[];
  structural_score?: number;
}
interface Review {
  id?: string;
  objection?: string;
  status?: string;
  confidence?: number;
  assumptions?: string[];
  failure?: string[];
  next?: string[];
  keep?: boolean;
  drop_reason?: string;
}

const genPrompt = (
  allowed: string[],
  n: number,
  home: string,
) => `You are the analogy engine of Serendipity Lab. The user describes a problem in their own field (${home}). Find ${n} DIFFERENT fields' well-known mechanisms that solve the same underlying structural problem.
Rules:
- field must be exactly one of: ${allowed.join(", ")}. Spread across several fields.
- title names a real, established mechanism, phenomenon or technique (for example "Pheromone-based path reinforcement"). Never invent papers, authors, citations, numbers or URLs.
- explanation: 1-2 sentences on the shared structure. hypothesis: starts with "What if", applied to the user's setting. useful: one sentence on why it could help.
- mapping: 3 rows {"source": concept in the other field, "home": matching concept in the user's problem}.
- similar_work: 0-2 known existing approaches in the user's own field that already resemble this (names only, no citations).
- structural_score: 0-100 estimate of structural similarity. Vary it honestly; weak analogies get low scores.
Reply JSON only: {"candidates":[{"title","field","explanation","useful","hypothesis","mapping":[{"source","home"}],"tags":["3 short tags"],"similar_work":[],"structural_score":0}]}`;

const REVIEW_PROMPT = `You are a skeptical peer reviewer. For each candidate analogy, find the strongest reason it fails in the user's setting. Be specific and concrete, not generic.
Return JSON only: {"reviews":[{"id","objection":"one sentence, the strongest reason it fails","status":"supported|plausible|contested","confidence":0-100,"assumptions":["max 3"],"failure":["max 3 failure modes"],"next":["max 3 concrete things to test first"],"keep":true,"drop_reason":""}]}
Set keep=false only if the analogy shares words but not structure, and give drop_reason. Drop at most one candidate.`;

export type CollideResult =
  | {
      ok: true;
      candidates: Candidate[];
      dropped: { id: string; title: string; reason: string }[];
      /** false when the reviewer call failed, so scores and objections are missing */
      reviewed: boolean;
      /** why the reviewer call failed, when it did */
      reviewError?: string;
    }
  | { ok: false; reason: string };

export const findCollisions = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string; excluded: string[]; home: string[]; count: number }) => ({
    text: String(d.text ?? "").slice(0, 1000),
    excluded: (d.excluded ?? []).map(String),
    home: (d.home ?? []).map(String),
    count: Math.min(Math.max(Number(d.count) || 5, 3), 6),
  }))
  .handler(async ({ data }): Promise<CollideResult> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { ok: false, reason: "GEMINI_API_KEY is not set on the server" };
    const allowed = ALL_FIELDS.filter((f) => !data.excluded.includes(f));
    if (allowed.length < 2) return { ok: false, reason: "Too many fields are excluded" };
    try {
      const gen = await gemini<{ candidates?: Gen[] }>(
        key,
        genPrompt([...allowed], data.count, data.home.join(", ") || "unspecified"),
        data.text,
      );
      const seed = Date.now().toString(36);
      const dropped: { id: string; title: string; reason: string }[] = [];
      const base: Candidate[] = [];
      (gen.candidates ?? []).forEach((g, i) => {
        const id = `live-${seed}-${i}`;
        const title = String(g.title ?? "").trim();
        if (!title || !g.explanation || !g.hypothesis) return;
        if (!(allowed as string[]).includes(String(g.field))) {
          dropped.push({ id, title, reason: `Proposed from ${g.field}, which is excluded` });
          return;
        }
        base.push({
          id,
          title,
          field: g.field as Candidate["field"],
          tags: strs(g.tags, 3),
          mockScore: clamp(g.structural_score),
          explanation: String(g.explanation),
          hypothesis: String(g.hypothesis),
          source: { citation: "No source retrieved. Model-generated analogy.", passage: null },
          mapping: (g.mapping ?? [])
            .slice(0, 4)
            .map((m) => ({ source: String(m.source ?? ""), home: String(m.home ?? "") })),
          reviewer: {
            useful: String(g.useful ?? ""),
            similar: strs(g.similar_work, 2),
            assumptions: [],
            failure: [],
            next: [],
          },
          live: true,
        });
      });
      if (base.length === 0) return { ok: false, reason: "Gemini returned no usable candidates" };

      let reviewed = true;
      let reviewError = "";
      const rev = await gemini<{ reviews?: Review[] }>(
        key,
        REVIEW_PROMPT,
        JSON.stringify({
          problem: data.text,
          candidates: base.map((c) => ({
            id: c.id,
            title: c.title,
            field: c.field,
            explanation: c.explanation,
            hypothesis: c.hypothesis,
            mapping: c.mapping,
          })),
        }),
      ).catch((e: unknown) => {
        reviewed = false;
        reviewError = msg(e);
        return { reviews: [] as Review[] };
      });

      const kept: Candidate[] = [];
      for (const c of base) {
        const r = (rev.reviews ?? []).find((x) => x.id === c.id);
        if (r?.keep === false && kept.length + 1 < base.length) {
          dropped.push({
            id: c.id,
            title: c.title,
            reason: r.drop_reason || "Reviewer: shares words, not structure",
          });
          continue;
        }
        if (r) {
          c.reviewerConfidence = clamp(r.confidence);
          c.reviewStatus =
            r.status === "supported" || r.status === "contested" ? r.status : "plausible";
          c.reviewer.assumptions = strs(r.assumptions, 3);
          c.reviewer.failure = [r.objection, ...strs(r.failure, 3)]
            .filter((x): x is string => !!x)
            .slice(0, 4);
          c.reviewer.next = strs(r.next, 3);
        }
        kept.push(c);
      }
      kept.sort((a, b) => b.mockScore - a.mockScore);
      return {
        ok: true,
        candidates: kept,
        dropped,
        reviewed,
        ...(reviewed ? {} : { reviewError }),
      };
    } catch (e) {
      return { ok: false, reason: msg(e) };
    }
  });
