# Serendipity Lab v2: Team Brief & Build Plan

**Status:** Supersedes the original Master Spec. Read this fully before touching code.
**Track:** AI Agents & Autonomous Workflows
**Team:** 5 engineering students, about 24 working hours

---

## 0. Why this document exists

We stress-tested the original spec. The idea is strong, but as written it had these problems:

1. Its core technical claim ("low keyword overlap, high structural isomorphism") was treated as a simple algorithm. It is the hardest problem in the project.
2. It was a request/response pipeline marketed as an agent, in an AI Agents track.
3. It had no proof that suggestions are good, and a fluent LLM can "connect" any two abstracts.
4. It had 12 features for about 20 hours of work, mostly UI that is easy to copy.
5. It ignored prior work (literature-based discovery, analogy mining), so we'd look uninformed.

This version fixes those. **Our winning argument is a technical insight we can prove, not a collection of UI features.**

---

## 1. The pitch in one paragraph

> Search tools are optimized for relevance, so they keep researchers inside their own field. Serendipity Lab is an autonomous agent that **strips domain vocabulary from a researcher's problem down to its underlying functional structure**, then searches the literature of *other* fields for papers that solve the *same abstract problem*. Every suggestion is grounded in a source passage, challenged by a skeptical reviewer agent, and checked against prior art in the researcher's field. We validated the approach on famous historical cross-domain breakthroughs and beat standard embedding search on every one we tested.

