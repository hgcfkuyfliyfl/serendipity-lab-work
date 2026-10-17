# Serendipity Lab

**Track:** AI Agents & Autonomous Workflows — NYLP AI Products Hackathon
**Team:** 5 engineers, ~24 hours
**Source of truth:** [`serendipity_lab_v2_team_brief.md`](./serendipity_lab_v2_team_brief.md)

> Search tools are optimized for relevance, so they keep researchers inside their own
> field. Serendipity Lab is an autonomous agent that **strips domain vocabulary from a
> researcher's problem down to its underlying functional structure**, then searches the
> literature of *other* fields for papers that solve the *same abstract problem*.

## The insight

Match on **structure, not topic**.

| Stage | Example |
|---|---|
| Original text | "Optimizing traffic routing through a city grid during accidents" |
| Abstracted | "Decentralized rerouting of flow through a network when nodes fail, without central coordination" |
| Collision (other field) | A paper on ant foraging and pheromone-based path reinforcement |

The same abstraction runs on every corpus paper at indexing time, and matching happens in
"structure space." Cross-field results come from **explicitly excluding the user's home
field**, not from sampling distant vectors.

## Architecture

```
User problem text
      |
      v
[1] ABSTRACTOR (LLM)  ->  functional problem statement
      |
      v
[2] AGENT LOOP (visible trace in UI)
      |- Decompose into 2-4 sub-problems / alternative abstractions
      |- Retrieve top-K per query from abstraction index (home field excluded)
      |- SKEPTICAL REVIEWER critiques each candidate
      |     \- weak candidates -> rewrite query -> re-retrieve (max 2 loops)
      \- Rank survivors
      |
      v
[3] PRIOR-ART CHECK  ->  has this already been tried in the home field?
      |
      v
[4] WHAT-IF TRANSLATOR (LLM)  ->  grounded hypothesis + concept mapping table
      |
      v
UI: result cards, Why-This-Collided inspector, agent trace, Pulse map
```

## Anti-hallucination rules

Every hypothesis must include `source_passage` (exact quote), `mapping` (source concept ->
home concept), and `reviewer_note` (boundary conditions + likely failure mode). If the
translator cannot produce a passage and a mapping, the suggestion is **dropped**.

## Repo layout

| Path | Owner role | Contents |
|---|---|---|
| `backend/` | Backend & API Engineer | FastAPI, SSE streaming, agent-loop orchestration, caching/fallbacks |
| `frontend/` | Frontend & UI/UX Lead | Workspace, streaming trace panel, result cards, inspector, Pulse map |
| `prompts/` | AI Prompt & Agent Engineer | Abstractor, reviewer, translator, prior-art prompts (structured JSON out) |
| `data/` | Vector DB & Data Engineer | Corpus sourcing, abstraction batch job, ChromaDB/FAISS index |
| `eval/` | Product Lead + AI Engineer | Validation experiment: baseline vs. ours on famous cross-domain breakthroughs |

## API contract (locked Sprint 0)

`POST /api/collide` -> `{ "run_id": "..." }` (202)

```json
{ "text": "researcher's problem text", "home_fields": ["civil engineering"], "chaos": 0.6 }
```

`GET /api/runs/{run_id}/stream` -> Server-Sent Events

```json
{ "type": "trace",  "step": "abstracting", "message": "Stripping domain terms...", "ts": 1712345678 }
{ "type": "result", "id": "r1", "title": "Paper title", "source_field": "ecology",
  "structural_score": 0.82, "heresy": "high", "hypothesis": "...",
  "source_passage": "exact quote from the retrieved abstract",
  "mapping": [{ "source_concept": "pheromone trail", "home_concept": "congestion-weighted route cost" }],
  "reviewer_note": "boundary conditions and likely failure mode",
  "prior_art": { "found": false, "note": "No direct match in home field" } }
```

Frontend builds against mocks from Hour 0. **Any schema change requires telling the whole team.**

## Roles

| # | Role | Key deliverable |
|---|---|---|
| 1 | Product & Pitch Lead | Validation table, 5-slide deck, 3-min pitch. Also runs the validation experiment with Member 4 and says no to scope creep. |
| 2 | Backend & API Engineer | Working `/collide` and `/stream` endpoints |
| 3 | Vector DB & Data Engineer | Indexed corpus + retrieval function with home-field exclusion |
| 4 | AI Prompt & Agent Engineer | Prompts with structured JSON outputs, tested independently |
| 5 | Frontend & UI/UX Lead | Complete UI on mock data by Hour 6 |

## Timeline

| Hours | Phase | Goals |
|---|---|---|
| 0–2 | Align & lock | Hero scenario, corpus sources/fields, API contract, validation cases, repo + protected `main` |
| 2–6 | Ugly thin slice | End-to-end with hardcoded data; frontend on mocks; corpus batch job starts |
| 6–14 | Parallel build | Agent loop, index + retrieval, SSE, result cards, validation cases drafted |
| 14–18 | Integration & validation | Live backend; run validation; **go/no-go on abstraction vs. baseline** |
| 18–20 | Safety nets & polish | Cached hero + backup cases, fallbacks, micro-copy |
| 20 | **CODE FREEZE** | Bug fixes only, reviewed by two people |
| 20–24 | Pitch | Deck, backup video, rehearsals |

Cut order if behind: Pulse map -> side-by-side view -> prior-art check -> slider polish.
**Never cut the reviewer, the provenance, or the validation table.**

## Guiding principle

> If a feature doesn't make the structural-matching insight more visible, more believable,
> or more provable, it doesn't ship.

## Open decisions (resolve by Hour 2)

1. Hero scenario: which researcher, which problem, which collision?
2. Corpus sources and the exact list of ~8 fields.
3. LLM provider/model for abstraction (cost vs. quality) and rate-limit budget.
4. Embedding model (one model for both users and corpus, no mixing).
5. ChromaDB vs. FAISS (default ChromaDB, for metadata filtering by field).
6. Final list of validation cases.