# data/ — Vector DB & Data Engineer

Owner: **Member 3**. Lock sources and the ~8 fields by **Hour 2**.

- Target corpus: **20,000–50,000 abstracts** (~8 deliberately diverse fields, e.g. biology,
  materials science, physics, CS/algorithms, civil engineering, ecology, medicine, economics).
- Candidate sources: arXiv, PubMed/PMC open-access, Semantic Scholar Open Research
  Corpus, CORE. **Confirmed list goes here.**
- Abstractions run at **indexing time**: batch the LLM calls, cache to disk, start by
  **Hour 4**. This is the longest-running job in the project.
- Hard requirement: the hero scenario's collision must exist in the corpus — seed with the
  known source papers if needed.

Index artifacts are gitignored. Do not commit corpus or index files; commit the code that
rebuilds them.