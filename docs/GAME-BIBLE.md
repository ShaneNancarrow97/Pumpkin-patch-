# Pumpkin Patch: game bible

This bible describes the game independently of how it looks today, so it can be rebuilt in a completely different art style (voxel, flat vector, claymation, pixel art) and still feel like the same game. It covers:

- what the game is for
- how it plays
- who is in it, down to individual body parts
- where it happens
- how it lays out on screens, including the Galaxy Z Fold 7

Colours for large areas (hair, skin, clothes, Skyla's coat) are sampled from the current painted art. Small features (eyes, lips, jewellery, glasses) are matched by eye from zoomed crops. Treat them all as the characters' "true colours" and re-express them in whatever style you choose.

---

## 1. The point of the game

**Shane & Natalie's Pumpkin Patch is a love letter disguised as a farming game.** It is a small, cosy world that belongs to two real people, Shane and Natalie, and their calico cat Skyla. In it they grow glowing pumpkins, sell them to friendly monsters, and slowly turn a little cottage into a wonderfully haunted home.

| The game is | The game is not |
| --- | --- |
| A shared hobby: something to open together on the sofa and show each other | A competitive or social game. There are no leaderboards, no multiplayer and no ads. |
| A place where Halloween never ends. It is always a warm October night under the moon. | Scary. The monsters are sweet, and the darkness is velvet, not threat. |
| Personal. The jokes, outfits and cat are theirs. | Generic. Every new feature asks "would Shane and Natalie do this?" |
| Calm. Nothing fails, nothing dies and nothing punishes you for being away. | Grindy. Progress should always feel like a gift, not a chore. |

**The emotional promise:** *a little darkness, a lot of heart.* (This is the game's original tagline. Its other line is "Good things glow here.")

**What a session feels like:**

- **Two minutes:** plant, tap the big pumpkin a few times, harvest, watch a ghost buy something, collect a favour.
- **Thirty minutes:** save up for an upgrade, redecorate a room, try on a costume, read one of the books on the shelf.

### Pillars

Every feature should serve at least one of these:

1. **Grow.** Planting, tending and harvesting pumpkins that glow different colours by variety.
2. **Welcome.** Visitors (sweet Halloween creatures) walk up the path and buy what you've grown.
3. **Make it ours.** A home to decorate, books to read and outfits to wear. Earnings turn into personality.
4. **Together.** Shane and Natalie are always on screen, always doing something, always teasing each other.

### The core loop

```
plant seeds → pumpkins grow (tap the big pumpkin to hurry them) → harvest
  → visitors walk up the path and buy at Skyla's counter or in the shop
  → coins → upgrades (faster growing, better varieties, helping hands, the shop)
           → decor, rooms, books and costumes (the home and wardrobe)
  → favours from named neighbours give bonus coins and little stories
```

### Economy shape

These are the current values. Phase 2 of [PLAN.md](PLAN.md) rebalances them.

| Item | Detail |
| --- | --- |
| Varieties | Orange £12, Moonlight £24 (pale lilac glow), Witchfire £42 (purple), Starlight £70 (gold). Upgrading a plot costs £180, £900 and £3,600. |
| Plots | 12, starting with 6 unlocked |
| The big pumpkin | Each tap gives every growing plot a boost. Eight taps with nothing growing give a bonus pumpkin. |
| Outdoor stall | Passers-by arrive every 24 seconds, faster with signs |
| Indoor shop | Opens for £600, with 1, 2, 4 or 6 customers inside and a single till that Skyla works |
| House | Little cottage, then Crooked cottage (£650), then Midnight manor (£2,600), then Haunted haven (£9,000). This unlocks the bedroom, kitchen and attic. |
| Collections | 50 decor items, 10 books with real stories, 15 outfits |

### Voice

UK English: warm, dry and affectionate. Natalie is the planner and the stylish one. Shane is the joker who carries things. Real lines from the game:

> **Shane:** "Do we name the pumpkins? Because this one is definitely a Kevin."
> **Natalie:** "We cannot keep every pumpkin. We're running a shop, not an orange adoption centre."
> **Shane:** "Hear me out: a loyalty card. Buy nine pumpkins, receive a slightly larger pumpkin."
> **Natalie:** "It's called an autumn outfit, Shane. Now help me plant something."
> **Shane:** "Skyla rang the bell. That either means a sale or she wants her dinner."

Their titles are **Natalie, co-owner and pumpkin whisperer**, and **Shane, co-owner and chief pumpkin lifter**.

---

## 2. The cast

Reference pictures from the current art: [Shane and Natalie](bible/shane-and-natalie.webp), [faces and hands](bible/faces-and-hands.webp), [Skyla](bible/skyla.webp), and [visitors and outfits](bible/visitors-and-outfits.webp).

### Shared proportions

Both characters are **stylised, cute and slightly chibi**: about **4½ heads tall**, with large heads, big expressive eyes and sturdy short legs. Whatever the style, keep these ratios:

| Feature | Natalie | Shane |
| --- | --- | --- |
| Overall height | Same as Shane in game (both drawn at one reference height) | Same as Natalie |
| Head to body | 1 : 4.7 | 1 : 4.5, beanie included |
| Build | Soft, curvy, rounded hips and thighs, small hands | Compact and broad-shouldered, slightly boxy, chunky trainers |
| Stance | Weight on one leg, slight hip tilt, holding something to her chest | Relaxed and upright, one hand in his jacket pocket, the other holding a tool |
| Outline | A thick, dark, warm-brown ink line around the whole silhouette (sticker-like) | The same |
| Default facing | Front three-quarter, turned slightly to the viewer's left | Front three-quarter, turned slightly to the viewer's right |

### Natalie

*Personality:* stylish, organised, gently sarcastic, the one with the vision. She always holds a pumpkin.

**Head and face**

| Part | Description | Colour |
| --- | --- | --- |
| Hair | Long, very dark brown-black, waist length, with soft loose waves. Warm brown highlights catch the light at the crown and along the waves. | base #16100E, mid #231812, highlight #4A2912 |
| Fringe | Short blunt "baby bangs" cut straight across, well above the eyebrows. **Her signature shape: never omit it.** | as hair |
| Face shape | Round and soft, full cheeks, small rounded chin | |
| Skin | Fair and warm, peachy, with rosy blush on the cheeks and nose tip | base #F8B888, blush and shade #E8965F |
| Glasses | Large rounded-square frames, thin translucent **amber-gold** rims, sitting on the cheeks | frame #D9A35A (translucent amber-gold) |
| Eyes | Big, bright **blue**, with lilac-pink eyeshadow and full dark lashes, like winged mascara | iris #6F8FB5, shadow #B98DB0 |
| Brows | Dark, defined and gently arched | #2A1A12 |
| Mouth | Wide, warm smile showing the top teeth, coral-red lips | #B9503F |
| Ears | Small **gold hoop** earrings | #E0A54A |

**Neck and torso**

| Part | Description | Colour |
| --- | --- | --- |
| Neck tattoo | Grey-black linework across the throat: a symmetrical moth or floral mandala | #4A4448 |
| Necklace | Thin gold chain with a round **gold coin pendant** resting on the sweater | #F0A93A |
| Sweater | Oversized, chunky **olive-moss** knit with a soft textured pattern. Wide crew neck, dropped shoulders, long sleeves slightly bunched at the wrists, hem falling to the upper hip. Looks hand-made. | base #604625, shadow #4F381E, highlight #7A6436 |

**Hands and arms**

| Part | Description | Colour |
| --- | --- | --- |
| Hands | Small, cradling a pumpkin against her stomach with both hands | skin as face |
| Hand tattoos | Grey linework on the back of the right hand (a flower or moth) and small marks on the fingers | #5A5458 |
| Rings | Several thin **gold rings** on both hands | #D9A441 |
| Nails | Glossy **black** polish | #1A1214 |

**Waist and legs**

| Part | Description | Colour |
| --- | --- | --- |
| Belt | Black leather belt with a row of **silver grommets** and a square silver buckle | belt #231C1A, metal #B8B4AE |
| Pouch | Small black leather pouch clipped to the belt at her left hip | #1F1715 |
| Jeans | **Faded charcoal-black** high-waisted jeans with a relaxed, tapered "mom jean" fit, soft creases at the knees, slightly cuffed above the boots | base #2C2320, highlight #43352F, shadow #140F0D |

**Feet**

| Part | Description | Colour |
| --- | --- | --- |
| Boots | Chunky **black leather lace-up ankle boots** in the classic eight-eye "Dr Martens" style. Rounded toes, thick soles, **yellow welt stitching** around the sole edge, black laces. | leather #1C1412, stitch #D9B54A, sole #2A201C |

**Signature details to keep in any style:** baby bangs, gold glasses, blue eyes, the neck tattoo, the olive sweater, black nails, chunky boots, and a pumpkin in her hands.

### Shane

*Personality:* playful, sweet and a bit of a goof; the muscle ("chief pumpkin lifter"). He always carries a garden trowel.

**Head and face**

| Part | Description | Colour |
| --- | --- | --- |
| Beanie | Snug **black ribbed knit beanie**, worn back on the head with its fold-up cuff showing. It covers most of his hair. **Never take it off in his base look.** | #1A1210, rib shadow #0E0907 |
| Hair | Short **auburn-chestnut brown** hair showing below the beanie at the forehead and around the ears | #904829, shadow #563728 |
| Face shape | Youthful and oval, with soft rounded cheeks and a gentle jaw | |
| Skin | Fair and warm with a ruddy glow: pink cheeks, a warm nose | base #F9A06E, highlight #FCB682, blush #EE875B |
| Eyes | Warm **brown**, friendly, slightly narrowed by a big smile, with laugh lines | iris #5A3420 |
| Brows | Auburn, straight to gently arched | #6B3A1E |
| Facial hair | A thin **moustache** and a pointed **goatee** with a soul patch, both auburn, neatly kept; no sideburns or cheek beard | #974F26 |
| Mouth | Big open grin showing his top teeth | |

**Torso and arms**

| Part | Description | Colour |
| --- | --- | --- |
| Hoodie | **Black pullover hoodie**, hood up behind his neck and outside the jacket collar, with **grey drawstrings** and a kangaroo pocket | #201716, strings #8A8480 |
| Jacket | **Washed black denim trucker jacket**: pointed collar, two buttoned chest flap pockets, front button placket, faded seams and highlights, cuffs at the wrist, worn open | base #392C28, faded #463630, shadow #100B0B, buttons #6B5E58 |
| Left hand | Tucked into the jacket's hand pocket | |
| Right hand | Holding a **garden trowel**: a short wooden handle and a rusty, pitted metal blade | handle #A97B61, blade #6C5447, rust #8A4A2A |

**Legs and feet**

| Part | Description | Colour |
| --- | --- | --- |
| Trousers | **Black cargo trousers** with a relaxed fit, big side pockets with flaps on the thighs, and a slight bunch at the ankles | #231A19, shadow #130E0C |
| Trainers | **Black low-top skate shoes** in the classic "Vans Old Skool" style: black suede and canvas, white wavy side stripe, white laces and a **thick cream rubber sole** | upper #1E1615, stripe #F2EDE6, sole #E8CCB2 |

**Signature details to keep in any style:** black beanie, auburn goatee, black hoodie under a black denim jacket, cargo trousers, skate shoes and a rusty trowel.

### Skyla: the shopkeeper cat

A **calico** (tortoiseshell-and-white) cat who sits on the shop counter and "rings the bell".

| Part | Description | Colour |
| --- | --- | --- |
| Coat | Mostly **white** chest, belly and paws, with large patches of **ginger-orange** and **black** across the back, head and tail | white #F4EEE6, ginger #E08A3C, black #2A2220 |
| Face | Split mask: ginger over one eye and black over the other, with a white muzzle and blaze down the nose | |
| Eyes | Large, round, **yellow-green** with dark slit pupils | #C2B455 |
| Nose | Small, pink-coral | #E58A78 |
| Ears | Upright, with pink insides and white tufts | |
| Tail | Fluffy and **banded** ginger and black, curled around her feet | |
| Collar | **Burgundy ribbon** with a bow and a tiny **jack-o'-lantern bell** charm | ribbon #7A1E36, bell #ED9E25 |
| Pose | Sitting upright and proud, head tilted, "looking important" | |

### Visitors: the neighbours

Every visitor is cute, never scary. Each gets a distinct silhouette that reads at a small size. Appearance and spending are independent.

| Visitor (favour name) | Look |
| --- | --- |
| **Pip the ghost** | A round, white sheet ghost with a tiny dot face and a smile. Wears an oversized **plum witch hat** with an autumn-leaf and pumpkin brooch, and a long **knitted rust-and-plum scarf**. The hem is wavy. |
| **Mabel the witch** | A young witch with bouncy **copper curls**. Wears a green pointed hat with an orange flower, a plum dress with a lace petticoat, a big orange scarf, and brown boots. |
| **Count Bram** | A pale vampire with swept **silver hair** and pointed ears. Wears a plum waistcoat, a high-collared black tailcoat with gold embroidery and a cape, and riding boots. Elegant, not menacing. |
| **Bones the bookworm** | A friendly skeleton in a mossy-green patchwork coat, a woolly orange scarf, brown trousers and work boots. |
| **Patch the scarecrow** | A smiling **carved jack-o'-lantern head** in a frayed straw hat. Wears a patched green jacket and straw tufts at the cuffs. |

### Outfits: the wardrobe

Full costumes replace the base outfit but keep the face, hair, glasses and beanie (where they fit) and the signature props: Natalie's pumpkin and Shane's trowel.

| Character | Outfits |
| --- | --- |
| **Natalie** | **Harvest witch** (plum velvet gown, pointed hat with a crescent moon) · **Ghost bride** (ivory lace dress and long veil) · **Bat queen** (black and purple gown, batwing cape, bat tiara) · **Velvet vampire** (crimson velvet dress, high-collared cape) · **Patchwork monster** (green skin, neck bolts, stitched charcoal jacket over a purple top) · **Moonlit mummy** (cream bandage wraps) · **Midnight slasher** (an original white scream-style mask in a black hooded robe) |
| **Shane** | **Midnight vampire** (red waistcoat, red-lined cape) · **Dancing skeleton** (black onesie with bone print) · **Pumpkin scarecrow** (straw hat, patched rust jacket) · **Patchwork monster** (flat-top green head with bolts and a stitched jacket) · **Moonlit mummy** · **Midnight slasher** |

The last four (vampire for Natalie; monster, mummy and slasher for both) make up the **'90s Halloween collection**, a nod to dressing up for horror-movie nights.

---

## 3. The world

### The farm map

One continuous night scene. These are the coordinates on the 1000 × 610 map:

| Place | Where | What it is |
| --- | --- | --- |
| **Sky and horizon** | Top band | Deep purple night, a crescent moon top right, distant violet mountains, a lake, and a castle on a far hill |
| **Treeline** | Behind everything | Autumn maples in rust, orange and plum, with string lights (warm bulbs) strung on posts across the field |
| **The cottage** | Top left (x 18–273) | A crooked storybook cottage with a mossy shingle roof, a round-topped door, warm window light and pumpkins on the steps. It grows through four stages as the house upgrades. |
| **The big pumpkin** | Left (x 103–263, y 305–445) | A giant glowing jack-o'-lantern on a round wooden stage, surrounded by candles. **The game's signature tap target.** |
| **The patch** | Centre (x 360–680, y 300–520) | Dark tilled soil in a soft oval, with a grid of 12 plots (3 across, 4 down). Each plot glows in its variety's colour. |
| **Signs** | Top centre and top right | Wooden hanging signs: "The Pumpkin Patch · grown with love" and "The Honest Pumpkin · farm shop" |
| **Skyla's shop** | Top right (x 700–1000) | A wooden market stall and shop front with an **orange-and-plum striped awning**, lanterns, crates of pumpkins and flowers. Skyla sits on the counter. |
| **The stone path** | Right edge | A pale cobble path winding up from the bottom of the map to a fork below the shop. A spur leads to the counter, and the path continues up past the shop. Visitors walk this route. |
| **Fence and lanterns** | Bottom and sides | A rustic black picket fence with iron lanterns, pumpkins and purple and orange flowers. |

**Lighting:** the moon is cool lilac from the top right; lanterns, windows, string lights and pumpkins are warm amber pools. Shadows are plum, never pure black.

### Interiors

Each room has a background, styles you can buy, and slots for furniture and books:

| Room | Look |
| --- | --- |
| **Parlour** | A reading corner with plaster walls, arched gothic windows, a bookcase and a velvet armchair |
| **Bedroom** | Rosewood night, or Celestial velvet |
| **Kitchen** | Copper hearth, or Witch's apothecary |
| **Attic** | Haunted rafters, or Starlight attic |

**Skyla's shop interior:** warm wood, display bins, lanterns, and a counter with the till.

### Palette summary

| Role | Colour |
| --- | --- |
| Night ground | #130F1B |
| Plum surface | #231A28 |
| Lantern gold | #E7B46E |
| Pumpkin orange | #D9792F |
| Moss | #9DB382 |
| Ember (alerts) | #E07A55 |
| Moonlight lilac | #BEB7FF |
| Witchfire purple | #B774FF |
| Starlight gold | #FFDF64 |

The variety glows are `255,153,42` (Orange), `190,183,255` (Moonlight), `183,116,255` (Witchfire) and `255,223,100` (Starlight).

---

## 4. Interface

- **The farm is the screen.** Chrome floats over it and never boxes it in. See [UI-OVERHAUL.md](UI-OVERHAUL.md).
- **Navigation:** Patch · Shop · Home · Wardrobe · Journal.
- **HUD:** coins, stock, visitors, Settings.
- **Floating actions:** Plant, Boost and Harvest (Plant and Harvest only when they can be used), plus Crops & seeds and Upgrades.
- **Materials:**
  - dark plum panels with thin brass-gold borders
  - candle-warm text (#FBE7C6)
  - one gold-gradient primary button per view
  - rounded corners: 12–18px for panels, pill shapes for actions
- **Type:** **Fraunces** for display, used warmly and sparingly; **DM Sans** for everything else. Nothing smaller than 12px.
- **Feedback:** a short notice under the HUD; coins float up from sales.

---

## 5. Galaxy Z Fold 7 layout

The Fold 7 is the target device. It has three ways of being held, and the game must be comfortable in each, including the switches between them.

| Posture | Physical screen | Approx. CSS viewport |
| --- | --- | --- |
| **Folded (cover screen)** | 6.5″, 1080 × 2520 (21:9) | about **412 × 915**: tall and narrow, like a slim phone |
| **Unfolded, held upright** | 8.0″, 1968 × 2184 (nearly square) | about **984 × 1092** |
| **Unfolded, turned** | The same panel rotated | about **1092 × 984** |
| **Half-folded on a table (Flex Mode)** | The inner screen bent about 90°, crease horizontal | top half about 1092 × 470, bottom half about 1092 × 470 |

The viewports are estimates: physical pixels ÷ device pixel ratio, minus browser chrome. **Check them on the real phone.** Open the game in Chrome, open Settings, and run `innerWidth + "×" + innerHeight` in a bookmarklet, or use Chrome's remote devtools. The audit sizes in `scripts/ui-audit.mjs` should then be updated to the measured values.

### Folded (cover screen, about 412 × 915)

- **The phone layout.** A bottom dock with five tabs; the HUD floats at the top with icons only and labels hidden; actions sit in two rows above the dock.
- **The tall aspect is a gift.** The full map height shows at 1.4× scale, so the camera centres between the big pumpkin and the first column of plots.
- **Menus** open as bottom sheets up to about 80% of the height; the top fifth keeps the farm visible.
- **Thumb reach:** a one-handed grip on the 6.5″ cover reaches the bottom 60% easily. Keep every frequent action (Plant, Harvest, tabs) there; the top of the screen is for status only.
- **Measured** (audit, 412 × 915): farm 78% visible, pumpkin visible, no small text or targets.

### Unfolded, upright (about 984 × 1092)

- **Use the side rail**, not a dock. At 900px and wider, the shell switches to the rail, which suits a nearly square screen.
- **The HUD shows full labels** (Coins, Stock, Visitors).
- **The map shows about 580 of its 1000 units across.** Pumpkin, patch and the cottage are all in view.
- **Menus** open as a right-hand side panel about 400px wide, so the farm stays visible and playable to its left. This is the main win of the inner screen: decorate or shop while watching the farm.
- **Keep content away from the crease.** It runs vertically down the middle when held upright. Don't put a single tap target or a line of text across it. The side panel's left edge should sit to the right of the centre line, or snap to the right half.
- **Measured** (audit, 984 × 1092): farm 86% visible.

### Unfolded, turned (about 1092 × 984)

- **Rail on the left, map wide.** Most of the farm, from the cottage to the start of the shop, is visible at once.
- **The crease now runs horizontally across the middle.** Floating actions at the bottom and the HUD at the top stay clear of it naturally.
- **Measured** (audit, 1092 × 984): farm 87% visible.

### Half-folded (Flex Mode)

This is the most "game console" posture, and worth designing for:

- **Top half:** the farm only, with the HUD floating over it and no controls.
- **Bottom half:** controls only, like a game pad. The dock goes on the left; Plant, Boost and Harvest are large buttons on the right; the next goal and notices sit in the middle. Menus open in the bottom half too.
- **Detection:** the CSS media query `(vertical-viewport-segments: 2)` and the `env(viewport-segment-*)` variables from the Viewport Segments API, available in recent Chrome on foldables. Fall back to the normal unfolded layout when unsupported.
- **Status:** specified here, **not yet built or tested on hardware.**

### Changing posture mid-game

- **Unfolding** (cover to inner): the game keeps running. The camera re-centres on the same place on the map, open menus stay open (sheet becomes side panel), and nothing reloads. The app handles `resize` and re-fits the map; keep that behaviour.
- **Folding** (inner to cover): the same, in reverse. The side panel becomes a bottom sheet at half height.
- **Never lose input:** a drag in progress (decor placement) should end cleanly when the screen changes.

### Testing on the Fold

1. Open the game on the cover screen and play a harvest.
2. Unfold. The farm should still be centred on the pumpkin, with nothing reloaded.
3. Open the Wardrobe and turn the phone. The menu should stay open and readable.
4. Half-fold on a table (once Flex Mode is built).
5. Fold again while a menu is open.
6. Throughout, check text sits clear of the crease and nothing scrolls sideways.

---

## 6. Rebuilding in another style: checklist

- [ ] Same cast, with their signature details (section 2)
- [ ] Same places in the same arrangement: cottage top left, big pumpkin left, patch centre, shop top right, the path up the right (section 3)
- [ ] Night-time warmth: lilac moon, amber lanterns, plum shadows
- [ ] The loop and pillars (section 1); nothing punishing
- [ ] The voice: the banter lines are reusable as written
- [ ] Interface rules: the farm is the screen, 12px minimum text, 44px minimum targets, the Fold layouts (sections 4–5)
- [ ] Saves: a new build that should read existing progress must keep the save key and format (see `AGENTS.md`). A clean-slate spin-off should use its own key.

A voxel reference version built from this bible lives on the `voxel-reference` branch.
