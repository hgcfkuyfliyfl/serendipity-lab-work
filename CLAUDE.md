# CLAUDE.md — Serendipity Lab

Read this file first in every session. Source of truth for scope: `serendipity_lab_v2_team_brief.md`, `docs/HOUR2_SIGNOFF.md`, `docs/cut_list.md`, `docs/hero_scenario.md`, `docs/llm_gateway_spec.md`, `config/*.yaml`. If this file and those disagree, those win. Tell the owner.

## What this project is

A hackathon tool (AI Agents track, 5 students). A researcher pastes a problem. We strip the field vocabulary into a structural abstraction, search OTHER fields for papers with the same structure, and return grounded "what-if" hypotheses. Every hypothesis carries a real `source_passage` and a `mapping`, and a skeptical reviewer says where the analogy breaks.

Locked hero: **Robot grasping ← granular jamming.** Home field `robotics_mech_eng`, expected source `soft_matter_stat_physics`. Input text is frozen in `docs/hero_scenario.md`. The outcome paper (Brown et al., PNAS 2010) is NOT in the corpus, by design.

Honest framing: this is a known historical collision. We ask "would the system have surfaced it?", not "we made a discovery".

## Job and stopping rule

Finish the integration work, then STOP and report. Do not start new features.

1. Backend: make responses match the frozen contract (below). Replace the 3-paper stub retrieval only if a real corpus/index exists in the repo. Never invent one.
2. Frontend (`frontend/`): connect to `POST /api/collide` and `GET /api/runs/{id}/stream` (SSE). The cached hero fixture stays as the fallback and the offline demo.
3. Test everything (see Testing). Click every button.
4. Add a Privacy Policy page (see below).
5. Final report: changed files, behavior changes, blocked items, checks run.

## Frozen contract (do not change without telling the whole team)

- `POST /api/collide` request `{ text, home_fields, chaos }`. `chaos` is accepted and ignored. Returns `{ run_id }`.
- `GET /api/runs/{id}/stream`, SSE. Trace event `{type:"trace", step, message, ts, meta?}`. `step` is only one of: `abstracting, decomposing, retrieving, reviewing, rewriting, translating, ranking, llm_retry, cache_hit, done`.
- Result event fields: `id, title, year?, venue?, doi?, source_field, structural_score (0..1), matched_on ("problem"|"mechanism"), heresy ("low"|"medium"|"high"), hypothesis, source_passage, mapping[{source_concept, home_concept}], reviewer_note`.
- `prior_art` is CUT. Remove it from backend schemas and never render it.
- `heresy` is derived server-side. No slider, no heresy-meter system.
- THE DROP RULE: a candidate with no `source_passage` or an empty `mapping` is dropped and never shown. Evidence rule in the UI: no passage + mapping = not grounded.
- Scores, heresy, hypotheses and reviewer notes in `frontend/src/mock/hero_run.json` are placeholders. Titles, years, DOIs and passages are real. Never reformat `frontend/src/mock/*.json`.

## Honesty rules (the product is trust)

- Never show fabricated data as real. No fake papers, fake scores, fake reviewer output, fake validation numbers.
- Label every result: cached fixture, live model, corpus retrieval, unverified.
- Custom input must never silently receive hero results. Show loading, empty, timeout, failure and retry states.
- The validation table says "Not run" until a real run exists. Show method, denominator, top-5 and top-10 separately.
- The abstractor must not name the answer (no solution leak in `domain_tags`/`mechanism`). Keep the leak check.
- Do not claim work that was not done or tested.

## Git and secrets (hard rules)

- NEVER commit to `main`. Work on a feature branch, small modular commits, push, open a Pull Request.
- NEVER hardcode keys, passwords or tokens. Keys live in a local `.env` (gitignored). `.env.example` holds placeholders only. Never print a key.
- Do NOT add "Co-Authored-By: Claude" or Claude session lines to commit messages. This owner's instruction overrides any tool default.
- Run `git status` before every commit. Confirm no `.env` and no secrets are staged.

## Stack

- Frontend: TanStack Start/Router, React 19, Vite, Tailwind 4, shadcn, GSAP, lucide-react, sonner. Strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Server calls via `createServerFn`.
- Backend: FastAPI in `backend/app`, config in `config/*.yaml`, prompts in `prompts/*.md`, schemas in `config/schemas/`. LLM = Gemini via the gateway (`config/models.yaml`, thinking budget 0). Gateway rules in `docs/llm_gateway_spec.md`.
- Prettier must not touch `frontend/src/mock/*.json` (see `.prettierignore`).

