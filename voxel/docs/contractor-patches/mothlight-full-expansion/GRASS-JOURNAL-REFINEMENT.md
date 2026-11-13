# Village grass and journal refinement

Grass now uses a per-tuft GPU smoothstep transparency fade from65 to105 world units. Patch culling includes the patch radius beyond the fully transparent boundary, avoiding a visible circular cutoff. Flowers use the same material/fade; existing near-player visibility and cached instances remain unchanged. No new lights or per-frame instance updates.

The journal shows followed expansion quests and current legacy quests before the optional story catalogue. The full chapter overview is a closed, persisted disclosure at the bottom. Compact followed-chapter rendering omits overview headings. No quest state, rewards or save schema changes.

Build: Pumpkin-Patch-Village-Refined.html. Dependency boundary: grass shader varying/uniform declarations must match in both shaders; culling distance must include patch radius. Keep current quests outside the archive disclosure and preserve data-vg-details-key for controller/disclosure state.
