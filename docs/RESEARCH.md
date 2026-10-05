# UX research: modern workout trackers

A short review of Hevy, Strong, Fitbod, JEFIT, StrengthLog and Alpha Progression.
The goal was to extract **patterns**, not designs: Setlog uses its own visual language.

## What the good ones have in common

| Pattern | Seen in | What it solves | Setlog decision |
|---|---|---|---|
| **Inline set rows** (set # · previous · kg · reps · ✓) | Strong, Hevy | Logging a set is 0–2 taps when values are pre-filled | Same row model; values are pre-filled from the previous set or from last session, so the common case is **one tap on ✓** |
| **"Previous" column per row** | Strong, Hevy | You see what to beat without leaving the screen | "Last time" block on every exercise card **and** ghost values in each row |
| **Auto rest timer on set completion** | Strong, Hevy, StrengthLog | No separate action to start resting | Starts automatically on ✓, sticky bar, ±15 s, skip; keeps running across navigation and reloads |
| **Double-progression suggestions** | Alpha Progression, Fitbod, StrengthLog | Removes the "what weight today?" decision | Rep range per exercise (default 8–12) + weight step; when all working sets hit the top of the range the card shows *Suggested: +2.5 kg*. Always a hint, never auto-applied |
| **Routines / templates** | All | Starting a known session in 2 taps | Routines with exercise list, target sets and superset groups |
| **PR badges** | Hevy, Strong, JEFIT | Motivation without a social feed | Weight / reps-at-weight / est. 1RM / set volume PRs, shown as a small toast |
| **Supersets as grouped cards** | Hevy, Strong | Clear A1/A2 ordering | Exercises share a group letter, rendered as A1, A2 with a coloured rail |
| **Per-exercise history + charts** | All | Long-term progress | Exercise screen: sessions list + top-set weight, est. 1RM and volume charts |
| **Custom exercises** | All | Gym-specific machines | Name, muscle group, equipment, notes |
| **Export** | Strong (CSV), Hevy (CSV) | Ownership of data | JSON backup + flat CSV (one row per set) |

## Pitfalls we avoid

- **Social feeds, likes, follows** (Hevy, JEFIT) – out of scope; they add screens between sets.
- **Mandatory accounts / paywalled export** – Setlog has no accounts; all data is local and exportable.
- **AI-generated full workouts** (Fitbod) – useful but heavy; post-MVP at best.
- **Dense dashboards on the home screen** – the home screen is one big *Start workout* button plus three small facts.
- **Small numeric keypads with tiny targets** – Setlog uses ≥ 44 px targets, ± steppers and native numeric keyboards (`inputmode="decimal"`).

## The rule

Every feature is weighed against one question: *does this help the user log the next set faster?*
