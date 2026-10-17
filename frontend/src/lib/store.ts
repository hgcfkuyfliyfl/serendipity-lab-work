import { useSyncExternalStore } from "react";
import { HERO_TEXT } from "./mock-data";
import { LEVELS } from "./serendipity";
import { abstractProblem } from "./gemini.functions";
import { advanceRun, getDemoRun, startCollisionRun, STEP_MS } from "./service";
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
  homeFields: ["Civil Engineering"],
  serendipity: LEVELS.balanced,
});

let state: State = {
  draft: initialDraft(),
  run: null,
  saved: ["ant-pheromone"],
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
function failRun(run: Run): Run {
  const trace = run.trace.map((e, i) =>
    i === 2
      ? {
          ...e,
          state: "failed" as const,
          message: "Retrieval timed out (simulated). Retry, or open the cached demo run.",
        }
      : i > 2
        ? { ...e, state: "skipped" as const }
        : e,
  );
  return { ...run, trace, status: "failed" };
}

export const actions = {
  setDraft: (d: Partial<CollisionInput>) => set({ draft: { ...state.draft, ...d } }),
  run: (input: CollisionInput) => {
    stop();
    const fail = state.simulateFailure;
    const started = advanceRun(startCollisionRun(input));
    set({ run: started });
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
    set({ draft: initialDraft(), run: null, saved: ["ant-pheromone"], simulateFailure: false });
  },
};
