# Cut List (agreed at Hour 2, not discovered at Hour 16)

Three people, one of whom holds three roles. Tier 2 is **cut by default** and reinstated only with slack at Hour 14.

## Enforcement rule

- **Person B is the enforcer.** Nothing outside Tier 1 starts without B's explicit OK.
- Tier 1 is never cut, and nobody quietly drops a Tier 1 item to catch up. If Tier 1 is at risk, say so out loud to the team.
- The enforcer's job is to protect Tier 1 from the busiest person's own tendency to cut their irreplaceable work.

## Keep: Tier 1 (non-negotiable)

Input workspace · structural abstraction · cross-domain retrieval with home-field exclusion · agent loop with visible trace · what-if translator with provenance · skeptical reviewer · cached hero scenario.

## Never cut, at any hour, under any pressure

1. The skeptical reviewer
2. Provenance (`source_passage` + `mapping`) and the drop rule
3. The validation table
4. The cached hero scenario

## Cut now, no debate

| Feature | Why | Contract impact |
|---|---|---|
| Serendipity Slider | Field-adjacency design for a "wow" layer nobody needs to believe the thesis | `chaos` stays in the request schema, **accepted and ignored** by the backend |
| Prior-art check (prompt and UI) | Third on the brief's own cut list | `prior_art` is **removed** from the result schema. Person A must not render it |
| Sandbox bookmarks | A star button does not make the insight more provable | None |
| Side-by-side comparison view | Needs a second live path and frontend hours | None. The validation harness reports the baseline instead |
| Multi-source dropzone, PDF/MD export | Already Tier 3 | None. Roadmap slide only |
| Separate Heresy Meter system | Merged into a derived field | `heresy` stays in results, computed from topical distance with no extra model. A badge only if A has time |

## Reinstate at Hour 14 only if genuinely idle (in this order)

| Feature | Condition |
|---|---|
| Why-This-Collided inspector | Nearly free once provenance exists, and the demo's best moment. **First to reinstate** |
| Pulse map | Cheap static render only. Needs Person A's hours |

## Contract deltas from the brief (§9)

```text
POST /api/collide   request:  { text, home_fields, chaos }     -> chaos accepted, ignored
GET  .../stream     result:   prior_art REMOVED
                              heresy   derived: "low" | "medium" | "high"
                              adds:    matched_on: "problem" | "mechanism"   (optional, for the inspector)
```

## If we are behind at Hour 14

Drop in this order: Pulse map → inspector polish → heresy badge. Then stop. Do not touch Tier 1.
