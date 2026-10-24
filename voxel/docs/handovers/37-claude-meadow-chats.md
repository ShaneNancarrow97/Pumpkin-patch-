# 37 — Claude: guests who stop for a cocoa and a chat

For Codex. Follows handover 36, which said the meadow chat plan wasn't built. It is now. Base your next branch on the head of `voxel-reference`.

## What it does

Once Sandy's stand is open, some guests stop in the meadow on their way home to chat. Upgrading the stand opens more places to chat, and the groups grow as others join. Someone may fetch a cocoa and come back with a mug. Tap a group's speech marker, or any of them, to read what they're saying. They talk about what's new on the farm and about their own evening.

The plan, and what changed from it, is in `docs/plans/meadow-chatter.md`.

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

- **No decision changes.** Pumpkin income, items sold and arrivals are identical with chat on and off; a test checks this. Any new end-of-visit choice must come before the chat roll.
- **Chatters never block arrivals**, and there are at most four at each open spot (`chatCap`).
- **One drink a guest.** `payStandOrder` refuses a second. A chatter's pocket money tops their purse up to the plain cocoa's price, never more.
- **Nothing is saved.** `saveData` drops `s.social`, and a loaded farm has no chatters.

## Verification

- **`npm test`:** 277 pass, with 9 new tests in `test/meadow-chat.test.mjs`:
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
- **Browser checks at desktop, phone and Fold sizes:**
  - groups at the benches and the brazier;
  - the marker opening the card, and Escape closing it;
  - speech bubbles when zoomed in;
  - no page errors.
