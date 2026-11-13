# Claude handover: Mothlight design, cast and the first saved visit

Contractor branch: `contractor/village-design-and-cast`. Lead starting point: `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8` (6 November, stick cursor), after the village world and three interiors in handover 73. This patch builds on those pushes and retains the later home, kitchen, fishing and controller work; it does not reapply the earlier home contractor branch.

Read [RELEASE.md](RELEASE.md) for the exact tested commits, checks and downloadable files, and [DEPENDENCIES.md](DEPENDENCIES.md) before integrating the shared scene and input adapters.

## Why this part matters

The source already required the village introduction before patch level 4, while offering no way to travel there in the actual game. The new first-visit bridge connects the existing saved village rules to the farm. The standalone explorer remains a separate preview with temporary state.

The visual pass keeps the world as the focus: purple surfaces, cream text, amber actions, compact navigation and contextual conversations. The new painted neighbours follow the existing visitor art, with shared size and foot anchors, distinct walking contacts and greeting frames. Their voxel versions remain available as a fallback.

## Integration

```sh
git fetch origin contractor/village-design-and-cast
git log --oneline 604fe2359427fc7e90a3d1248a6c4d1d6b0136c8..FETCH_HEAD
git diff --stat 604fe2359427fc7e90a3d1248a6c4d1d6b0136c8..FETCH_HEAD
```

Use a clean integration worktree and review overlaps in `main.js`, `scene.js`, `build.mjs`, village view/folk and More. Preserve ongoing lead changes. The dependency matrix identifies the shared adapters; new NPC art and metadata do not replace owner or visitor sheets.

## Parts to review

- **Saved Hollow Green:** travel from the farm, the invitation and tour, Elowen/Rowan conversations and quests, gathering, the stall and returning home. The first introduction uses the existing quest rules and saved state rather than preview restoration switches.
- **Three interiors:** the existing library, workshop and Velvet Bat are reached through the village's doors. Their hosts use the same painted identities indoors and outside.
- **Nine original NPC identities:** Elowen, Rowan, Vesper, Mabel, Tansy, Opal, Cinder, Corvus and Baron Brassbolt. Walking uses authored left/right contacts. A character's strip uses one scale and foot anchor across its frames.
- **Explorer interface:** Map, Neighbours, Walk and More replace the long permanent chip row. Preview switches stay under More, dialogue uses authored tone choices and world movement gives way to open panels.
- **Window detail:** restored cottages gain recessed warm panes, shutter hardware, planted boxes and closed roof joins within their existing bounds. Unrestored homes retain their boarded state.
- **Lighting and overlay refinement:** the restored conservatory uses muted lilac glass and seven small glowing panes; farm reward cards stay off the village playfield, and explorer room headings follow the actual interior.
- **Correctness:** hidden residents and closed-hall hosts no longer intercept taps; greeting duration uses the village clock; navigation and travel are checked against saved progression.

## Boundaries

Only Hollow Green has authored playable friendship and quest chains at this stage. The six later residents have artwork and profiles; their districts remain gated in the saved game. The explorer can preview the whole valley without granting that progress to a farm save.

This is not the complete village decorating, path-building or follower system. Those remain ordered in [ROADMAP.md](ROADMAP.md). Existing village economic and reward rules remain authoritative. Art availability does not make an unfinished district playable.

## Verification and delivery

```sh
cd voxel
npm test
node build.mjs --out /tmp/Pumpkin-Patch-Mothlight.html
node build.mjs --village --out /tmp/Mothlight-Village-Explorer.html
```

The browser checks use one Chromium with software WebGL, desktop, phone, landscape and Fold-size viewports. Their reports bind the screenshots to the exact HTML hash. Emulation does not certify physical-device performance or Bluetooth hardware. Full-size concept PNGs are kept outside the runtime imports; compact WebP atlases ship in the offline HTML.

Read [AUDIT.md](AUDIT.md) for the original findings, [DEPENDENCIES.md](DEPENDENCIES.md) for integration risks and [ROADMAP.md](ROADMAP.md) for the remaining expansion.
