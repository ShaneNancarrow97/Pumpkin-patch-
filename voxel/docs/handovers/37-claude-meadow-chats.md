# 37 — Claude: guests who stop for a cocoa and a chat, and comforts that make the meadow popular

For Codex. Follows handover 36, which said the meadow chat plan wasn't built. It is now. Base your next branch on the head of `voxel-reference`.

## What it does

Once Sandy's stand is open, some guests stop in the meadow on their way home to chat. Upgrading the stand opens more places to chat, and the groups grow as others join. Someone may fetch a cocoa and come back with a mug. Tap a group's speech marker, or any of them, to read what they're saying. They talk about what's new on the farm and about their own evening.

The plan, and what changed from it, is in `docs/plans/meadow-chatter.md`.

## The comforts

The owner asked for upgrades to make the meadow more popular. These are five comforts, bought once each from Sandy's menu under "Make the meadow popular" (`MEADOW_COMFORTS`, `buyComfort`, `comfortOwned`). They are saved in `s.festival.comforts`.

Each comfort adds `COMFORT_FOOTFALL` (3%) to arrivals through `meadowFootfallBonus`. It is a lasting attraction like the maze, so `streakPathBoost` doesn't count it. Each also has its own effect:

| Comfort | Stand tier | Price | Effect |
| --- | --- | --- | --- |
| Fairy-light bunting | 1 | £450 | Chat chance ×1.3. Lights strung between the edge lantern posts. |
| Blankets and cushions | 1 | £900 | Chats last 15 seconds longer, and a lone guest waits 25 seconds instead of 15. Tartan on the benches and bales. |
| Souvenir mugs | 2 | £1,500 | One refill of plain cocoa after 15 seconds of talk, so at most two drinks a visit. Mugs hang under the awning. |
| A dance floor | 2 | £2,600 | A fourth spot for five, with a gramophone whose notes float up. Guests reach it along the lane and leave by the farm gate. |
| Sandy's cocoa trolley | 3 | £4,200 | Chatters are served where they stand: no queue, and no limit of one away per group. |

**In a 20-minute run with all five at stand tier 3:**
- visitors +17%;
- pumpkin takings +12%;
- cocoa takings more than doubled.

They pay back in roughly an hour of play.

## Where it lives

- **`content/festival-meadow.js`:**
  - `CHAT_SPOTS`: a ring of places at each spot, plus the walks to the spot, to Sandy and home, each clear of the props;
  - `chatPlace`: where each guest stands in the ring.
- **`rules/meadow-chat.js`:**
  - `planChat`: the roll, made once at `leaveAt` after the maze-after roll;
  - `tickChat`: to-spot → chatting ⇄ cocoa-run → cocoa-queue → cocoa-serving → cocoa-back → leaving → gone;
  - `updateChats`: one line every 3.5 to 5 seconds per group.
- **`rules/meadow-talk.js`:**
  - `recordNews`: diffs the farm each step into `s.social.news`, the last 16 items;
  - `topicsFor` and `converse`: deterministic topics and lines.
- **`rules/selling.js`:** `visitorReservations` and `onThePath` skip chatters, the stall loop hands them to `tickChat`, and gone chatters are filtered out.
- **`rules/festival-meadow.js`:**
  - `inCocoaQueue` and `cocoaQueueRank` count chatters in Sandy's queue, placed by when they set off;
  - `meadowWalk` is exported.
- **`rules/cocoa-menu.js`:** `quoteStandOrder(s, v, reserve = true)`. A chatter quotes with `reserve` false, because their pumpkins are already bought.
- **Drawing:**
  - `scene.js`: chatters are an excursion like `v.festival`; markers and bubbles live in `#chat-layer`, `scene.chatLine(e)` handles each line, and `scene.chatMarkers` is for tests;
  - `festival-meadow-world.js`: `chatDressing(level)`;
  - `sprite-actors.js`: `animateVisitor` takes a `turn` flag.
- **UI:**
  - `ui/chat-card.js`: the Overheard card;
  - `ui/guest-card.js`: the "Listen in" button;
  - `ui/meadow-chat.css`.

## Rules to keep

- **No decision changes.** Without comforts, pumpkin income, items sold and arrivals are identical with chat on and off; a test checks this. Comforts add visitors only through the footfall bonus. Any new end-of-visit choice must come before the chat roll.
- **Chatters never block arrivals**, and no spot holds more than it has places (`chatCap`).
- **One drink a guest, or two with souvenir mugs.** `payStandOrder` refuses a second unless `buyDrink` sets the receipt aside for a refill. A chatter's pocket money tops their purse up to the plain cocoa's price, never more.
- **Nothing is saved.** `saveData` drops `s.social`, and a loaded farm has no chatters.

## Verification

- **`npm test`:** 282 pass, with 14 new tests in `test/meadow-chat.test.mjs`. Besides the comforts, they cover:
  - the spots and walks clear the paths and props;
  - arrivals and pumpkin sales are unchanged;
  - chats start only when a guest has finished;
  - the caps hold;
  - the time limits and the lone guest leaving;
  - a save loads clean;
  - the talk reflects the news;
  - the queue order.
- **`tools/economy-sim.mjs`:** identical output. It never buys the meadow.
- **A headless meadow run:**
  - cocoa takings rise about 8% at level 1 and about 70% at level 3;
  - that is under 1% of the farm's income;
  - pumpkin income is unchanged.
- **Old QA scripts:** `tools/qa-festival-meadow.mjs`, `qa-sandy-cocoa.mjs` and `qa-festival-refinement.mjs` time out. They do the same on the build from before the chats, because the opening introduction covers their first click. They need updating to skip the intro (`PumpkinVoxel.intro.skip()`).
- **Browser checks at desktop, phone and Fold sizes:**
  - groups at the benches and the brazier;
  - the marker opening the card, and Escape closing it;
  - speech bubbles when zoomed in;
  - no page errors.
