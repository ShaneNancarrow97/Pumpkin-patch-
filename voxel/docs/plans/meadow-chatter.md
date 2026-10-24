# Plan: guests who stop for a cocoa and a chat

**Status:** built. The code is in `rules/meadow-chat.js` (who chats, and how they move), `rules/meadow-talk.js` (the news and what they say), `ui/chat-card.js` (the Overheard card), `scene.js` (markers and speech bubbles) and `festival-meadow-world.js` (dressing each spot). The tests are in `test/meadow-chat.test.mjs`.

## What changed from the plan

- **Pocket money for a cocoa.** By the time guests chat, the stall has nearly emptied their purses: £1 to £3 is usual, so almost nobody could afford a drink. A chatter without a drink now keeps enough pocket money for Sandy's plain cocoa, and never more. Pumpkin sales and arrivals come out identical with chat on and off (tested). Cocoa takings rise by about 8% at level 1 and about 70% at level 3, which still comes to under 1% of the farm's income.
- **The queue.** A chatter joins only while the queue leaves room for two arrivals. Their place goes by when they set off, so it is behind everyone already queuing and ahead of later arrivals (`cocoaQueueRank`). Nobody steps back.
- **Thirst** is on the needs' 0–100 scale: a chatter goes for a drink at 55 or more.
- **The spots moved.** The brazier is at (40.5, 13.5): at (44, 12), the booth's roof hid it. The benches spot sits just in front of the benches.
- **The dressing:**
  - level 1: a standing table with a candle and a mug;
  - level 2: a lantern post with two hay bales;
  - level 3: an iron brazier whose flames flicker.
- **A new conversation** opens on the freshest news under two minutes old, so new news comes up first.
- **Tapping a chatter** opens the Overheard card. Tapping a face in the card opens that guest's card, which has a "Listen in" button back to the chat.

## Why

Sandy's cocoa stand is a stop on the way in, then it's forgotten. This gives the meadow a social life:
- Guests who have finished shopping drift to a few chat spots off the paths.
- They form small groups, go for a cocoa, come back and talk about the farm.
- You can tap a group and read what they're saying, which reflects what has recently changed.

The point is to bring the farm to life without changing anyone's decisions or slowing arrivals.

## Ground rules

1. **No decision changes.** Chatting only begins after a guest's stall purchase (or missed sale) and maze choice are settled, at the moment they would set off home. The basket, the maze ticket and their order stay exactly as now.
2. **Arrivals keep coming.** Chatting guests don't count towards `visitorReservations` or `onThePath`, and the number of chatters has its own small cap. A busy farm gets as many new guests as it does today.
3. **The cocoa queue stays fair.** A chatter only joins the queue when it holds fewer than `MEADOW.queue - 1` guests, so arrivals always get a place.
4. **Small and bounded.** Chats are short, groups are small, nothing is saved. On load, anyone who was chatting simply walks home.

## Chat spots

New data in `content/festival-meadow.js`:

```js
// Spots to stand and talk, off every path, unlocked by the cocoa stand's level.
export const CHAT_SPOTS = [
  { id: "benches",  x: 43,   z: 22.6, seats: 4, level: 1 },  // by the existing benches (x 42/44, z 21.6)
  { id: "lantern",  x: 51.5, z: 15,   seats: 3, level: 2 },  // under a lantern post near the kiosk
  { id: "brazier",  x: 44,   z: 12,   seats: 4, level: 3 },  // round a brazier the pavilion adds
];
```

- **Positions:** the coordinates above are a first guess. A test checks each spot is at least 1.2 from every meadow path (`pathDistance`) and clear of the stand, signs and benches; move them until it passes.
- **Ring:** each spot has a ring of standing places at radius 0.85, evenly spaced and facing the centre. A guest takes the free place nearest their approach.
- **Upgrades:** each cocoa upgrade opens a spot and adds a little dressing: standing tables at level 1, a lantern bench at level 2, a brazier with warm light at level 3. That's what makes the stand feel worth upgrading.

## A guest's chat, step by step

Each guest gets one optional `v.social` record, separate from `v.festival` and `v.hollow`:

```
null ──(would leave; passes the roll)──▶ to-spot ──▶ chatting ⇄ cocoa-run ──▶ leaving ──▶ gone
                                                       │
                                                       └─(nobody comes for 15 s)──▶ leaving
```

**Who chats.** Decide once, when `v.leaveAt` is reached and the after-shopping maze roll has said no:
- `chance = base(stand level) × mood × room`.
  - `base(level)` is 0, 0.25, 0.35 or 0.45 for no stand and levels 1 to 3.
  - `mood` is 0.6 to 1.2, from `v.needs.happiness`. Guests who couldn't buy anything still chat, about that.
  - `room` is 0 when the chat cap is reached (below), otherwise 1.
- Roll from a hash of the guest's id, like the maze's `brave(id)`, so it's deterministic and testable.
- The meadow must be owned and Sandy's stand open.

**Which spot.** Weight each open spot by how many are already there:
- 1 if it's empty;
- 2.5 + members if it has one to three people (so groups grow);
- 0 if it's full.

Pick with the same hash, so a second guest usually joins the first, and you see a pair become a group.

**to-spot.** Walk from the counter along the meadow lane to the spot, using the existing `walk()` and route helpers, then take a ring place.

**chatting.** Stay for a seeded 25 to 55 seconds.
- A lone guest waits at most 15 seconds for company before leaving, so empty spots don't fill with loners.
- While someone is in a group, take turns "speaking" (below).

