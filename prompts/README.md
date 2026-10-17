# prompts/ — AI Prompt & Agent Engineer

Owner: **Member 4**.

Prompts that must be testable independently, each returning structured JSON:

- `abstractor` — user text **and** corpus papers -> functional problem / constraints /
  mechanism / domain tags (see the schema in the brief, Section 2).
- `skeptic` / reviewer — critique each candidate, decide keep vs. drop.
- `translator` — grounded what-if hypothesis + `source_passage` + `mapping` +
  `reviewer_note`. **No passage means the suggestion is dropped.**
- `prior_art` — has this already been tried in the home field?

All LLM calls need timeouts and a cached fallback (Member 2 wires the plumbing).