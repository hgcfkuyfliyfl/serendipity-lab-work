# LLM Gateway Spec (for Person B)

**Deliver by Hour 6.** This is the plumbing layer around every LLM call. Prompts and schemas are mine; this wrapper is yours.

## Division of work

| Person B owns | M1/M3/M4 owns |
|---|---|
| Timeouts, retries, rate-limit backoff | Prompt text (`prompts/*.md`) |
| JSON parsing and schema validation | Schema content (`config/schemas/*.schema.json`) |
| Disk cache, cache-only mode | Retrieval, scoring, the agent loop |
| Trace-event emission | Which prompt runs when |

The gateway never contains prompt text and never contains domain logic.

## Prompt file format

Plain markdown with YAML front matter. I iterate on these in minutes without touching Python.

```markdown
---
version: v1
---
## SYSTEM
You are ...

## USER
Problem text: {{text}}
```

`{{name}}` placeholders are filled from `inputs`. A missing placeholder raises. Extra inputs are ignored.

## Interface

```python
@dataclass
class LLMResult:
    data: dict            # validated against the task's schema
    cached: bool
    model: str
    attempts: int
    latency_ms: int
    usage: dict | None

class LLMFailure(Exception):
    reason: Literal["timeout", "rate_limit", "provider_error", "validation", "cache_only_miss"]
    detail: str

class TraceSink(Protocol):
    def emit(self, event: dict) -> None: ...

class LLMGateway:
    def __init__(self, models_cfg="config/models.yaml", trace: TraceSink | None = None): ...

    async def arun(self, task: str, inputs: dict, *,
                   cache_id: str | None = None, run_id: str | None = None) -> LLMResult: ...

    def run(self, task: str, inputs: dict, *, cache_id: str | None = None) -> LLMResult:
        """Sync wrapper for the corpus batch job."""
```

`task` is a key under `llm.tasks` in `config/models.yaml`. The gateway reads model, temperature, `max_tokens`, timeout, prompt file, and schema file from there.

## Behavior rules

1. **Cache key** = `sha256(task, cache_id, prompt_sha256, model, schema_sha256)`. If `cache_id` is `None`, use a hash of `inputs`. Editing a prompt file changes the hash, so a stale hit is impossible even if I forget to bump `version`.
2. **Cache store:** SQLite in WAL mode at `cache/llm_cache.sqlite`. Writes are atomic. Killing the process mid-run loses nothing already written.
3. **Never cache a failure.**
4. **`LLM_CACHE_ONLY=1`:** a miss raises `LLMFailure("cache_only_miss")` and makes no API call. This is the stage-safety switch.
5. **Transport retries** (timeout, 429, 5xx): up to `retries.transport`, exponential backoff with jitter, honor `Retry-After`.
6. **Validation retries:** if the output is not valid JSON or fails the schema, retry up to `retries.validation`, appending the validation error text to the prompt. These counts are separate from transport retries.
7. **Final failure raises `LLMFailure`.** The gateway never returns partial or unvalidated data. Callers decide what to do (the batch job writes to the retry file; the live run falls back).
8. **Concurrency:** one global semaphore (`llm.concurrency`) across all tasks.
9. **Structured output:** prefer the provider's tool-use / structured-output mechanism with the schema. Still validate afterward.
10. **Provider isolation:** all Anthropic-specific code lives in one adapter class. Swapping provider means changing `models.yaml` and one file.
11. **Counters:** log cache hits, misses, retries, and token usage per task. One summary line at the end of a batch.
12. **Thinking mode off, always.** Provider is DeepSeek (`config/models.yaml: llm.provider`), which enables
    thinking mode by default at effort `high`. The gateway must send the toggle on **every** request, read
    from `llm.thinking.mode`. Wire it per format:
    `{"thinking": {"type": "disabled"}}` (OpenAI format) or `{"reasoning": {"effort": "none"}}` (Anthropic format).
    With thinking left on, DeepSeek **silently ignores `temperature`** — the `temperature: 0` in
    `models.yaml` becomes a no-op and the validation table stops being reproducible. It also emits a chain of
    thought that will not fit the 20s hero budget. A request that returns a populated `reasoning_content`
    field means the toggle is not being sent: treat that as a bug, not a warning.
13. **Reasoning output is not content.** If `reasoning_content` appears anyway, do not concatenate it into
    the next turn and never let it reach the schema validator. Only `content` is parsed.

## Trace events

Every call emits events matching the API contract's trace shape, plus a `meta` object:

```json
{ "type": "trace", "step": "abstracting", "message": "Stripping domain terms...", "ts": 1712345678,
  "meta": { "task": "abstractor", "cached": false, "attempt": 1, "ms": 3120 } }
```

Proposed `step` values (frozen at Hour 6): `abstracting`, `decomposing`, `retrieving`, `reviewing`, `rewriting`, `translating`, `ranking`, `llm_retry`, `cache_hit`, `done`.

The gateway emits `llm_retry` and `cache_hit` itself. The agent loop (mine) emits the rest by calling `trace.emit(...)`.

## Batch helper (nice to have)

```python
def run_many(task: str, items: list[dict], *, id_key: str,
             retry_file: str, concurrency: int | None = None) -> dict:
    """Resumable. Skips cached items, writes failures to retry_file as JSONL, prints progress and a summary."""
```

## Environment

`ANTHROPIC_API_KEY`, `LLM_CACHE_ONLY` (optional), `LLM_DRY_RUN` (optional; returns fixtures from `tests/fixtures/{task}.json` so UI and API work needs no key).

## Acceptance tests (Hour 6 gate)

Use a fake provider. All must pass:

- [ ] Timeout → retried, then succeeds
- [ ] 429 with `Retry-After` → waits, then succeeds
- [ ] Invalid JSON, then valid JSON → one validation retry, success
- [ ] Persistent invalid output → raises `LLMFailure("validation")`
- [ ] Persistent transport failure → raises with the correct reason
- [ ] Second identical call → cache hit, no provider call
- [ ] Editing the prompt file → cache miss
- [ ] Kill mid-batch, restart → completed items are not re-called
- [ ] Concurrency never exceeds the configured limit
- [ ] `LLM_CACHE_ONLY=1` with a miss → raises, no provider call
- [ ] Trace events emitted for call, retry, and cache hit
