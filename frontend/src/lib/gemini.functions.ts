/**
 * Server-only Gemini call. The key is read from process.env.GEMINI_API_KEY on the server
 * (local .env, never committed) and is never sent to the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Abstraction } from "./types";

const MODEL = "gemini-flash-latest";
const PROMPT = `You abstract research problems. Rewrite the user's problem with every domain-specific noun removed, keeping only its functional structure. Reply with JSON only:
{"functional_problem": "one sentence, no domain nouns", "constraints": ["short phrases, max 4"], "mechanism": "one sentence: how a solution would work, domain-neutral", "domain_tags": ["the user's own fields, max 3"]}`;

export type AbstractResult = { ok: true; abstraction: Abstraction } | { ok: false; reason: string };

export const abstractProblem = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => ({ text: String(d.text ?? "").slice(0, 1000) }))
  .handler(async ({ data }): Promise<AbstractResult> => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { ok: false, reason: "GEMINI_API_KEY is not set on the server" };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT }] },
            contents: [{ parts: [{ text: data.text }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!res.ok) return { ok: false, reason: `Gemini returned HTTP ${res.status}` };
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const p = JSON.parse(raw) as Partial<Abstraction>;
      if (typeof p.functional_problem !== "string" || typeof p.mechanism !== "string")
        return { ok: false, reason: "Gemini reply was not in the expected shape" };
      return {
        ok: true,
        abstraction: {
          functional_problem: p.functional_problem,
          mechanism: p.mechanism,
          constraints: Array.isArray(p.constraints) ? p.constraints.map(String).slice(0, 4) : [],
          domain_tags: Array.isArray(p.domain_tags) ? p.domain_tags.map(String).slice(0, 3) : [],
        },
      };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "Gemini request failed" };
    }
  });
