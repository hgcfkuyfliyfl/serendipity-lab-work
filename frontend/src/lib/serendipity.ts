import type { SerendipityLevel, SerendipitySettings } from "./types";

export const LEVELS: Record<
  SerendipityLevel,
  SerendipitySettings & { label: string; summary: string }
> = {
  focused: {
    level: "focused",
    excludedAdjacent: 0,
    rankDepth: 4,
    label: "Focused",
    summary: "Excludes only your home field and reviews the top 4 candidates.",
  },
  balanced: {
    level: "balanced",
    excludedAdjacent: 1,
    rankDepth: 6,
    label: "Balanced",
    summary: "Also excludes the closest adjacent field and explores the top 6 candidates.",
  },
  exploratory: {
    level: "exploratory",
    excludedAdjacent: 2,
    rankDepth: 8,
    label: "Exploratory",
    summary: "Excludes two adjacent fields and explores deeper, down to rank 8.",
  },
};

export const LEVEL_ORDER: SerendipityLevel[] = ["focused", "balanced", "exploratory"];
