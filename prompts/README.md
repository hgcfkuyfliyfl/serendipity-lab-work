# prompts/ — AI Prompt & Agent Engineer

Owner: **Me** (role 4, also roles 1 and 3). **Due Hour 6.**

Four prompts, each returning structured JSON, each testable independently:

- `abstractor` — user text **and** corpus papers -> functional problem / constraints /
  mechanism / domain tags. Schema: [`config/schemas/abstraction.schema.json`](../config/schemas/abstraction.schema.json).
  Required for corpus papers; `mechanism` is nullable for user input that proposes no approach.
- `decomposer` — user abstraction -> 2–4 sub-problems / alternative abstractions. **Also used in
  rewrite mode**: given a skeptic critique, produce better queries.
- `skeptic` / reviewer — critique each candidate, decide keep vs. drop, with a reason and
  boundary conditions.
- `translator` — grounded what-if hypothesis + `source_passage` + `mapping` +
  `reviewer_note`. **No passage and no mapping means the suggestion is dropped, not shown.**

`prior_art` was **cut** at Hour 2 — the decomposer replaces it. See [`docs/cut_list.md`](../docs/cut_list.md).

Format is plain markdown with YAML front matter, so prompts can be edited without touching Python:

```markdown
---
version: v1
---
## SYSTEM
You are ...

## USER
Problem text: {{text}}
```

## The one thing that can invalidate the result

The abstractor **will name the answer if the prompt lets it.** Measured on the hero input: a loose
prompt returned `domain_tags: ['granular_jamming', ...]` and a mechanism reading "granular material".
That puts the correct collision directly into the query, so retrieval finds the jamming papers no
matter what the index holds. It demos well and proves nothing.

The fix is the prompt. With field meanings named and solution-naming explicitly forbidden, the same
input produced "Envelop and securely retain items of unpredictable geometry..." — abstract, no leak.

So **few-shots are load-bearing, not polish.** Rule 17 of
[`docs/llm_gateway_spec.md`](../docs/llm_gateway_spec.md) adds a leak check so a leak fails the call
instead of being cached.

## Provider

Calls go through **Person B's gateway** — do not call the API directly. It owns timeouts, retries,
caching, schema translation and validation. Model and temperature are read from
[`config/models.yaml`](../config/models.yaml); never hard-code them here.

Note for testing prompts in isolation: DeepSeek and Anthropic were both tried and abandoned inside
the Hour 2 window (see `docs/HOUR2_SIGNOFF.md` §6–7). If a prompt behaves differently under a
different model, that is a finding about the prompt's robustness, not a reason to change provider.