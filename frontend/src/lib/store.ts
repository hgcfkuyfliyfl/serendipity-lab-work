import { useSyncExternalStore } from "react";
import { HERO_TEXT } from "./mock-data";
import { FIXED } from "./serendipity";
import { abstractProblem, findCollisions } from "./gemini.functions";
import {
  explainApiError,
  fieldSlug,
  isApiConfigured,
  startRun as apiStartRun,
  streamRun as apiStreamRun,
  toCandidate as apiToCandidate,
  toTraceEvent as apiToTraceEvent,
  type ApiResultEvent,
  type ApiTraceEvent,
} from "./api";
import {
  advanceRun,
  getDemoRun,
  registerLive,
  excludedFields,
  isHeroInput,
  startCollisionRun,
  startFixtureRun,
  STEP_MS,
} from "./service";
import type { Candidate, CollisionInput, Run, TraceEvent } from "./types";

interface State {
  draft: CollisionInput;
  run: Run | null;
  saved: string[];
  reduceMotion: boolean;
  /** Demo switch: the next run fails at retrieval so failure + retry can be shown. */
  simulateFailure: boolean;
}

const initialDraft = (): CollisionInput => ({
  text: HERO_TEXT,
  homeFields: ["Robotics"],
  serendipity: FIXED,
});

let state: State = {
  draft: initialDraft(),
  run: null,
  saved: [],
  reduceMotion: false,
  simulateFailure: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(state),
  );
}

let timer: ReturnType<typeof setInterval> | null = null;
let abort: AbortController | null = null;
const stop = () => {
  if (timer) clearInterval(timer);
  timer = null;
  abort?.abort();
  abort = null;
};

/** Mark one step failed and skip everything after it. */
function failRun(run: Run, at: number, message: string): Run {
  const trace = run.trace.map((e, i) =>
    i === at
      ? { ...e, state: "failed" as const, message }
      : i > at
        ? { ...e, state: "skipped" as const }
        : e,
  );
  return { ...run, trace, status: "failed" };
}

const LIVE_TIMEOUT_MS = 100000;
/** Plain-English version of a Gemini failure. */
const explain = (reason: string) =>
  /HTTP 40[13]/.test(reason)
    ? "The server's Gemini key was rejected."
    : /HTTP 429/.test(reason)
      ? "Gemini's quota is used up for now."
      : /slow or no connection|fetch/i.test(reason)
        ? "Could not reach Google (slow or no connection)."
        : reason;

/** Stop a pending live run with an error. No unrelated results are put in its place. */
function failLive(id: string, why: string) {
  const run = state.run;
  if (!run || run.id !== id || run.liveStage !== "pending") return;
  stop();
  set({
    run: {
      ...failRun(run, 1, `Live search failed. ${why}`),
      liveStage: "failed",
      liveNote: `Live search failed. ${why} No results are shown, because none exist for your text. Retry, or play the cached hero demo (a different problem).`,
    },
  });
}

/** Play the frozen hero fixture one event at a time, using its ts deltas. */
function replayHero(input: CollisionInput, fail: boolean) {
  const started = advanceRun(startFixtureRun(input));
  set({ run: started });
  const failAt = started.trace.findIndex((e) => e.step === "retrieving");
  const tick = () => {
    const cur = state.run;
    if (!cur || cur.id !== started.id) return;
    let next = advanceRun(cur);
    if (fail && next.trace.findIndex((e) => e.state === "running") === failAt) {
      next = failRun(
        next,
        failAt,
        "Retrieval timed out (simulated). Retry, or open the cached demo run.",
      );
      set({ simulateFailure: false });
    }
    set({ run: next });
    if (next.status !== "running") return;
    const i = next.trace.findIndex((e) => e.state === "running");
    timer = setTimeout(tick, next.delays?.[i] ?? 1000) as unknown as typeof timer;
  };
  timer = setTimeout(tick, started.delays?.[0] ?? 1000) as unknown as typeof timer;
}