## Testing (mandatory before saying "done")

- Backend: run `pytest` in `backend/`. All pass, and add tests for what you change.
- Frontend: `npm run lint` / type check, then drive the real UI in a browser with Playwright (Chromium is installed; do not run `playwright install`). Check desktop (1280px) and phone (375px).
- Click EVERY button and link on every route: `/`, `/signin`, `/app/discover`, `/app/trace`, `/app/results`, `/app/candidate/:id`, `/app/validation`, `/app/saved`, `/app/settings`, `/app/pulse`, `/app/compare`, `/privacy`. Check hero replay, custom-text live run, failure and retry, empty state, keyboard use, no console errors, no horizontal scroll on phone.
- Report only what you actually ran. If a check could not run, say so.

## Privacy Policy page

Add route `/privacy` and link it from the landing footer, sign-in and Settings. Plain English. It must be true to what the app does today: pasted problem text is sent to the model provider (Gemini) to produce results; the demo sign-in stores nothing real; no analytics unless added; saved items live in the browser; no data is sold. State the provider, what is sent, what is stored and where, how to delete it, and a contact placeholder for the team. Do not invent legal claims. Mark it "prototype, not legal advice".

## UI/UX direction: futuristic, calm, credible

Mode: Operate (a research tool). Brand lives in precise details, not decoration.

- Feel: instrument-panel, scientific, futuristic. Dark-first with a true light theme. Dense, scannable, precise.
- Use the installed skills: `frontend-design`, `impeccable` (critique/polish/harden), `gsap-core` for motion, `design:accessibility-review`. Run polish and an accessibility pass before finishing.
- Motion (GSAP): purposeful only. Trace rows stagger in as real events arrive. A signal-line pulse follows the running step. Result cards rise on reveal. Number tickers on scores. Duration 150-400 ms, ease-out. Honor `prefers-reduced-motion` (turn motion off). Never animate things that imply data that does not exist.
- Type: a distinctive display face plus a clean text face and a mono for data/DOIs. Not Inter/Roboto/Arial as the identity. Real type scale, tabular numbers for scores.
- Color: one considered palette from CSS variables, with one sharp accent used rarely, plus semantic colors (grounded, ungrounded, warning, error). Contrast AA minimum. Do not rely on color alone.
- Layout: strong hierarchy, a real grid, generous but not empty space, varied rhythm. Mobile at 375px must work.
- Accessibility: visible focus, labels on inputs, keyboard path for everything, `aria-live` for the trace, alt text, 44px touch targets.

## Things AI always does — do NOT do these

- Purple/indigo-to-pink or blue-to-purple gradients; neon cyan + magenta on black; generic "glow" everywhere; the default Tailwind indigo-500/violet look.
- Glassmorphism cards on every surface; blurred blobs and gradient orbs in the background; gradient text on every heading.
- Identical rounded cards in a 3-column grid with an icon-in-a-circle on top; every card with the same shadow and radius.
- Emoji as icons or bullets; sparkle/✨ and rocket icons for "AI"; robot/brain/lightbulb clip-art.
- Hero cliches: "Unlock the power of…", "Supercharge your…", "Revolutionize…", "seamless", "cutting-edge", "next-gen", "game-changer", "leverage". Fake testimonials, fake logos, fake stats, "trusted by 10,000 teams".
- Centered-everything layouts, giant hero with two buttons and a floating mockup, a fake dashboard screenshot.
- Lorem ipsum, placeholder names ("John Doe"), "Acme", stock-photo people.
- Bouncy springs, parallax everywhere, auto-playing looping motion with no purpose, cursor trails.
- Excess `rounded-2xl`, everything `shadow-lg`, borders on every box. Pick a system and stick to it.
- Over-explaining UI with long helper text, tooltips on everything, and "Pro tip" banners.
- Dark mode that is just inverted colors. Pure `#000` on pure `#fff`.
- Em-dash-heavy, symmetrical, three-part marketing copy. Write plain, specific, short text.

## Working style for this owner (Wisdom)

- Plain, simple English. Short sentences. One instruction or command at a time. Concrete physical steps.
- If you give him Git commands, give one at a time and remind him of the branch and secret rules.
- When asked for research help, point him where to go; do not do his research for him.
- Final answers: a few sentences. List changed files and checks only in the final report.
