# The Hollow Ledger — achievement plan

**64 achievements / 1,000 non-spendable Haunt Score. Planning and UI prototype only.**

The proposed launch set contains 16 Early, 20 Mid, 16 Late and 12 Secret achievements. A compact animated unlock pill opens the precise “What you did” detail; an on-demand library groups goals, progress and hidden discoveries. Existing Memories/Favours and game saves are part of the integration design, not modified by this package.

## Review order

1. Open [preview.html](preview.html) in a browser for the standalone interactive concept. It works offline and uses sample progress only. Click **Preview unlock**, then the notification; open the library to try phase filters, search and secret hints.
2. Read [PLAN.md](PLAN.md) for presentation, queue behaviour, rewards, save/evidence design and delivery phases.
3. Browse the complete [64-entry catalogue](CATALOGUE.md), or use [catalogue.json](catalogue.json) as structured design data.
4. Give Claude [CLAUDE-HANDOVER.md](CLAUDE-HANDOVER.md), the [dependency matrix](DEPENDENCIES.md), [evidence audit](EVIDENCE-AUDIT.md) and [asset brief](ASSET-BRIEF.md).
5. Check [VALIDATION.md](VALIDATION.md) for exactly what was verified. The prototype is not a newly built playable achievement system.

| Group | Count | Score |
| --- | --- | --- |
| Early — Finding your feet |16|80|
| Mid — A proper little haunt |20|300|
| Late — Legends of the Hollow |16|400|
| Secrets — Small, strange discoveries |12|220|
| Total |64|1,000|

Secrets include a paired Freddy/Jason costume moment, a deliberately rotated chair, meeting all three pets, careful boost rhythm and a multi-business service window. Exact solutions are in the catalogue for implementation; the prototype conceals them until earned or explicitly revealed.

Haunt Score is a collection tally. It grants no income multiplier or level XP. The catalogue uses fixed launch sets and exact evidence, avoiding fake global rarity percentages, duplicated Favour payments or fabricated old manual-action history. The final badge depends on the other 63 fixed IDs; village content is reserved for a later separate volume.

## Portable source

Source branch: `plan/achievement-ledger`, based on `87714df8a6e3f158ce3e6e6279f14777e5749954`. Copy only `voxel/docs/plans/achievements/` or cherry-pick the planning commit; this folder has no runtime edits. The helper/thermal criteria require the separately delivered farm-work patch or equivalent lead integration.

To rebuild the standalone preview after changing the design data:

```sh
node build-preview.mjs
```

The local `background-reference.png` is a frozen verified game screenshot used only in this concept. The template, data and source image are bundled so the folder is portable. `launch-sets.json` freezes the currently reviewed 18 recipes, 20 costumes, 5 varieties and 5 shapes. Production badge art, sound, source event counters, runtime rules and actual save migration remain implementation work.