/**
 * Live run against the team's FastAPI backend. Trace rows and results are only what the
 * SSE stream sends; nothing is filled in locally. A run with no surviving results ends
 * completed and empty, never with substituted hero data.
 */
function runAgainstBackend(input: CollisionInput) {
  const started: Run = {
    id: `run_${Date.now().toString(36)}`,
    input,
    status: "running",
    startedAt: Date.now(),
    trace: [
      {
        id: "api-start",
        step: "abstracting",
        message: "Sent your problem to the backend. Waiting for the agent loop.",
        state: "running",
      },
    ],
    resultIds: [],
    rejected: [],
    backend: true,
    liveStage: "pending",
  };
  set({ run: started });

  const controller = new AbortController();
  abort = controller;
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  const trace: TraceEvent[] = [];
  const candidates: Candidate[] = [];
  const isCurrent = () => state.run?.id === started.id;

  const onTrace = (event: ApiTraceEvent) => {
    if (!isCurrent()) return;
    trace.push(apiToTraceEvent(event, trace.length));
    const last = trace[trace.length - 1];
    if (last && event.step !== "done") last.state = "running";
    if (trace.length > 1) {
      const previous = trace[trace.length - 2];
      if (previous) previous.state = "completed";
    }
    set({ run: { ...state.run!, trace: trace.map((e) => ({ ...e })) } });
  };

  const onResult = (event: ApiResultEvent) => {
    if (!isCurrent()) return;
    const candidate = apiToCandidate(event, started.id, state.run?.abstraction);
    candidates.push(candidate);
    registerLive([candidate]);
    set({
      run: {
        ...state.run!,
        candidates: [...candidates],
        resultIds: candidates.map((c) => c.id),
      },
    });
  };

  const startThenStream = async () => {
    const runId = await apiStartRun(
      {
        text: input.text,
        home_fields: input.homeFields.map(fieldSlug),
        chaos: 0,
      },
      controller.signal,
    );
    await apiStreamRun(runId, { onTrace, onResult }, controller.signal);
  };

  startThenStream()
    .then(() => {
      clearTimeout(timeout);
      if (!isCurrent()) return;
      const finished = trace.map((e) => ({ ...e, state: "completed" as const }));
      set({
        run: {
          ...state.run!,
          trace: finished,
          status: "completed",
          liveStage: "done",
          ...(candidates.length === 0
            ? {
                liveNote:
                  "The backend finished with no grounded results. Nothing is shown, because no candidate carried both a source passage and a mapping.",
              }
            : {}),
        },
      });
    })
    .catch((error: unknown) => {
      clearTimeout(timeout);
      if (!isCurrent()) return;
      const why = explainApiError(error);
      const at = Math.max(0, trace.length - 1);
      const base = { ...state.run!, trace: trace.length ? trace : state.run!.trace };
      set({
        run: {
          ...failRun(base, at, `Backend run failed. ${why}`),
          liveStage: "failed",
          liveNote: `Backend run failed. ${why} No results are shown, because none exist for your text. Retry, or play the cached hero demo (a different problem).`,
        },
      });
    });
}

