# Village menus, farm space and level rewards — Claude handover

Contractor branch: `contractor/village-menu-refinement`. Base: `50afb77c5596189c57c48c7c8a4c379e9baa4b97` (the delivered Village Play Polish source). The lead branch was checked at `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`; its working checkout is untouched. Review this branch independently before integrating with Claude's concurrent work.

## Result

Village menus now lead with the action the player needs. The journal expands the followed story and folds other stories; the satchel starts with the four actual materials; workshops show available improvements before later or owned ones. Resident cards expose location and the next conversation or delivery. Conversations keep replies and closing controls reachable, contain keyboard focus, and restore their real opener.

Linked village pages have a Back trail. Back returns to the previous page with its scroll, expanded sections and logical focus; Close leaves the whole panel. Returning to a root shortcut starts a new trail. Leaving the village clears this transient navigation memory. A redraw or controller tick no longer resets restored focus to the first action.

The farm's east side has one shared dining plan for tables, seats, visitors and route geometry. The queue uses the service apron. Props beside Skyla's shop have moved onto its frontage or existing supports. A whole-world mesh test checks the clear strip along the shop entrance/exit paths. Buildings, village exit, service timing, prices and seating capacity retain their existing rules.

The level shortcut now uses an illustrated, numbered rank badge. Selecting it opens earnings and milestone requirements first, followed by a manual reward carousel. Free rewards are distinct from paid upgrade opportunities; cards name their actual purchase location, price and prerequisite caveat. Home and village blockers lead to their appropriate destination. Celebrations read already-committed reward receipts; browsing, dismissing or revisiting cannot grant more rewards. The Village bottom-bar shortcut has its own painted icon.

On a controller, L2 from the farm opens navigation across the top bar, crop actions and bottom bar. D-pad/left stick navigates, Cross selects, Circle/L2 returns. The first focus is the level badge; later visits remember the chosen bar action. Options retains the existing broader hub. Entry/exit releases held world inputs. Interior trigger scrolling and village controls retain their input owners.

The village legend uses the existing crisp PS5 glyphs and contextual amber action. Quest and Menus remain visible on Fold layouts; village panels show D-pad Navigate, Cross Select and Circle Back. The requested normal-render village controller screenshots are included with the final delta evidence. No village input binding changes were needed.

## Review and integration

Detailed parts: [Village pages](QUESTS.md), [Conversations](CONVERSATIONS.md), [Farm layout](FARM-CORNER.md), [Level rewards](LEVELS.md), [Art sources](LEVEL-ART.md), [Farm controller](FARM-CONTROLLER.md), [Five supplied songs](MUSIC.md). Download links, exact artifact hashes and final verification are recorded in `DELIVERY.md` when publication completes.

Start with `git fetch origin contractor/village-menu-refinement`, then inspect in a separate worktree. The patch kit applies in its listed order from the base above. If Claude's lead has advanced, port the affected functions deliberately rather than replacing whole concurrent files. Root integration lives in `src/main.js`, `src/index.html` and the CSS list in `build.mjs`; keep those small hooks when resolving conflicts.

| Change | Dependencies and affected consumers | Integration risk / protection |
| --- | --- | --- |
| East dining and queue layout | `cooking-layout`, `cooking-dining`, `cooking-visits`, `cooking-world`, farm mesh props | Keep one table/seat source for render and routing. Path-clearance and seat/route tests cover both. |
| Village panel trail | `village-game`, pure `village-panel-trail`, village controller focus | Preserve logical section keys and root-versus-linked navigation. Back restoration is checked with the real panel/controller adapter. |
| Quest and shop presentation | `village-chapters`, existing rule handlers and live redraw | No purchasing or quest logic replaced. Preserve `data-vg-*` selectors and the existing requirement checks. |
| Conversation focus and layout | `village-conversation`, narration selectors, conversation callbacks | Retain callback signatures and voice hooks. Replacement-dialogue sessions guard against stale focus restoration. |
| Level cards and requirements | Current model tables, saved level receipts, house/village requirements | Read-only descriptions use actual gates/costs. Reward application remains in existing level rules. |
| Illustrated badges and Village icon | Two compressed runtime images, metadata/helpers, main hook and CSS ordering | Sources/prompts/bakers retained. DOM numerals remain crisp; no numbers baked into the rank art. |
| L2 farm bars | Existing `pad-menu`, `play-controls`, input boundary and CSS | One existing input owner. Eligibility excludes active work, other menus, cursor, furniture and R3 camera mode. |

The song catalogue also includes all five new uploads, bringing it to 31 tracks. Original MIDI bytes and timing are retained; the existing Settings chooser and shuffle queue consume the expanded registry without another playback system. See MUSIC.md for credits, source hashes and timing checks.

Save version remains **18**. This update adds no persistent fields, dependencies, economy multipliers, progression gates or new purchases. Panel memory is transient. Existing saved furniture, unlocked areas, quests, recipes, stock and rewards retain their format.

## Verification scope

The `verification` folder separates baseline and each exact HTML candidate by hash. The earlier `final-cf6205ae` folder is explicitly pre-final: two findings were recorded and corrected, not relabelled as passing. The `final-cf0e1290` candidate passed 105 checks plus the separate 54-check standard smoke; screenshot review then caught initial reward-dot scrolling clipping the requirements heading. The final delta fixes that scroll and adds the requested clearer village legend, with its own exact-hash checks and screenshots. Reports identify their actual artifact hash, synthetic save/pad fixtures and software-rendering limits. Logic profiles that hold renderer draws are identified separately from normal-render screenshots. Viewport tests do not certify physical Fold 7, TV or Bluetooth controller hardware.

Run `npm test`, `npm run build`, `node tools/village-menu-refinement-qa.mjs <exact-html> <evidence-dir>` and the standard smoke runner. The delivery receipt records results and clean replay verification. Optional Android packaging follows publication of the checked HTML/ZIP and has its own native addendum; private signing material is excluded from the repository and contractor kits.
