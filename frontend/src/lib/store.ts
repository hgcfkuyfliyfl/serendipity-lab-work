import { useSyncExternalStore } from "react";
import { HERO_TEXT } from "./mock-data";
import { FIXED } from "./serendipity";
import { abstractProblem, findCollisions } from "./gemini.functions";
import {
  advanceRun,
  getDemoRun,
  registerLive,
  selectCandidates,
  isHeroText,
  startCollisionRun,
  startFixtureRun,
  STEP_MS,
} from "./service";
import type { CollisionInput, Run } from "./types";

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
const stop = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

/** Mark the retrieval step failed and skip everything after it. */
function failRun(run: Run, at = 2): Run {
  const trace = run.trace.map((e, i) =>
    i === at
      ? {
          ...e,
          state: "failed" as const,
          message: "Retrieval timed out (simulated). Retry, or open the cached demo run.",
        }
      : i > at
        ? { ...e, state: "skipped" as const }
        : e,
  );
  return { ...run, trace, status: "failed" };
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
      next = failRun(next, failAt);
      set({ simulateFailure: false });
    }
    set({ run: next });
    if (next.status !== "running") return;
    const i = next.trace.findIndex((e) => e.state === "running");
    timer = setTimeout(tick, next.delays?.[i] ?? 1000) as unknown as typeof timer;
  };
  timer = setTimeout(tick, started.delays?.[0] ?? 1000) as unknown as typeof timer;
}

export const actions = {
  setDraft: (d: Partial<CollisionInput>) => set({ draft: { ...state.draft, ...d } }),
  run: (input: CollisionInput) => {
    stop();
    const fail = state.simulateFailure;
    if (isHeroText(input.text)) return replayHero(input, fail);
    const started = { ...advanceRun(startCollisionRun(input)), liveStage: "pending" as const };
    set({ run: started });
    const { excluded } = selectCandidates(
      input.homeFields,
      input.serendipity.excludedAdjacent,
      input.serendipity.rankDepth,
    );
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
        if (!run || run.id !== started.id) return;
        if (r.ok) {
          const cands = r.candidates.map((c) => ({
            ...c,
            problem: run.input.text,
            ...(run.abstraction ? { abstraction: run.abstraction } : {}),
          }));
          registerLive(cands);
          const n = cands.length;
          const trace = run.trace.map((e, i) =>
            i === 2
              ? {
                  ...e,
                  message: `Gemini proposed ${n + r.dropped.length} analogous mechanisms outside ${excluded.join(", ")}`,
                }
              : i === 3
                ? {
                    ...e,
                    message: `Reviewer challenged ${n + r.dropped.length} candidates; ${r.dropped.length} dropped`,
                  }
                : i === 5
                  ? {
                      ...e,
                      message: `Ranked ${n} candidates by model-estimated structural similarity`,
                    }
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
                    liveNote:
                      "The skeptical reviewer call failed (slow or no connection), so these candidates are NOT reviewed. Retry the run to get objections.",
                  }),
            },
          });
        } else
          set({
            run: {
              ...run,
              liveStage: "failed",
              liveNote: `Live search failed (${r.reason}). Showing the cached demo candidates.`,
            },
          });
      })
      .catch(() => {
        const run = state.run;
        if (run?.id === started.id)
          set({
            run: {
              ...run,
              liveStage: "failed",
              liveNote: "Live search failed. Showing the cached demo candidates.",
            },
          });
      });
    abstractProblem({ data: { text: input.text } })
      .then((r) => {
        if (!state.run || state.run.id !== started.id) return;
        const run = state.run;
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
        } else set({ run: { ...run, abstractionNote: `Cached example (${r.reason})` } });
      })
      .catch(() => {
        if (state.run?.id === started.id)
          set({ run: { ...state.run, abstractionNote: "Cached example (Gemini unreachable)" } });
      });
    timer = setInterval(() => {
      if (!state.run) return;
      // Hold at retrieval until the live model answers (unless a failure is being simulated)
      if (
        !fail &&
        state.run.liveStage === "pending" &&
        state.run.trace.findIndex((e) => e.state === "running") === 2
      )
        return;
      let next = advanceRun(state.run);
      if (fail && next.trace[2].state === "running") {
        next = failRun(next);
        set({ simulateFailure: false }); // fail once, so Retry succeeds deterministically
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
