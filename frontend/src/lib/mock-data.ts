import { HERO_FIXTURE_ABSTRACTION, HERO_REQUEST_TEXT } from "@/mock/hero";
import type { Abstraction, Field, ValidationCase } from "./types";

export const FIELDS: Field[] = [
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
];

/** Fields considered structurally "adjacent" to each home field, closest first. */
export const ADJACENT: Record<Field, Field[]> = {
  Robotics: ["Computer Science", "Materials Science", "Civil Engineering"],
  "Soft Matter Physics": ["Physics", "Materials Science", "Biology"],
  "Civil Engineering": ["Computer Science", "Economics", "Physics"],
  Biology: ["Ecology", "Medicine", "Materials Science"],
  "Materials Science": ["Physics", "Civil Engineering", "Biology"],
  Physics: ["Materials Science", "Computer Science", "Civil Engineering"],
  "Computer Science": ["Civil Engineering", "Economics", "Physics"],
  Ecology: ["Biology", "Economics", "Medicine"],
  Medicine: ["Biology", "Materials Science", "Ecology"],
  Economics: ["Computer Science", "Ecology", "Civil Engineering"],
};

/** FROZEN hero input. Do not edit without a team amendment. */
export const HERO_TEXT = HERO_REQUEST_TEXT;

export const SAMPLE_SCENARIOS = [
  {
    id: "grasp",
    label: "Robot Grasping",
    text: HERO_TEXT,
    home: ["Robotics"] as Field[],
  },
  {
    id: "traffic",
    label: "Traffic Routing",
    text: "Optimizing traffic routing through a city grid during accidents, when several intersections become blocked and drivers need to be redirected quickly without a central controller.",
    home: ["Civil Engineering"] as Field[],
  },
  {
    id: "drug",
    label: "Drug Discovery",
    text: "Identifying which candidate compounds to synthesize next when each lab test is expensive and results are noisy.",
    home: ["Medicine"] as Field[],
  },
  {
    id: "material",
    label: "Material Design",
    text: "Designing a lightweight panel that stops cracks from spreading after a local impact.",
    home: ["Materials Science"] as Field[],
  },
  {
    id: "energy",
    label: "Energy Systems",
    text: "Balancing a regional electricity grid when many small solar producers join and leave unpredictably.",
    home: ["Civil Engineering"] as Field[],
  },
  {
    id: "bio",
    label: "Biodiversity",
    text: "Deciding where to place a limited number of wildlife corridors so fragmented populations stay connected.",
    home: ["Ecology"] as Field[],
  },
];

export const HERO_ABSTRACTION: Abstraction = HERO_FIXTURE_ABSTRACTION;

const NOT_RUN = {
  baselineTop5: "—",
  baselineTop10: "—",
  structuralTop5: "—",
  structuralTop10: "—",
  status: "Not run" as const,
};

export const VALIDATION_CASES: ValidationCase[] = [
  {
    id: "v-hero",
    name: "Robot grasping → granular jamming",
    kind: "development",
    researcherField: "Robotics / mechanical engineering",
    expectedSource: "Soft matter / statistical physics (jamming)",
    note: "Known historical collision used to build the demo. It shows the pipeline end to end and proves nothing on its own. Pre-registered acceptable hits in the corpus: O'Hern et al. 2003, Cates et al. 1998, Trappe et al. 2001. Liu 2010 is typed as a review and the corpus keeps articles only. The outcome paper (Brown et al., PNAS 2010) is excluded from the corpus, so it can never be retrieved.",
    ...NOT_RUN,
  },
  ...(
    [
      ["Burr seeds → Velcro", "Materials Science", "Botany"],
      ["Kingfisher beak → Shinkansen nose", "Engineering", "Biology"],
      ["Metallurgical annealing → Simulated annealing", "Computer Science", "Metallurgy"],
      ["Ant foraging → Ant colony optimization", "Computer Science", "Ecology"],
      ["Bacterial immunity → CRISPR", "Biotechnology", "Microbiology"],
      ["Termite mounds → Passive ventilation", "Architecture", "Ecology"],
      ["Shark skin → Drag-reducing surfaces", "Fluid Engineering", "Biology"],
    ] as const
  ).map(([name, researcherField, expectedSource], i) => ({
    id: `v${i}`,
    name,
    kind: "held-out (proposed)" as const,
    researcherField,
    expectedSource,
    note: "Not run. Whether the source papers exist in the corpus has not been checked.",
    ...NOT_RUN,
  })),
];
