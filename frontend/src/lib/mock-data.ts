import type { Abstraction, Candidate, Field, ValidationCase } from "./types";

export const FIELDS: Field[] = [
  "Civil Engineering", "Biology", "Materials Science", "Physics",
  "Computer Science", "Ecology", "Medicine", "Economics",
];

/** Fields considered structurally "adjacent" to each home field, closest first. */
export const ADJACENT: Record<Field, Field[]> = {
  "Civil Engineering": ["Computer Science", "Economics", "Physics"],
  Biology: ["Ecology", "Medicine", "Materials Science"],
  "Materials Science": ["Physics", "Civil Engineering", "Biology"],
  Physics: ["Materials Science", "Computer Science", "Civil Engineering"],
  "Computer Science": ["Civil Engineering", "Economics", "Physics"],
  Ecology: ["Biology", "Economics", "Medicine"],
  Medicine: ["Biology", "Materials Science", "Ecology"],
  Economics: ["Computer Science", "Ecology", "Civil Engineering"],
};

export const HERO_TEXT =
  "Optimizing traffic routing through a city grid during accidents, when several intersections become blocked and drivers need to be redirected quickly without a central controller.";

export const SAMPLE_SCENARIOS = [
  { id: "traffic", label: "Traffic Routing", text: HERO_TEXT, home: ["Civil Engineering"] as Field[] },
  { id: "drug", label: "Drug Discovery", text: "Identifying which candidate compounds to synthesize next when each lab test is expensive and results are noisy.", home: ["Medicine"] as Field[] },
  { id: "material", label: "Material Design", text: "Designing a lightweight panel that stops cracks from spreading after a local impact.", home: ["Materials Science"] as Field[] },
  { id: "energy", label: "Energy Systems", text: "Balancing a regional electricity grid when many small solar producers join and leave unpredictably.", home: ["Civil Engineering"] as Field[] },
  { id: "bio", label: "Biodiversity", text: "Deciding where to place a limited number of wildlife corridors so fragmented populations stay connected.", home: ["Ecology"] as Field[] },
];

export const HERO_ABSTRACTION: Abstraction = {
  functional_problem:
    "Decentralized rerouting of flow through a network when some nodes fail, without central coordination.",
  constraints: ["No global controller", "Partial, local information only", "Failures appear suddenly", "Fast adaptation required"],
  mechanism: "Agents update route preferences from locally observed outcomes, reinforcing paths that work.",
  domain_tags: ["civil engineering", "transportation"],
};

export const DECOMPOSITION = [
  "Detect failed or degraded nodes from local signals",
  "Redistribute flow across surviving paths",
  "Converge on good paths without a central planner",
];

