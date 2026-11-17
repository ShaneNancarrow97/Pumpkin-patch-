# Living Mothlight — contractor handover

This release finishes the first repeatable Hollow Green chapter inside the **full saved game**. It builds on the voiced Mothlight contractor release `e2cd697a993ae46d372420d7f966c1b99b5519ab`. Claude's lead was checked before starting and again before delivery; the checked lead is recorded in the release receipt.

Source branch: `contractor/mothlight-living-village`.

The working checkout is isolated. Claude's uncommitted checkout was not reset, cleaned, rebased or edited. These changes do touch the village integration files, so review the dependency matrix before combining with concurrent village work.

## What players can do

- Follow a specific quest, see exact material and coin requirements, hand over for that quest, find its gathering spots/pages, and revisit completed-story rewards.
- Restore Rowan's workshop and Elowen's conservatory through the existing authored stories. See a restoration notification and the changed exterior.
- Buy four permanent Rowan improvements: 60/80 material capacity, 15% shorter gathering waits, and one extra log/stone per pile. These use existing coins/materials and story gates.
- Furnish the Green with stored copies or purchases from Rowan. Move, drag, turn in 15° steps, store, cancel, undo and place. Elowen's reading nook is an actual placement objective.
- Read the almanac's four active duties and next keepsake. The existing simulation awards completed duties/pages automatically; the UI cannot award them again.
- See Elowen and Rowan walk short, reachable routes and stop to talk. Painted identities, true authored walk frames, shared scale and foot anchors are preserved.
- Enjoy the Moth Tree's brass-and-ivory landmark, votives, plaza mosaics, restored-home details, moths and fireflies.

## Controls and presentation

The village has twin touch sticks, a thumb-side interaction button, camera centre, jogging, character switching and a fullscreen button. Controller activity switches to a compact legend. A connected but idle controller does not remove touch controls.

Standard-mapped PS5 controls: left stick walks, right stick looks, Cross interacts, Circle goes back, Options opens the journal, Square opens the map, Triangle opens neighbours, R2 jogs, R3 recentres, L1/R1 zoom one step. Menus support D-pad/stick navigation, repeat, scrolling, native disclosures and inputs. Decoration uses left stick/D-pad positioning, L1/R1 turning, Cross placing, Circle cancelling and Square storing.

Modal transitions, blur, disconnect and reconnect suppress inherited held input. One scale is applied per TV surface. The world/input viewport remains unscaled; touch targets retain their size when TV mode is used without a controller. Purple panels, cream type and amber purchase actions match the farm.

## Important fixes

- Buying the food truck and loading an unpurchased kitchen now preserve valid gifted recipes, including Elowen's ghost cookies.
- Food favours require the player to be able to cook that recipe. Incompatible old food requests are repaired. Gifts and favours cannot spend meals reserved for customers.
- Parallel handovers can name a quest ID, so a blocked request cannot hide an affordable one.
- Village decor uses shared rotation-aware bounds for placement and walking. Ground, water, paths, doors, gathering nodes and people are protected.
- Undo restores only a valid, inventory-conserving decoration arrangement. It does not roll back farm income, new purchases, friendship or quest rewards.
- Purchase updates retain panel scroll, focus and open disclosures.

## Integration

Read [DESIGN-AND-DEPENDENCIES.md](DESIGN-AND-DEPENDENCIES.md) for module ownership and effects, and [ROADMAP.md](ROADMAP.md) for the remaining chapters. Exact commits, artifact hashes and verified commands are in `RELEASE.md`.

Apply the incremental patch series only if the voiced contractor base is already present. The downloadable kit also has an alternative `from-voxel-reference/` series for the checked Claude lead; apply one series only. Otherwise merge/review this source branch with its earlier saved-village and voice commits. Do not apply both a merge and the same patches. Keep the existing single renderer, pooled lights, simulation clock and save serialization. No package or save-version change is needed.

`voxel/build.mjs` manually includes CSS. Keep all three new styles (`village-controls.css`, `village-decorate.css`, `village-chapters.css`) in that list when resolving conflicts.

No API key or live service is required by the delivered game. The earlier recorded narration stays embedded; this release did not spend ElevenLabs credits or generate additional voices.

## Validation limits

Automated browser checks emulate Fold viewport sizes, touch pointers and a standard-mapped controller. They do not establish physical Z Fold 7 performance, Bluetooth pairing, TV casting latency or native Safari file-opening behaviour. Chromium in the managed environment blocks local `file:` navigation, so the same standalone bytes are served over loopback with external requests checked. Please perform the final hardware acceptance on the user's devices.

Physical-device acceptance: unfold/refold while walking; use both thumbs; open/close menus with a held stick; pair/disconnect/reconnect DualSense; verify Cross/Circle and scrolling in TV mode; restore a home, place the nook and reload the downloaded HTML.
