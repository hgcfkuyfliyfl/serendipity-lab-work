# data/ — Vector DB & Data Engineer

Owner: **Me** (role 3, also roles 1 and 4). Corpus locked at Hour 2 in
[`config/corpus.yaml`](../config/corpus.yaml).

## Corpus

- **3,000 abstracts**, 8 fields × 375. Not 20k–50k: the brief scoped that against a dedicated data
  engineer for 8 hours, and with three people it is not reachable. A curated 3k is the stronger proof
  because every result can be hand-audited.
- **Source: OpenAlex.** One consistent taxonomy with abstracts and reproducible sampling. Key in
  `OPENALEX_API_KEY`. Fallbacks only where OpenAlex lacks an abstract: PubMed, arXiv, `manual_paste`.
- **Reproducible:** `sample` + `seed: 42`, year-stratified, plus 25 most-cited "classics" per field so
  seed papers are not the only famous ones in the corpus.
- Selection order per field: seeds -> distractor classics -> stratified random sample.
- **Field tagging is a deterministic subfield lookup, never an LLM.** Home-field exclusion depends on
  tags being right, and a wrong tag produces a "cross-domain" hit that is really the user's own field.

## Artifacts I own here

| Path | What |
|---|---|
| `config/corpus.lock.yaml` | Resolved OpenAlex subfield IDs and counts. **Not written yet.** |
| `docs/field_qa.md` | 20 random titles per field, read by hand before the full run. **Not written yet.** |
| ingest + abstraction batch job | Resumable, failures to a retry file. **Not written yet.** |

Both referenced files are missing, so the Hour 2 gate is not yet passed.

## Rules

- **Seed the corpus with the known source papers for every validation case and the hero scenario.** If
  the source papers are not in the corpus the test is meaningless. Source of truth is
  `config/validation_cases.yaml`.
- **Outcome papers are excluded from the corpus** (Brown 2010, Tero 2010, the kidney-exchange papers,
  Kirkpatrick 1983, Dorigo 1996, Geim 2003). They carry home-field vocabulary and would make the test
  trivial. Pitch references only.
- **Launch the batch job by Hour 4, unattended.** Start it before prompt work, not after.
- **Pilot 600 papers first and read the abstractions by hand.** With the LLM provider changing inside
  the Hour 2 window, skipping the pilot is how a quality regression reaches Hour 14.
- Index artifacts are gitignored. Do not commit corpus or index files; commit the code that rebuilds
  them. One documented, resumable command must rebuild the index from scratch.

## Vector store

ChromaDB, 3 collections — `abstractions_problem`, `abstractions_mechanism`, `raw_abstracts` (baseline
only). Two structural vectors per paper; `structural_score = max cosine over both vectors and all
queries`. FAISS only above ~200k documents.