export const CANDIDATES: Candidate[] = [
  {
    id: "ant-pheromone",
    title: "Pheromone-Based Path Reinforcement in Foraging Ants",
    field: "Ecology",
    tags: ["swarm behaviour", "positive feedback", "path reinforcement"],
    mockScore: 92,
    reviewerConfidence: 74,
    explanation: "Ant colonies find short paths around obstacles using only local trail signals — the same decentralized rerouting problem.",
    hypothesis: "Vehicles (or roadside units) could deposit decaying 'virtual pheromone' on segments that moved quickly, letting routes re-form around an accident without a central planner.",
    reviewStatus: "plausible",
    priorArt: "related-found",
    priorArtNote: "Ant-colony-inspired traffic routing has prior work in the transport literature. This does not confirm or deny novelty of a specific design.",
    source: {
      citation: "Illustrative abstract — mock data, not a real quotation",
      passage: "Ants deposit pheromone trails along frequently used routes, which strengthens the trail over time and leads to more efficient routing in the colony. When an obstacle blocks a trail, evaporation allows alternative routes to dominate.",
    },
    mapping: [
      { source: "Pheromone trail reinforcement", home: "Route reinforcement based on observed travel times" },
      { source: "Many individual ants", home: "Many vehicles or routing agents" },
      { source: "Pheromone evaporation", home: "Decay of stale congestion information" },
      { source: "Obstacle on trail", home: "Accident blocking an intersection" },
    ],
    reviewer: {
      useful: "Both systems rely on reinforcement and local information to guide complex, collective behaviour.",
      similar: ["Positive feedback on successful paths", "Forgetting through decay", "No central coordinator"],
      assumptions: ["Agents can sense and share local conditions", "Reinforcement signals are reliable", "Drivers comply with suggested routes"],
      failure: ["Urban traffic is more complex: drivers are strategic, not identical", "Herding — everyone reroutes onto the same street", "Sparse sensor coverage breaks the feedback loop"],
      next: ["Simulate the mechanism in a microscopic traffic model", "Test evaporation rates on a small grid", "Compare against standard dynamic shortest-path rerouting"],
    },
    image: "ant",
  },
  {
    id: "slime-mould",
    title: "Adaptive Tube Networks in Physarum Slime Mould",
    field: "Biology",
    tags: ["network adaptation", "flow feedback", "redundancy"],
    mockScore: 88,
    reviewerConfidence: 66,
    explanation: "The organism thickens tubes carrying more flow and thins idle ones, rebuilding efficient networks after damage.",
    hypothesis: "Lane-allocation or signal-timing could adapt like tube thickness: capacity follows recent flow, so the network re-balances after a blockage.",
    reviewStatus: "plausible",
    priorArt: "pending",
    priorArtNote: "Prior-art check queued in the demo. No novelty conclusion should be drawn.",
    source: {
      citation: "Illustrative abstract — mock data, not a real quotation",
      passage: "Tubes that carry greater protoplasmic flow become thicker, while tubes with little flow decline, producing networks that balance efficiency and fault tolerance.",
    },
    mapping: [
      { source: "Tube thickness", home: "Road capacity / green-light time" },
      { source: "Protoplasmic flow", home: "Vehicle flow" },
      { source: "Network rewiring after cut", home: "Rerouting after an accident" },
    ],
    reviewer: {
      useful: "Offers a mechanism for capacity to follow demand, not just route choice.",
      similar: ["Flow-driven reinforcement", "Self-repair after damage"],
      assumptions: ["Road capacity can be changed quickly", "Flow is measured continuously"],
      failure: ["Physical road capacity is mostly fixed", "Adaptation in Physarum takes hours, accidents need minutes"],
      next: ["Restrict the analogy to signal timing, which can change quickly", "Check timescale compatibility"],
    },
  },
  {
    id: "vascular",
    title: "Collateral Blood Flow After Arterial Occlusion",
    field: "Medicine",
    tags: ["collateral paths", "redundant networks", "local regulation"],
    mockScore: 81,
    reviewerConfidence: 58,
    explanation: "When an artery is blocked, local pressure changes recruit pre-existing side vessels without central control.",
    hypothesis: "Pre-designate low-use 'collateral' streets that are automatically opened (signal priority) when a nearby arterial is blocked.",
    reviewStatus: "contested",
    priorArt: "no-direct-match",
    priorArtNote: "No direct match identified in the demonstration corpus. This is not a novelty determination.",
    source: { citation: "Evidence incomplete — no passage retrieved", passage: null },
    mapping: [
      { source: "Collateral vessels", home: "Parallel side streets" },
      { source: "Pressure-driven recruitment", home: "Queue-length-triggered signal priority" },
    ],
    reviewer: {
      useful: "Suggests planning redundancy in advance rather than discovering it during a failure.",
      similar: ["Redundant parallel paths", "Locally triggered activation"],
      assumptions: ["Side streets can absorb diverted volume", "Residents accept occasional through-traffic"],
      failure: ["Source evidence missing — mapping is unverified", "Blood is not strategic; drivers are"],
      next: ["Retrieve a real source passage before relying on this", "Map candidate collateral streets on a test network"],
    },
  },
  {
    id: "packet-routing",
    title: "Back-Pressure Routing in Wireless Packet Networks",
    field: "Computer Science",
    tags: ["queue signals", "distributed routing", "congestion"],
    mockScore: 79,
    reviewerConfidence: 80,
    explanation: "Each node forwards packets toward neighbours with shorter queues, using only local queue differences.",
    hypothesis: "Signal controllers could release vehicles toward downstream links with shorter queues (max-pressure control).",
    reviewStatus: "supported",
    priorArt: "related-found",
    priorArtNote: "Max-pressure signal control is established in traffic engineering — a close neighbour, not a distant collision.",
    source: {
      citation: "Illustrative abstract — mock data, not a real quotation",
      passage: "Routing decisions are made by comparing queue backlogs between neighbouring nodes, requiring no global topology knowledge.",
    },
    mapping: [
      { source: "Packet queue", home: "Vehicle queue at intersection" },
      { source: "Queue differential", home: "Upstream vs. downstream congestion" },
    ],
    reviewer: {
      useful: "Strong mechanistic fit, but the field is adjacent — the transfer is already known.",
      similar: ["Local queue comparison", "No central planner"],
      assumptions: ["Queue lengths are measurable"],
      failure: ["Low serendipity: likely already familiar to the researcher"],
      next: ["Use as a baseline to compare more distant candidates against"],
    },
  },
  {
    id: "market-signals",
    title: "Price Signals as Decentralized Coordination in Markets",
    field: "Economics",
    tags: ["price signals", "incentives", "equilibrium"],
    mockScore: 70,
    reviewerConfidence: 52,
    explanation: "Prices aggregate dispersed local information so many actors re-allocate without a planner.",
    hypothesis: "Short-lived dynamic tolls around an incident could spread diverted traffic across several alternatives instead of one.",
    reviewStatus: "contested",
    priorArt: "related-found",
    priorArtNote: "Congestion pricing is well studied. Incident-triggered micro-tolling may have related work.",
    source: {
      citation: "Illustrative abstract — mock data, not a real quotation",
      passage: "The price system communicates information about scarcity to participants who need not know its cause.",
    },
    mapping: [
      { source: "Price", home: "Dynamic toll / travel-time cost" },
      { source: "Scarcity", home: "Reduced capacity after accident" },
    ],
    reviewer: {
      useful: "Addresses the herding problem other candidates ignore.",
      similar: ["Information aggregation through a single signal"],
      assumptions: ["Drivers respond to price within minutes", "Tolling is legally possible"],
      failure: ["Equity concerns", "Prices adjust slower than incidents unfold"],
      next: ["Combine with a reinforcement mechanism rather than replace it"],
    },
  },
  {
    id: "mycelium",
    title: "Resource Rerouting in Fungal Mycelial Networks",
    field: "Ecology",
    tags: ["foraging networks", "pruning", "transport"],
    mockScore: 66,
    reviewerConfidence: 48,
    explanation: "Mycelia prune unproductive branches and reinforce those connected to food, re-routing transport after damage.",
    hypothesis: "Temporarily 'prune' low-value turns at signals near an incident to concentrate flow on productive corridors.",
    reviewStatus: "plausible",
    priorArt: "not-performed",
    priorArtNote: "Prior-art check not performed in the demo for low-ranked candidates.",
    source: { citation: "Evidence incomplete — no passage retrieved", passage: null },
    mapping: [
      { source: "Branch pruning", home: "Turn restrictions" },
      { source: "Nutrient transport", home: "Vehicle throughput" },
    ],
    reviewer: {
      useful: "Adds a pruning operation that pure reinforcement lacks.",
      similar: ["Reinforce + prune loop"],
      assumptions: ["Turn restrictions can be applied dynamically"],
      failure: ["Evidence missing", "Weak mechanistic detail"],
      next: ["Find a source passage before further consideration"],
    },
  },
  {
    id: "granular-jamming",
    title: "Clogging and Unjamming in Granular Flow Through Bottlenecks",
    field: "Physics",
    tags: ["jamming", "bottlenecks", "intermittency"],
    mockScore: 63,
    reviewerConfidence: 55,
    explanation: "Grains passing a narrow outlet form arches that stop flow; small perturbations break them.",
    hypothesis: "Brief, staggered release patterns at a bottleneck near an accident may reduce gridlock 'arches'.",
    reviewStatus: "contested",
    priorArt: "related-found",
    priorArtNote: "Granular analogies for pedestrian and vehicle flow exist in the literature.",
    source: {
      citation: "Illustrative abstract — mock data, not a real quotation",
      passage: "Flow through an orifice is interrupted by arch formation; vibration can restore flow by destabilizing arches.",
    },
    mapping: [
      { source: "Arch formation", home: "Gridlock at blocked junction" },
      { source: "Vibration", home: "Staggered signal pulses" },
    ],
    reviewer: {
      useful: "Explains a failure mode, not a routing strategy.",
      similar: ["Bottleneck dynamics"],
      assumptions: ["Vehicles behave like grains near bottlenecks"],
      failure: ["Addresses local jams, not network rerouting"],
      next: ["Treat as complementary to a routing candidate"],
    },
  },
];