**cocoa-run** (the "grab a cocoa" moment). A member who has no drink goes for one when all of these hold:
- thirst is at least 0.55 (it already rises over time in `guest-needs.js`);
- nobody else in the group is already away for a drink;
- `wantsCocoa(s, v)` and `quoteStandOrder` say they can afford something from their remaining budget;
- the queue has room (ground rule 3).

They walk to the queue, pay through the existing `payStandOrder` (one drink each: `v.cocoaSpend` stops a second), then walk back to their ring place. They hold their mug, and if their chat time ran out while they were away, they stay a further 10 seconds.

**leaving.** Walk the existing `MEADOW_EXIT` route home. They then drop off the visitor list, as guests do today.

### Caps

- At most `4 × spots open` chatters (4, 8 or 12), and at most `seats` per spot.
- Chatters never block arrivals, since they're excluded from `visitorReservations`.
- To stop one busy evening filling the list, a chatter counts as "on the path" again if the farm already has more than `visitorCapacity + 12` people.

## What they talk about

### The news

A small ring buffer, `s.news` (the last 16 items: `{ at, kind, ...data }`), records notable changes. It isn't saved; it rebuilds as play goes on. Rules push to it at the points they already change state:

| Kind | Pushed when |
| --- | --- |
| `stock-fresh` | a harvest brings a variety back after it sold out |
| `wanted` | the village's wanted variety changes |
| `soldout` | a guest misses out because of stock |
| `maze-open` / `maze-closed` | the maze opens or shuts |
| `foyer-tier` | the foyer is upgraded |
| `haunt` | a haunt is installed or switched on |
| `fled` | a maze guest flees with high terror |
| `cocoa-tier` / `cocoa-special` / `cocoa-price` | the stand is upgraded, a special is added, or a price changes |
| `big-spender` | Baron Brassbolt calls |
| `order-filled` | a neighbour's order is filled |
| `level` / `house-level` / `shop-open` | the patch levels up, the house grows, or the shop opens |

### Facts and topics

Facts are read from state at speaking time:
- the wanted variety and fresh count;
- the maze tier and active haunts;
- cocoa specials and prices;
- the house level;
- the speaker's own receipt and terror.

The topic for each line is chosen by weight:
- **recency:** news from the last 2 minutes ×3, the last 10 minutes ×1.5;
- **relevance:** ×2 when it concerns something the speaker did (bought that variety, rode the maze, holds a cocoa);
- **freshness:** a topic already used in this conversation is weighted 0;
- **fallback:** evergreen topics at weight 0.5 (the moon, the lake lights, the giant jack-o'-lantern, Skyla, Shane and Natalie).

### Lines

Lines come from templates with slots, as an opener and up to two replies:
- **Opener:** "Did you see they've added {haunt}? {Terror-word}."
- **Reply:** agree, question or tease. "I came out of the {chamber} white as a sheet."

Each visitor kind (ghost, vampire, witch, and so on) adds a flavour word or two. Guests who missed a sale grumble kindly ("Sold out of {variety} again, they want to plant more").

### Pace

- One line every 3.5 to 5 seconds per group, in turn.
- A transcript of the last 8 lines lives on the group record.
- Lines are produced deterministically (a hash of the group id and the line number), so tests can check them.
- Nothing is written to the save.

## On screen

- **On the farm:** a small speech-bubble marker floats over each group, with a "…" pulse on each new line. Closer than 2× zoom, the latest line also shows briefly as a bubble over the speaker. Mugs show in chatters' hands, as a small prop on the sprite.
- **Overheard card:** tap the marker or any member to open it.
  - It shows the members' portraits and a live transcript that scrolls as they talk, with topic chips such as "New haunt" or "Fresh Orange".
  - It doesn't pause the game. It is `aria-live="polite"`, closes on Escape, and follows the guest card's style.
- **Guest card:** a chatting guest's card says "Chatting by the benches" and links to the group.

## Effect on the economy

- The only new income is cocoa bought by chatters from money they already have, through the existing rules.
- Run `tools/economy-sim.mjs`. Expect cocoa income up by roughly a third at level 3, with pumpkin income, the arrival rate and the level-12 time unchanged.

## Tests

- **Arrivals are unaffected.** With chat on and off, the same seed gives the same number of arrivals and the same stall receipts. Only cocoa income may differ.
- **Arrivals never wait** while chatters are present below the overflow guard.
- **Spots stay off the paths:** `pathDistance` is at least 1.2, and they're clear of meadow props.
- **Caps hold:** per spot, overall, one drink run per group at a time, and one drink per guest.
- **The queue stays fair:** a chatter never makes an arriving guest miss the stand.
- **Time limits:** every chatter leaves within 55 + 10 + 15 seconds plus walking. A lone guest leaves after 15 seconds.
- **Loading:** a save taken mid-chat loads with no chatters left, and everyone else is untouched.
- **The talk reflects the news:** after a haunt is installed, the next group mentions it within 4 lines. A topic is never repeated within one conversation.

## Order of work

1. **Rules and tests:** spots, the `v.social` steps, the caps and the arrival exclusions.
2. **Drawing:** standing in the ring facing inwards, the mug prop, walking to and from the spot, and the spot dressing per cocoa level.
3. **News and talk:** the news pushes, topics, templates, the transcript and the Overheard card.
4. **Tuning:** the economy sim, a browser check at three screen sizes, and docs (AGENTS gotcha: "chatters are excluded from arrival capacity").

## Left out on purpose

- Chatting at the Hollow House exit. Maze leavers go home by the west lane, and a second area doubles the routing work, so that waits for a later version.
- Chats changing what guests buy next time, and saved conversations. Both are easy to add later; neither belongs in the first version.
