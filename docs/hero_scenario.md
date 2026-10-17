# Hero Scenario (LOCKED at Hour 2)

**Robot grasping ← granular jamming.** Everything in the demo is judged against whether this lands.

## The scenario

| | |
|---|---|
| **Researcher** | A robotics engineer building a pick-and-place end effector |
| **Home field** | `robotics_mech_eng` |
| **Source field (expected)** | `soft_matter_stat_physics` |
| **Why this case** | Near-zero keyword overlap ("gripper, grasp" vs "jamming transition, packing"), a crisp structural abstraction, and an explanation the audience gets in ten seconds |

**Input text (frozen; do not edit without an amendment):**

> We are designing an end effector that must pick up objects of unknown, irregular shape (mugs, tools, produce) without per-object programming. Fingered grippers need force sensing and complex control, and they fail on deformable or odd geometries. We want a passive mechanism that conforms to any shape and then holds firmly, with minimal sensing or planning.

**Expected collision:** the jamming transition in disordered granular matter, where an assembly of particles switches from fluid-like to rigid as confinement or packing increases.

**Acceptable source papers** (also the pre-registered hit list in `config/validation_cases.yaml`):
O'Hern et al. 2003 (PRE) · Cates et al. 1998 (PRL) · Liu & Nagel 2010 (Annu. Rev. Condens. Matter Phys.) · Trappe et al. 2001 (Nature)

**Outcome reference, NOT in the corpus:** Brown et al., PNAS 2010, "Universal robotic gripper based on the jamming of granular material." This is the paper that actually did it. Use it on a slide as the "what happened in history" reference. It must never be retrievable.

**The aha line:** *"Wait, it's the vacuum-packed coffee brick thing?"*

## Honest framing (say this, don't hide it)

- This is a **known, historical** collision. The question we ask is *"would this system have surfaced it?"* We are not claiming a new discovery.
- The real gripper came from physicists and roboticists who were already collaborating. That is the problem this tool exists to solve.
- Hero and validation use the same discipline: the hero is a **dev** case, so we do not present it as an untuned result. The held-out cases carry the proof.

## Demo beats (what Person A runs)

1. Paste the input. Press **Find collisions**.
2. Trace streams: *abstracting → decomposing → retrieving → reviewing* (→ *rewriting* if the reviewer rejects candidates).
3. The top result card shows a jamming paper, its **source passage**, and the **mapping table**.
4. The skeptic's note appears: where the analogy breaks.
5. Aha.

## Target mapping (human-written planning aid; the real output must come from the system)

| Source concept | Home-field concept |
|---|---|
| Jamming transition (fluid-like to rigid) | Gripper switching from compliant to rigid |
| Granular particles | Flexible membrane filled with particulate |
| Packing fraction / confining pressure | Applied vacuum level |
| Force chains | Load-bearing contact network around the object |

**Illustrative skeptic note:** holding force depends on friction and confinement, so very smooth, heavy, or delicate objects are likely harder. *(Illustrative only. Do not hard-code it.)*

## Slide 3 (draft)

| Step | Content |
|---|---|
| Home-field text | "Pick up objects of unknown shape without per-object programming…" |
| Abstraction | "A mechanism that is soft and conformal on command, then rigid on command, driven by one global signal." |
| Match in another field | Jamming transition in granular matter (physics) |

**Rule: the abstraction on slide 3 starts as a hand-written placeholder. Replace it with the system's real output by Hour 6.** A hand-written abstraction must never be shown as if the system generated it.

## Hero rules

- The input text is frozen. Do not tune the input to make the system look better.
- The jamming case and its seed papers are **never** used as few-shot examples.
- The hero must produce a real collision by **Hour 6**, before anyone builds UI around it. If it doesn't, we find out then, not at Hour 15.
- Cached for instant replay. Backups (Physarum, kidney exchange) are cached only **after** the Hour 14 gate, because they are held-out cases.