export const CONVENTIONAL_RESULTS = [
  { title: "Traffic management systems during incidents", field: "Civil Engineering", note: "Topically on target; same vocabulary as the query.", evidence: true },
  { title: "Urban planning models for road networks", field: "Civil Engineering", note: "Relevant background; stays in the home field.", evidence: true },
  { title: "Road network optimization with shortest paths", field: "Operations Research", note: "Useful baseline methods; centralized.", evidence: true },
  { title: "Incident detection from loop detectors", field: "Civil Engineering", note: "Strong match for detection sub-problem.", evidence: false },
];

export const VALIDATION_CASES: ValidationCase[] = [
  ["Burr seeds → Velcro", "Materials Science", "Botany"],
  ["Kingfisher beak → Shinkansen nose", "Engineering", "Biology"],
  ["Metallurgical annealing → Simulated annealing", "Computer Science", "Metallurgy"],
  ["Ant foraging → Ant colony optimization", "Computer Science", "Ecology"],
  ["Bacterial immunity → CRISPR", "Biotechnology", "Microbiology"],
  ["Termite mounds → Passive ventilation", "Architecture", "Ecology"],
  ["Shark skin → Drag-reducing surfaces", "Fluid Engineering", "Biology"],
].map(([name, researcherField, expectedSource], i) => ({
  id: `v${i}`, name, researcherField, expectedSource,
  baseline: "—", structural: "—", topK: "—",
  status: i < 4 ? "Not Run" : "Awaiting Measured Data",
}));
