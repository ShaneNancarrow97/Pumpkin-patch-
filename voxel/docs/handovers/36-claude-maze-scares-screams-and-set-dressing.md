# 36 — Claude: scares at the screen, screams, and a dressed maze

For Codex. Follows handover 35. Base your next branch on the head of `voxel-reference`.

## What changed since 35

**Scares that leap at the screen** (`maze-ride-view.js`, `maze-ride-actors.js`)
- In full motion, each scare rushes from its mark into the lens, holds there filling the view, then is gone.
- The timing and framing come from `MAZE_JUMP` (`rush`, `hold`, `distance`, `face`).
- On impact the camera jolts and a pale light flares on the face. The `glare` option in `animateMazeScareActor` keeps the face from washing out.
- Gentle motion keeps the old lunge at a distance.
- A test checks that the actor reaches the lens, faces the camera and is hidden a second later.

**Screams and loud hits** (`ui/maze-audio.js`, `ui/maze-ride-ui.js`, `ui/maze-ride.css`)
- Every scare plays the actor's own scream (`SCREAMS`, matched to each actor by `VOICE_OF`): a ghoul, the scarecrow, the haunted girl, a wraith or the clown's laugh.
- Each scream comes with a stinger. The ghoul and the scarecrow add a slam; the others add a screech.
- Scare sounds go through their own bus with a hard compressor, so they are loud without clipping.
- Now and then a muffled scream sounds from somewhere deeper in the house.
- A white flash fires inside the veil on each scare. Reduced motion turns the flash off with the other animations.

**Set dressing** (`maze-ride-world.js`)
- **Why it's laid out this way:** the walk looks forward, so props on a room's far side are rarely seen. The dressing goes where the eye lands:
  - the near wall;
  - overhead;
  - the walls at each end of a room;
  - the corridors.
- **Keeping props off the walk:** `F.free(u, w, hu, hw, gap)` is `F.clear` plus a distance from the rail (`railGap`). Use it for anything new, so nothing comes near the eye's path.
- **Cobwebs:** they fan into the corners and stretch along the beams (`cornerWeb`, `strand`, `webs`).
- **Clutter per chamber** (`CLUTTER`):
  - crates, trunks, sheeted chairs, books, bottles, leaning frames, a doll, dust and papers;
  - bones in the crypt.
- **Each chamber's set** (`SETS`, laid out by `setPiece`):
  - **The near wall:** open shelves of jars, books, crates or skulls (`nearRun`).
  - **Overhead:** cages, herbs, sacks, chains, a puppet, bare bulbs, censers or bats (`overhead`).
  - **The end walls:** paintings with picture lights and a side table or chair either side of the door (`endWalls`).
- **The corridors** (`dressCorridors`) have:
  - a painting every 1.3 to 1.8;
  - where there's room, a side table with a candle, a chair, a bust, a grandfather clock, a dead plant, a coat rack, a mirror, fallen frames or a glass case;
  - a worn runner down the middle.
- **Paintings** are in mid-tones so they read in the gloom: a portrait, a moonlit house, a still life with a skull, or a storm at sea. About half have a brass picture light.

**Cost:** about 6.5k boxes at foyer tier 1 and 33k at tier 5, still 5 batches. The world test's ceiling is 40,000, so new dressing has about 7k to spend.

**Also on the branch:** `docs/plans/meadow-chatter.md`, a plan for guests who stop for a cocoa and chat in the meadow. It is for review only. Nothing is built, so please don't start on it.

## The split from here

This changes handover 35 at the owner's request:
- **The Hollow House exterior on the farm** (`buildHollowExterior`, `hollow-house-farm.js`) is now **Codex's**. Claude has not pushed any exterior work, so start from the branch head.
- **The hayride** stays with Codex on `contractor/hollow-hayride`.
- **Claude** carries on with the maze interior and the walkthrough (`maze-ride-*.js`, `ui/maze-*.js`). Please leave those files alone until the next handover.

Handover 35's list (house furnishings, wallpapers, smoke coverage) still stands.

## Verification

- `npm test`: 268 pass.
- **Browser survey at desktop size, foyer tier 5 with every haunt on:**
  - every chamber on entry and mid-way;
  - every scare at its peak;
  - two points in each corridor.
- Screams were rendered offline and checked as spectrograms (harmonics, vibrato and the clown's laugh), and as levels (peaks near 1.0 after the compressor).
- `tools/qa-maze-ride.mjs`: 71 pass on this build (desktop, and phone and Fold sizes). It runs with reduced motion, so it covers the gentle path, not the leap.