*(Update the last sentence with real numbers once Section 6 is done. Do not claim results we haven't measured.)*

---

## 2. Core insight: match on structure, not topic

Plain embeddings capture **topical** similarity. Picking "far away" vectors gives noise, not insight.

**Our approach: structural abstraction.**

| Step | Example |
|---|---|
| Original text | "Optimizing traffic routing through a city grid during accidents" |
| Abstracted (domain words removed) | "Decentralized rerouting of flow through a network when nodes fail, without central coordination" |
| Match found (different field) | A paper on ant foraging and pheromone-based path reinforcement |

We run the **same abstraction on every corpus paper at indexing time** and embed the abstractions. Matching then happens in "structure space." Results come from different fields because we explicitly exclude the user's home field(s), not because we sampled distant vectors.

**Abstraction output schema (shared by user input and corpus papers):**

```json
{
  "functional_problem": "one sentence, no domain nouns",
  "constraints": ["..."],
  "mechanism": "one sentence: how the paper/solution works, domain-neutral",
  "domain_tags": ["civil engineering", "transportation"]
}
```

---

## 3. Positioning vs. prior work (include one slide or one line)

Judges who know this area will bring these up. Acknowledge them:

- **Literature-Based Discovery** (Swanson, fish oil and Raynaud's syndrome): finds hidden links *within* connected literatures. We target *structural analogies across unconnected fields*.
- **Analogy mining / analogical search research:** closest academic relative. Credit it, and differentiate on the agent loop, grounding, and validation.
- **TRIZ:** a manual engineering-analogy methodology. We automate the cross-domain search step.
- **Connected Papers, Semantic Scholar, Elicit:** relevance- and citation-optimized by design. They show you *more of your own field*.

**Do not say** serendipity has been "completely engineered out" of search. Say "systematically deprioritized."

---

## 4. System architecture

```
User problem text
      │
      ▼
[1] ABSTRACTOR (LLM)  ──►  functional problem statement
      │
      ▼
[2] AGENT LOOP (visible trace in UI)
      ├─ Decompose into 2–4 sub-problems / alternative abstractions
      ├─ Retrieve top-K per query from abstraction index (home field excluded)
      ├─ SKEPTICAL REVIEWER critiques each candidate
      │     └─ weak candidates → rewrite query → re-retrieve (max 2 loops)
      └─ Rank survivors
      │
      ▼
[3] PRIOR-ART CHECK  ──►  has this already been tried in the home field?
      │
      ▼
[4] WHAT-IF TRANSLATOR (LLM)  ──►  grounded hypothesis + concept mapping table
      │
      ▼
UI: result cards, Why-This-Collided inspector, agent trace, Pulse map
```

### Agent loop rules
- Max 2 refinement iterations (protects latency and cost).
- Every step emits a trace event (`step`, `message`, `timestamp`) that the UI streams.
- All LLM calls have timeouts and a cached fallback.

### Grounded provenance (our anti-hallucination answer)
Every hypothesis **must** include:
- `source_passage`: exact quoted text from the retrieved abstract
- `mapping`: table of source concept → home-field concept
- `reviewer_note`: boundary conditions and the most likely reason it fails

If the translator can't produce a source passage and a mapping, the suggestion is **dropped**, not shown.

---

## 5. Feature scope

### Tier 1: MUST ship (demo fails without these)
| Feature | Notes |
|---|---|
| Input workspace | One text area, one "Find collisions" button |
| Structural abstraction (user + corpus) | The core insight, see Section 2 |
| Cross-domain retrieval with home-field exclusion | ChromaDB or FAISS over the curated corpus |
| Agent loop with visible trace | Streams steps to the UI |
| What-If Translator with provenance | Source passage and mapping table are mandatory |
| Skeptical Peer Reviewer | Our credibility feature. Runs inside the loop, not as an afterthought |
| Cached hero scenario | Precomputed so latency can never stall the pitch |

### Tier 2: SHOULD ship (the "wow" layer)
| Feature | Notes |
|---|---|
| Serendipity Slider | **Defined mechanically:** controls (a) how many adjacent fields are excluded and (b) how deep into the ranked list we sample. Not a raw similarity threshold. |
| Why This Collided inspector | Renders the mapping table and source passage. Nearly free once provenance exists. |
| Pulse visualizer | Node map: user problem in the center, results orbiting, distance = structural score. Our visual hook. |
| Prior-art check | Turns "interesting" into "novel" |
| Side-by-side comparison view | Standard keyword/embedding search on the left, Serendipity Lab on the right, same input |
| Minimal Sandbox bookmarks | In-memory list. A star button and a panel. No database. |

### Tier 3: CUT or DEFER (do not build unless everything above is done and frozen)
| Feature | Decision |
|---|---|
| Multi-source ingestion dropzone (PDF, READMEs) | **Cut.** Plumbing judges don't reward. Mention as roadmap. |
| PDF / Markdown export | **Cut.** Roadmap only. |
| Heresy Meter as a separate system | **Merged.** Display a badge derived from structural distance and reviewer confidence. No separate pipeline. |

---

## 6. Validation experiment (our strongest slide)

**Question we must answer:** "How do you know it works?"

**Method:**
1. Pick 6–10 famous cross-domain breakthroughs. Candidates:
   - Burr seeds → Velcro
   - Kingfisher beak → Shinkansen nose design
   - Metallurgical annealing → simulated annealing
   - Ant foraging → ant colony optimization / network routing
   - Bacterial adaptive immunity → CRISPR genome editing
   - Termite mounds → passive building ventilation
   - Shark skin → drag-reducing surfaces
2. For each, write the "before" problem as a researcher would have described it, in home-field language only.
3. Run it through (a) **baseline**: plain embedding search over raw abstracts, and (b) **Serendipity Lab**.
4. Record whether the true source field or paper appears in the top 5 / top 10.
5. Put the results in a small table (rows = cases, columns = baseline vs. ours).

**Rules:**
- Make sure the source papers/fields exist in the corpus, or the test is meaningless.
- Report honestly. If we win 5 of 8, say 5 of 8. Judges trust honest numbers over perfect ones.
- Run this **before** polishing UI. If abstraction doesn't beat baseline, we need to know by Hour 14, not Hour 22.

---

## 7. Data plan

**Do not attempt "all of science."**

- **Corpus size:** 20,000–50,000 abstracts, which is realistic to abstract and embed in the time available.
- **Fields:** about 8, deliberately diverse (e.g., biology, materials science, physics, CS/algorithms, civil engineering, ecology, medicine, economics).
- **Sources:** arXiv, PubMed/PMC open-access, Semantic Scholar Open Research Corpus, or CORE. **Data engineer to confirm and lock the source list by Hour 2.**
- **Indexing:** run abstraction at indexing time. Batch the LLM calls, cache results to disk, and start early because this is the longest-running job.
- **Hard requirement:** confirm that the hero scenario's collision exists in the corpus. Seed with the known source papers if needed.

---

## 8. Hero scenario

One researcher, one problem, one visible "aha."

**Pick it by Hour 2** and treat it as the product. Everything is judged against whether this demo lands.

Template:
- **Researcher:** *(e.g., a civil engineer working on adaptive traffic rerouting)*
- **Input problem:** *(2–4 sentences in home-field language)*
- **Expected collision:** *(e.g., ant colony pheromone reinforcement from ecology)*
- **The "aha" line we want the audience to say out loud:** *(write it down)*

The system should also handle a judge's off-script input gracefully: either a real result, or "here's a related example while we process that." Never crash or stall on stage.

---

## 9. API contract (lock in Sprint 0)

**`POST /api/collide`**: starts a run, returns a `run_id`.

```json
// Request
{
  "text": "researcher's problem text",
  "home_fields": ["civil engineering"],
  "chaos": 0.6
}
```

**`GET /api/runs/{run_id}/stream`**: Server-Sent Events, one event per agent step plus results.

```json
// Trace event
{ "type": "trace", "step": "abstracting", "message": "Stripping domain terms...", "ts": 1712345678 }

// Result event
{
  "type": "result",
  "id": "r1",
  "title": "Paper title",
  "source_field": "ecology",
  "structural_score": 0.82,
  "heresy": "high",
  "hypothesis": "What-if statement tailored to the home field",
  "source_passage": "exact quote from the retrieved abstract",
  "mapping": [
    { "source_concept": "pheromone trail", "home_concept": "congestion-weighted route cost" }
  ],
  "reviewer_note": "Boundary conditions and likely failure mode",
  "prior_art": { "found": false, "note": "No direct match in home field" }
}
```

Frontend builds against this schema with mock data from **Hour 0**. Any schema change requires telling the whole team.

---

## 10. Roles

| # | Role | Owns | Key deliverable |
|---|---|---|---|
| 1 | **Product & Pitch Lead** | Scope discipline, hero scenario, validation experiment *design*, deck, backup video | Validation table, 5-slide deck, 3-min pitch |
| 2 | **Backend & API Engineer** | FastAPI, SSE streaming, orchestration of the agent loop, caching and fallbacks | Working `/collide` and `/stream` endpoints |
| 3 | **Vector DB & Data Engineer** | Corpus sourcing, abstraction batch job, ChromaDB/FAISS index, home-field exclusion, slider mechanics | Indexed corpus plus retrieval function |
| 4 | **AI Prompt & Agent Engineer** | Abstractor prompt, reviewer prompt, translator prompt, prior-art check, loop logic, validation runs | Prompts with structured JSON outputs, tested independently |
| 5 | **Frontend & UI/UX Lead** | Workspace, streaming trace panel, result cards, inspector, Pulse map, side-by-side view | Complete UI running on mock data by Hour 6 |

**Shared rule:** Member 1 is not "just slides." They run the validation experiment with Member 4 and keep scope under control. They are the person who says no.

---

## 11. Timeline (about 24 hours)

| Hours | Phase | Goals |
|---|---|---|
| **0–2** | **Align & lock** | Pick hero scenario. Lock corpus sources and fields. Lock API contract. Pick validation cases. Init repo, protect `main`. |
| **2–6** | **Ugly thin slice** | End-to-end flow, even with hardcoded data: text → abstraction → retrieval → translation → UI. Purpose: test the core idea early. Frontend works against mocks. Data engineer starts the corpus abstraction batch job. |
| **6–14** | **Parallel build** | Agent loop and reviewer (AI). Index and retrieval with home-field exclusion (Data). SSE streaming and orchestration (Backend). Result cards, trace panel, inspector (Frontend). Validation cases drafted (Product). |
| **14–18** | **Integration & validation** | Replace mocks with live backend. Run the validation experiment and record results. **Go/no-go checkpoint:** if abstraction doesn't beat baseline, adjust prompts now. Add Pulse map and slider if on track. |
| **18–20** | **Safety nets & polish** | Precompute and cache hero scenario plus 2–3 backup cases. Fallbacks for API failure and latency. Loading states, micro-copy. |
| **20** | **CODE FREEZE** | No new features. Bug fixes only, reviewed by two people. |
| **20–24** | **Pitch** | Deck, backup video of the working app, rehearsals out loud. Two people rehearse the pitch while one finishes the deck. |

**Cut order if we're behind** (drop from the top first): Pulse map → side-by-side view → prior-art check → slider polish. Never cut the reviewer, the provenance, or the validation table.

---

## 12. Pitch arc (3 minutes)

1. **Problem (20s):** Search is optimized for relevance, so it keeps you in your silo.
2. **Prior work (10s):** One line crediting LBD and analogy mining, then "we're different because..."
3. **Insight (30s):** Match on structure, not topic. Show the abstraction example from Section 2.
4. **Live demo (75s):** Hero scenario, with the agent trace streaming, then the Why This Collided inspector, then the reviewer's skeptical note.
5. **Proof (25s):** The validation table. "We tested it on N historical breakthroughs."
6. **Vision (20s):** Persistent agent in the lab workspace, PDF/notes ingestion, team-level collision feeds.

**Backup plan:** If live fails, switch to the cached result immediately. If that fails, play the video. Rehearse the switch.

---

## 13. Anticipated judge questions (prepare answers)

| Question | Answer direction |
|---|---|
| "How is this different from asking ChatGPT?" | Structured abstraction over a *searchable index* with grounded passages, a reviewer, and prior-art checks, plus measured validation. A chat prompt has no retrieval and no evidence. |
| "How do you know suggestions aren't hallucinated?" | Every hypothesis cites an exact source passage and mapping table. No passage means it's dropped. |
| "Is this just Literature-Based Discovery?" | Related, but LBD finds hidden links *within* connected literatures. We find *structural analogies across unconnected fields*. |
| "Why is it an agent?" | Plans, decomposes, retrieves, self-critiques, and re-queries autonomously. The trace shows it. |
| "Does it scale?" | The abstraction runs once per paper at indexing time. Retrieval is standard vector search. |
| "What are the limitations?" | Be honest: abstraction quality depends on the LLM, the corpus is limited, and analogies need expert judgment. The reviewer agent exists because of this. |
| "Try it on *my* problem." | Live input path with a cached fallback. Welcome this. It's a great engagement moment. |

---

## 14. Definition of done

- [ ] Hero scenario runs end to end, live, in under about 20 seconds with streamed progress
- [ ] Hero scenario also works instantly from cache
- [ ] Every result shows source passage, mapping table, and reviewer note
- [ ] Agent trace is visible in the UI
- [ ] Validation table exists with honest numbers
- [ ] Home-field exclusion verified (results are *not* from the user's field)
- [ ] 5-slide deck complete
- [ ] Backup video recorded
- [ ] Pitch rehearsed out loud at least twice, with timing
- [ ] Code frozen at Hour 20

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Abstraction doesn't beat baseline | Thin slice at Hour 6 and go/no-go at Hour 14. Tune prompts and few-shot examples. Fall back to a smaller, cleaner corpus. |
| Corpus abstraction job too slow or expensive | Start by Hour 4. Batch and cache. Reduce corpus size, not quality. |
| LLM API outage or latency on stage | Cached hero plus backup cases, then video. |
| Scope creep | Product Lead enforces Section 5. Tier 3 is off-limits until freeze. |
| Random far-away results look like noise in the demo | Hero scenario curated and verified. Reviewer filters weak candidates. |
| Integration collisions | API contract locked in Sprint 0. Frontend uses mocks until Hour 14. |

---

## 16. Open decisions (resolve by Hour 2)

1. Hero scenario: which researcher, which problem, which collision?
2. Corpus sources and the exact list of about 8 fields.
3. LLM provider and model for abstraction (cost versus quality), and rate-limit budget.
4. Embedding model (one model for both users and corpus, no mixing).
5. ChromaDB vs. FAISS (default: ChromaDB for faster setup and metadata filtering by field).
6. Final list of validation cases.

---

## 17. Guiding principle

> **If a feature doesn't make the structural-matching insight more visible, more believable, or more provable, it doesn't ship.**
