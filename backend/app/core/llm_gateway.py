from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import jsonschema
import yaml


class TraceSink(Protocol):
    def emit(self, event: dict[str, Any]) -> None:
        ...


@dataclass
class LLMResult:
    data: dict[str, Any]
    cached: bool
    model: str
    attempts: int
    latency_ms: int
    usage: dict[str, Any] | None = None


class LLMFailure(Exception):
    def __init__(self, reason: str, detail: str):
        self.reason = reason
        self.detail = detail
        super().__init__(f"{reason}: {detail}")


class _GeminiProvider:
    """Small adapter around the Gemini API contract used by the project."""

    def __init__(self, *, api_key: str, base_url: str, model: str, timeout_s: int):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.timeout_s = timeout_s

    def generate(self, *, task: str, prompt: str, schema: dict[str, Any], inputs: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        import httpx

        translated_schema = self._translate_schema_for_gemini(schema)
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 512,
                "responseMimeType": "application/json",
                "responseSchema": translated_schema,
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

        # The key goes in a header, never in the URL: query strings end up in
        # proxy logs, error messages and tracebacks.
        url = f"{self.base_url.rstrip('/')}/models/{self.model}:generateContent"
        response = httpx.post(
            url,
            json=payload,
            headers={"x-goog-api-key": self.api_key},
            timeout=self.timeout_s,
        )
        response.raise_for_status()
        body = response.json()
        if "candidates" not in body or not body["candidates"]:
            raise RuntimeError(f"No Gemini candidates returned for task '{task}'")

        parts = body["candidates"][0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if not part.get("thought", False)]
        response_text = "".join(text_parts).strip()
        if not response_text:
            raise ValueError("Gemini returned an empty non-thought response")

        try:
            parsed = json.loads(response_text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Gemini returned invalid JSON: {exc}") from exc

        return parsed

    @staticmethod
    def _translate_schema_for_gemini(schema: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(schema, dict):
            return schema

        translated = dict(schema)
        if "type" in translated and isinstance(translated["type"], str):
            translated["type"] = translated["type"].upper()
        elif "type" in translated and isinstance(translated["type"], list):
            translated["type"] = [item.upper() if isinstance(item, str) else item for item in translated["type"]]

        if "properties" in translated and isinstance(translated["properties"], dict):
            translated["properties"] = {
                key: _GeminiProvider._translate_schema_for_gemini(value)
                for key, value in translated["properties"].items()
            }

        for disallowed_key in [
            "additionalProperties",
            "minLength",
            "maxLength",
            "minItems",
            "maxItems",
        ]:
            translated.pop(disallowed_key, None)

        if "items" in translated and isinstance(translated["items"], dict):
            translated["items"] = _GeminiProvider._translate_schema_for_gemini(translated["items"])

        return translated


class LLMGateway:
    def __init__(
        self,
        models_cfg: str = "config/models.yaml",
        *,
        trace: TraceSink | None = None,
        provider: Any | None = None,
        cache_path: str | None = None,
    ) -> None:
        self.models_cfg = Path(models_cfg).resolve() if Path(models_cfg).is_absolute() else (Path(__file__).resolve().parents[3] / models_cfg)
        self.root = self.models_cfg.parent.parent
        with self.models_cfg.open("r", encoding="utf-8") as fh:
            self.config = yaml.safe_load(fh) or {}

        self.llm_cfg = self.config.get("llm", {})
        self.tasks = self.llm_cfg.get("tasks", {})
        self.provider = provider
        self.trace = trace
        self.cache_path = Path(cache_path) if cache_path else (self.root / self.llm_cfg.get("cache", {}).get("path", "cache/llm_cache.sqlite"))
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._cache_conn = self._connect_cache()
        # Built on first use, inside the running loop. On Python 3.9 creating a
        # Semaphore outside a loop raises "There is no current event loop".
        self._concurrency = max(1, int(self.llm_cfg.get("concurrency", 1)))
        self._semaphore: "asyncio.Semaphore | None" = None

    def _connect_cache(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.cache_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS llm_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        return conn

    def _emit_trace(self, *, step: str, message: str, meta: dict[str, Any] | None = None) -> None:
        if self.trace is None:
            return
        event = {
            "type": "trace",
            "step": step,
            "message": message,
            "ts": int(time.time()),
        }
        if meta is not None:
            event["meta"] = meta
        self.trace.emit(event)

    def _read_prompt_template(self, task: str) -> tuple[str, str]:
        task_cfg = self.tasks.get(task)
        if task_cfg is None:
            raise KeyError(f"Unknown LLM task '{task}'")

        prompt_file = (self.root / task_cfg["prompt_file"]).resolve()
        text = prompt_file.read_text(encoding="utf-8")
        if text.startswith("---"):
            parts = text.split("\n---\n", 1)
            if len(parts) == 2:
                return parts[0].replace("---\n", "", 1), parts[1].strip()
        return "", text.strip()

    def _render_prompt(self, task: str, inputs: dict[str, Any]) -> str:
        _, raw_prompt = self._read_prompt_template(task)
        rendered = raw_prompt
        for key, value in inputs.items():
            placeholder = "{{" + str(key) + "}}"
            rendered = rendered.replace(placeholder, str(value))

        missing = set()
        for token in self._extract_placeholders(raw_prompt):
            if token not in inputs:
                missing.add(token)
        if missing:
            raise ValueError(f"Missing prompt inputs for task '{task}': {sorted(missing)}")
        return rendered

    @staticmethod
    def _extract_placeholders(text: str) -> set[str]:
        placeholders = set()
        start = 0
        while True:
            start = text.find("{{", start)
            if start == -1:
                break
            end = text.find("}}", start + 2)
            if end == -1:
                break
            placeholders.add(text[start + 2 : end])
            start = end + 2
        return placeholders

    def _load_schema(self, task: str) -> dict[str, Any]:
        task_cfg = self.tasks.get(task)
        if task_cfg is None:
            raise KeyError(f"Unknown LLM task '{task}'")
        schema_path = (self.root / task_cfg["schema_file"]).resolve()
        with schema_path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def _cache_key(self, task: str, inputs: dict[str, Any], *, cache_id: str | None = None) -> str:
        task_cfg = self.tasks[task]
        prompt_text = self._render_prompt(task, inputs)
        schema_text = json.dumps(self._load_schema(task), sort_keys=True)
        payload = json.dumps(
            {
                "task": task,
                "cache_id": cache_id,
                "prompt": prompt_text,
                "model": task_cfg.get("model"),
                "schema": schema_text,
            },
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _cache_get(self, key: str) -> dict[str, Any] | None:
        row = self._cache_conn.execute(
            "SELECT payload FROM llm_cache WHERE cache_key = ?",
            (key,),
        ).fetchone()
        if row is None:
            return None
        return json.loads(row[0])

    def _cache_set(self, key: str, payload: dict[str, Any]) -> None:
        self._cache_conn.execute(
            "INSERT OR REPLACE INTO llm_cache (cache_key, payload, created_at) VALUES (?, ?, ?)",
            (key, json.dumps(payload, sort_keys=True), int(time.time())),
        )
        self._cache_conn.commit()

    def _validate_output(self, task: str, payload: dict[str, Any]) -> None:
        validator = jsonschema.Draft202012Validator(self._load_schema(task))
        errors = sorted(validator.iter_errors(payload), key=lambda e: e.path)
        if errors:
            detail = "; ".join(f"{list(err.path) or '<root>'}: {err.message}" for err in errors)
            raise ValueError(f"Validation failed for task '{task}': {detail}")

    def _dry_run_payload(self, task: str) -> dict[str, Any]:
        fixture_candidates = [
            self.root / "tests" / "fixtures" / f"{task}.json",
            self.root / "backend" / "tests" / "fixtures" / f"{task}.json",
            Path(__file__).resolve().parents[2] / "tests" / "fixtures" / f"{task}.json",
        ]
        for fixture_path in fixture_candidates:
            if fixture_path.exists():
                with fixture_path.open("r", encoding="utf-8") as fh:
                    return json.load(fh)
        return {
            "functional_problem": "A mechanism that adapts to irregular shapes with minimal sensing.",
            "constraints": ["low complexity", "reversible attachment"],
            "mechanism": "Local compliance changes a flexible surface into a stable holding state.",
            "domain_tags": ["robotics", "mechanical design"],
        }

    @staticmethod
    def _dry_run_enabled() -> bool:
        return os.getenv("LLM_DRY_RUN", "").strip().lower() in {"1", "true", "yes", "on"}

    def _get_semaphore(self) -> "asyncio.Semaphore":
        """Create the semaphore on first use, inside the running loop."""
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self._concurrency)
        return self._semaphore

    async def arun(self, task: str, inputs: dict[str, Any], *, cache_id: str | None = None, run_id: str | None = None) -> LLMResult:
        task_cfg = self.tasks.get(task)
        if task_cfg is None:
            raise KeyError(f"Unknown LLM task '{task}'")

        cache_key = self._cache_key(task, inputs, cache_id=cache_id)
        cached = self._cache_get(cache_key)
        if cached is not None:
            self._emit_trace(
                step="cache_hit",
                message=f"Using cached result for {task}",
                meta={"task": task, "cached": True, "attempt": 1, "ms": 0},
            )
            return LLMResult(
                data=cached["data"],
                cached=True,
                model=task_cfg["model"],
                attempts=1,
                latency_ms=0,
                usage=cached.get("usage"),
            )

        if os.getenv("LLM_CACHE_ONLY", "").strip().lower() in {"1", "true", "yes", "on"}:
            raise LLMFailure("cache_only_miss", f"No cache entry for task '{task}' in cache-only mode")

        prompt = self._render_prompt(task, inputs)
        schema = self._load_schema(task)

        provider = self.provider
        if provider is None:
            if self._dry_run_enabled():
                start = time.perf_counter()
                payload = self._dry_run_payload(task)
                self._validate_output(task, payload)
                self._cache_set(cache_key, {"data": payload, "usage": {"dry_run": True}})
                latency_ms = int((time.perf_counter() - start) * 1000)
                return LLMResult(data=payload, cached=False, model=task_cfg["model"], attempts=1, latency_ms=latency_ms, usage={"dry_run": True})

            api_key = os.getenv(self.llm_cfg.get("api_key_env", "GEMINI_API_KEY"), "")
            if not api_key:
                start = time.perf_counter()
                payload = self._dry_run_payload(task)
                self._validate_output(task, payload)
                self._cache_set(cache_key, {"data": payload, "usage": {"dry_run": True}})
                latency_ms = int((time.perf_counter() - start) * 1000)
                return LLMResult(data=payload, cached=False, model=task_cfg["model"], attempts=1, latency_ms=latency_ms, usage={"dry_run": True})
            provider = _GeminiProvider(
                api_key=api_key,
                base_url=self.llm_cfg.get("base_url", "https://generativelanguage.googleapis.com/v1beta"),
                model=task_cfg["model"],
                timeout_s=int(task_cfg.get("timeout_s", 30)),
            )

        attempts = 0
        last_error: str | None = None
        for attempt in range(1, int(self.llm_cfg.get("retries", {}).get("transport", 3)) + 1):
            attempts = attempt
            try:
                payload = provider.generate(task=task, prompt=prompt, schema=schema, inputs=inputs)
                self._validate_output(task, payload)
                self._cache_set(cache_key, {"data": payload, "usage": {"provider": "gemini"}})
                return LLMResult(
                    data=payload,
                    cached=False,
                    model=task_cfg["model"],
                    attempts=attempt,
                    latency_ms=0,
                    usage={"provider": "gemini"},
                )
            except ValueError as exc:
                last_error = str(exc)
                if attempt >= int(self.llm_cfg.get("retries", {}).get("validation", 2)):
                    raise LLMFailure("validation", str(exc)) from exc
                self._emit_trace(
                    step="llm_retry",
                    message=f"Validation retry for {task}",
                    meta={"task": task, "cached": False, "attempt": attempt, "error": str(exc)},
                )
                prompt = prompt + f"\n\nValidation feedback:\n{exc}"
                continue
            except Exception as exc:
                last_error = str(exc)
                if attempt >= int(self.llm_cfg.get("retries", {}).get("transport", 3)):
                    reason = "timeout" if "timeout" in str(exc).lower() else "provider_error"
                    raise LLMFailure(reason, str(exc)) from exc
                self._emit_trace(
                    step="llm_retry",
                    message=f"Transport retry for {task}",
                    meta={"task": task, "cached": False, "attempt": attempt, "error": str(exc)},
                )
                continue

        raise LLMFailure("provider_error", last_error or "LLM call failed")

    def run(self, task: str, inputs: dict[str, Any], *, cache_id: str | None = None, run_id: str | None = None) -> LLMResult:
        return asyncio.run(self.arun(task, inputs, cache_id=cache_id, run_id=run_id))

    def run_many(
        self,
        task: str,
        items: list[dict[str, Any]],
        *,
        id_key: str,
        retry_file: str,
        concurrency: int | None = None,
    ) -> dict[str, Any]:
        retry_path = Path(retry_file)
        retry_path.parent.mkdir(parents=True, exist_ok=True)
        limit = concurrency or int(self.llm_cfg.get("concurrency", 1))
        semaphore = asyncio.Semaphore(limit)

        async def worker(item: dict[str, Any]) -> dict[str, Any]:
            async with semaphore:
                item_id = str(item.get(id_key, "unknown"))
                try:
                    return {"id": item_id, "result": self.run(task, item, cache_id=item_id)}
                except Exception as exc:
                    entry = {"id": item_id, "task": task, "item": item, "error": str(exc)}
                    with retry_path.open("a", encoding="utf-8") as fh:
                        fh.write(json.dumps(entry, sort_keys=True) + "\n")
                    return {"id": item_id, "error": str(exc)}

        async def _run_all() -> list[dict[str, Any]]:
            return await asyncio.gather(*(worker(item) for item in items))

        results: list[dict[str, Any]] = asyncio.run(_run_all())
        summary = {
            "total": len(items),
            "succeeded": sum(1 for entry in results if "result" in entry),
            "failed": sum(1 for entry in results if "error" in entry and "result" not in entry),
            "results": results,
        }
        return summary