export const actions = {
  setDraft: (d: Partial<CollisionInput>) => set({ draft: { ...state.draft, ...d } }),
  run: (input: CollisionInput) => {
    stop();
    const fail = state.simulateFailure;
    if (isHeroInput(input)) return replayHero(input, fail);
    if (isApiConfigured() && !fail) return runAgainstBackend(input);
    const started = { ...advanceRun(startCollisionRun(input)), liveStage: "pending" as const };
    set({ run: started });
    const excluded = excludedFields(input.homeFields);
    findCollisions({
      data: {
        text: input.text,
        excluded,
        home: input.homeFields,
        count: input.serendipity.rankDepth,
      },
    })
      .then((r) => {
        const run = state.run;
        if (!run || run.id !== started.id || run.liveStage !== "pending") return;
        if (!r.ok) return failLive(started.id, `${explain(r.reason)}`);
        const cands = r.candidates.map((c) => ({
          ...c,
          problem: run.input.text,
          ...(run.abstraction ? { abstraction: run.abstraction } : {}),
        }));
        registerLive(cands);
        const n = cands.length;
        const trace = run.trace.map((e, i) =>
          i === 1
            ? {
                ...e,
                message: `Gemini proposed ${n + r.dropped.length} analogous mechanisms outside ${excluded.join(", ")}. No corpus was searched`,
              }
            : i === 2
              ? {
                  ...e,
                  message: r.reviewed
                    ? `Reviewer challenged ${n + r.dropped.length} candidates; ${r.dropped.length} dropped`
                    : "The reviewer call failed, so these candidates are NOT reviewed",
                }
              : i === 3
                ? { ...e, message: `Ranked ${n} candidates by the model's own estimate` }
                : e,
        );
        set({
          run: {
            ...run,
            trace,
            candidates: cands,
            resultIds: cands.map((c) => c.id),
            rejected: r.dropped.map((d) => ({ id: d.id, title: d.title, reason: d.reason })),
            liveStage: "done",
            ...(r.reviewed
              ? {}
              : {
                  liveNote: `The skeptical reviewer call failed (${explain(r.reviewError ?? "unknown error")}), so these candidates are NOT reviewed. Retry the run to get objections.`,
                }),
          },
        });
      })
      .catch(() => failLive(started.id, "Could not reach the server."));
    abstractProblem({ data: { text: input.text } })
      .then((r) => {
        const run = state.run;
        if (!run || run.id !== started.id) return;
        if (r.ok) {
          const trace = run.trace.map((e, i) =>
            i === 0
              ? {
                  ...e,
                  message: `Removed domain vocabulary → "${r.abstraction.functional_problem}"`,
                }
              : e,
          );
          set({
            run: { ...run, trace, abstraction: r.abstraction, abstractionNote: "Gemini (live)" },
          });
        } else
          set({
            run: { ...run, abstractionNote: `Abstraction unavailable: ${explain(r.reason)}` },
          });
      })
      .catch(() => {
        if (state.run?.id === started.id)
          set({
            run: { ...state.run, abstractionNote: "Abstraction unavailable: Gemini unreachable" },
          });
      });
    setTimeout(() => failLive(started.id, "It took longer than 100 seconds."), LIVE_TIMEOUT_MS);
    timer = setInterval(() => {
      const cur = state.run;
      if (!cur || cur.id !== started.id) return stop();
      // Hold at candidate generation until Gemini answers (unless a failure is being simulated)
      if (
        !fail &&
        cur.liveStage === "pending" &&
        cur.trace.findIndex((e) => e.state === "running") === 1
      )
        return;
      let next = advanceRun(cur);
      if (fail && next.trace[1]?.state === "running") {
        next = failRun(
          next,
          1,
          "Retrieval timed out (simulated). Retry, or open the cached demo run.",
        );
        set({ simulateFailure: false });
      }
      set({ run: next });
      if (next.status !== "running") stop();
    }, STEP_MS);
  },
  loadCached: () => {
    stop();
    set({ run: getDemoRun() });
  },
  ensureRun: () => {
    if (!state.run) actions.loadCached();
  },
  saveIdea: (id: string) => !state.saved.includes(id) && set({ saved: [...state.saved, id] }),
  removeSavedIdea: (id: string) => set({ saved: state.saved.filter((s) => s !== id) }),
  toggleSaved: (id: string) =>
    state.saved.includes(id) ? actions.removeSavedIdea(id) : actions.saveIdea(id),
  setReduceMotion: (v: boolean) => set({ reduceMotion: v }),
  setSimulateFailure: (v: boolean) => set({ simulateFailure: v }),
  resetDemo: () => {
    stop();
    set({ draft: initialDraft(), run: null, saved: [], simulateFailure: false });
  },
};
