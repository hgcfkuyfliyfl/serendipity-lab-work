import type { SerendipitySettings } from "./types";

/**
 * There is no Serendipity Slider (cut by the frozen contract). The request still carries a
 * `chaos` value so the API shape does not break, and the server ignores it. Only the home
 * field is excluded.
 */
export const FIXED: SerendipitySettings = { level: "balanced", excludedAdjacent: 0, rankDepth: 5 };
