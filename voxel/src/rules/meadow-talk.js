// What guests chatting in the meadow talk about (rules/meadow-chat.js).
// The farm keeps a short list of news, noticed as the state changes; a topic is
// picked from that news, the speaker's own visit and a few evergreen subjects,
// favouring what's fresh and what concerns the speaker, never twice in one
// conversation; lines are filled from templates. Everything is chosen by hash,
// so the same group, line and state always say the same thing. Pure; nothing
// here is saved.
import { VARIETIES } from "./farm.js";
import { wantedVariety } from "./market.js";
import { COCOA_SPECIALS } from "./cocoa-menu.js";
import { VISITOR_ROSTER } from "../content/visitors.js";
import { FOYER_TIERS, MAZE_PREFABS } from "../content/hollow-house.js";
import { COCOA_TIERS } from "../content/festival-meadow.js";

export const NEWS_KEEP = 16;
export const freshSocial = () => ({ news: [], groups: {}, nextGroup: 1, seen: null });
export const hash = (...n) => { let h = 0x811c9dc5; for (const x of n) { h = Math.imul(h ^ (x | 0), 16777619); h = Math.imul(h ^ h >>> 13, 0x5bd1e995); } return ((h ^ h >>> 15) >>> 0) / 4294967296; };

const name = v => VARIETIES[v]?.name ?? "pumpkin";
const treat = id => id === "cocoa" ? "cocoa" : COCOA_SPECIALS.find(p => p.id === id)?.name.toLowerCase() ?? "cocoa";
const haunt = id => MAZE_PREFABS.find(p => p.id === id);
const SPOKEN = { "cobweb-canopy": "the cobweb canopy", "whispering-portraits": "the whispering portraits", "spectral-parade": "a spectral parade", "thunder-chamber": "the thunder chamber", "phantom-finale": "the phantom finale" };
const CHAMBER = { "cobweb-canopy": "forgotten passage", "whispering-portraits": "cobweb cellar", "spectral-parade": "séance parlour", "thunder-chamber": "storm laboratory", "phantom-finale": "velvet crypt" };

// ---- The news ----------------------------------------------------------------
// What the meadow notices about the farm, compared with the last step.
function snapshot(s) {
  const h = s.hollowHouse, c = s.festival?.cocoa;
  return {
    stock: (s.stock ?? []).map(n => n > 0), wanted: wantedVariety(s),
    maze: !!(h?.purchased && h.status === "ready" && h.open), tier: h?.tier ?? 1,
    haunts: (h?.haunts?.active ?? []).filter(id => h.haunts.owned.includes(id)),
    cocoa: c?.level ?? 0, specials: c ? COCOA_SPECIALS.filter(p => c.level >= p.tier && c.extras[p.id]?.stock > 0).map(p => p.id) : [],
    prices: c ? { cocoa: c.price, ...c.prices } : {}, comforts: [...(s.festival?.comforts ?? [])], house: s.house?.level ?? 0, shop: !!s.shop?.unlocked, filled: s.orders?.filled ?? 0, fled: h?.runHome ?? 0,
  };
}
// Call once a step with that step's events. The first call after a load only
// takes a look, so nothing that was already true becomes news.
export function recordNews(s, events = []) {
  const social = s.social ??= freshSocial(), now = snapshot(s), was = social.seen;
  social.seen = now;
  const push = (kind, data = {}) => {
    const key = kind + ":" + (data.subject ?? ""), last = social.news.findLast(n => n.key === key);
    if (last && s.time - last.at < 45) return;                                  // one story, not a flood
    social.news.push({ at: s.time, kind, key, ...data });
    if (social.news.length > NEWS_KEEP) social.news.shift();
  };
  if (was) {
    now.stock.forEach((on, v) => { if (on && was.stock[v] === false) push("stock-fresh", { subject: v }); });
    if (now.wanted !== null && now.wanted !== was.wanted) push("wanted", { subject: now.wanted });
    if (now.maze !== was.maze) push(now.maze ? "maze-open" : "maze-closed");
    if (now.tier > was.tier) push("foyer-tier", { subject: now.tier });
    for (const id of now.haunts) if (!was.haunts.includes(id)) push("haunt", { subject: id });
    if (now.cocoa > was.cocoa) push("cocoa-tier", { subject: now.cocoa });
    for (const id of now.specials) if (!was.specials.includes(id)) push("cocoa-special", { subject: id });
    for (const [id, price] of Object.entries(now.prices)) if (was.prices[id] !== undefined && price !== was.prices[id]) push("cocoa-price", { subject: id, price, up: price > was.prices[id] });
    for (const id of now.comforts) if (!was.comforts.includes(id)) push("comfort", { subject: id });
    if (now.house > was.house) push("house-level", { subject: now.house });
    if (now.shop && !was.shop) push("shop-open");
    if (now.filled > was.filled) push("order-filled");
    if (now.fled > was.fled) push("fled");
  }
  for (const e of events) {
    if (e.type === "missed" && e.reason === "soldout") push("soldout", { subject: s.visitors.find(v => v.id === e.visitor)?.preferred?.[0] ?? 0 });
    else if (e.type === "vip-arrived") push("big-spender");
    else if (e.type === "level-up") push("level", { subject: e.level });
  }
}

// ---- Topics --------------------------------------------------------------------
// Each topic has a chip for the card, openers and replies. {slots} are filled
// from the topic's data; "mine" says whether it concerns the speaker.
const terror = scare => scare >= 23 ? "Bone-chilling" : scare >= 18 ? "Properly spooky" : "Creepy little thing";
const NEWS = {
  "stock-fresh": n => ({ chip: `Fresh ${name(n.subject)}`, slots: { variety: name(n.subject) }, mine: v => v.basket?.some(l => l.variety === n.subject),
    open: ["Fresh {variety} pumpkins are back on the stall.", "Skyla's got {variety} again. Picked this evening, she said.", "Did you see the {variety} pile? Still cold from the dew."],
    reply: ["About time. They'd all gone this morning.", "I grabbed one before the rush.", "Are they the ones that glow?", "Mine's going on the doorstep tonight."] }),
  wanted: n => ({ chip: `${name(n.subject)} wanted`, slots: { variety: name(n.subject) }, mine: v => v.basket?.some(l => l.variety === n.subject),
    open: ["The whole village is after {variety} this week.", "Everyone wants {variety} at the moment. They fetch a bit more, Skyla says.", "My neighbour's hunting high and low for a {variety}."],
    reply: ["Good luck finding one by teatime.", "I'll tell my sister, she's mad for them.", "They'll all be gone by the weekend.", "I got one! Don't tell anyone."] }),
  soldout: n => ({ chip: "Sold out", slots: { variety: name(n.subject) }, mine: v => v.outcome === "soldout",
    open: ["Sold out of {variety} again. They want to plant more.", "I came for a {variety} and the shelf was bare.", "No {variety} left at the stall tonight."],
    reply: ["They'll have more in tomorrow, surely.", "Get here earlier next time!", "That's the price of being popular.", "I'd have shared mine if I'd known."] }),
  "maze-open": () => ({ chip: "Maze open", mine: v => !!v.hollow,
    open: ["The Hollow House is open. Have you braved the maze yet?", "They've opened the maze up at the Hollow House!", "Did you hear the screams from the Hollow House?"],
    reply: ["Not on your life.", "I went in. I came out a different colour.", "Is it actually scary or just dark?", "Axel sold me a ticket with a wink. Never a good sign."] }),
  "maze-closed": () => ({ chip: "Maze shut",
    open: ["The maze is shut tonight. The doors were bolted.", "No maze tonight, the Hollow House is all dark."],
    reply: ["Mopping up after the last lot, I expect.", "Phew, honestly.", "Fixing the cobwebs, probably."] }),
  "foyer-tier": n => ({ chip: "New foyer", slots: { name: FOYER_TIERS[n.subject - 1]?.name ?? "Something grand" }, mine: v => !!v.hollow,
    open: ["They've done up the Hollow House foyer. They're calling it ‘{name}’.", "Have you been in the Hollow House foyer lately? Ever so grand now."],
    reply: ["Fancy. And the chandelier?", "I liked it shabby.", "Someone's spent a pretty penny.", "Is the maze bigger too?"] }),
  haunt: n => { const p = haunt(n.subject); return { chip: "New haunt", slots: { haunt: SPOKEN[n.subject] ?? "a new haunt", terror: terror(p?.scare ?? 12), chamber: CHAMBER[n.subject] ?? "maze" }, mine: v => !!v.hollow,
    open: ["Did you see they've added {haunt}? {terror}.", "There's a new haunt in the maze: {haunt}.", "Someone said {haunt} is in now. {terror}, apparently."],
    reply: ["I came out of the {chamber} white as a sheet.", "Is that what all the screaming was?", "I'm going round again just for that.", "Not for me, thank you very much."] }; },
  fled: () => ({ chip: "Ran home", mine: v => !!v.hollow,
    open: ["Somebody ran out of the maze screaming just now.", "A chap came out of the Hollow House at a sprint.", "I saw someone flee the maze without their hat."],
    reply: ["That'll be the phantom.", "Ha! Wasn't me. This time.", "Were they all right?", "That's the sign of a good maze."] }),
  "cocoa-tier": n => ({ chip: "Cocoa stand", slots: { name: COCOA_TIERS[n.subject - 1]?.name.toLowerCase() ?? "cocoa stand" }, mine: v => !!v.cocoaSpend,
    open: ["Sandy's done up the stand. A proper {name} now.", "Have you seen Sandy's new {name}?"],
    reply: ["The lanterns are lovely.", "The cocoa's better too, I swear.", "She deserves it, she's always so cheerful.", "More room to queue, at least."] }),
  "cocoa-special": n => ({ chip: "New treat", slots: { special: treat(n.subject) }, mine: v => v.cocoaKind === n.subject || n.subject === "smores" && v.snack,
    open: ["Sandy's doing {special} now.", "Have you tried the {special} yet?"],
    reply: ["I'm going back for one.", "A bit dear, but worth it.", "The marshmallows look like little ghosts!", "Is it very sweet?"] }),
  "cocoa-price": n => ({ chip: "Cocoa prices", slots: { special: treat(n.subject), price: n.price }, mine: v => !!v.cocoaSpend,
    open: n.up ? ["The {special} has gone up to £{price}.", "£{price} for a {special} now!"] : ["The {special} is down to £{price}. Bargain.", "Sandy's dropped the {special} to £{price}."],
    reply: n.up ? ["Still cheaper than the village.", "Worth every penny.", "Daylight robbery!", "Marshmallows don't grow on trees."] : ["I'll have two, then.", "Treat yourself!", "Lovely, that."] }),
  comfort: n => ({ chip: "The meadow", mine: () => true, ...({
    bunting: { open: ["They've strung fairy lights right round the meadow!", "Have you seen the bunting? Like a village fête."], reply: ["Makes it feel like a party.", "I could sit under those all night.", "Ever so pretty."] },
    blankets: { open: ["Sandy's put blankets out on the benches. Lovely and snug.", "Grab a blanket, they're tartan!"], reply: ["I'm not moving now.", "Cosy as anything.", "Smells of cinnamon, oddly."] },
    mugs: { open: ["You can keep the mugs now! Little ghost ones.", "Sandy's doing souvenir mugs. I'm going back for a refill."], reply: ["I'll have two.", "Mine's got a bat on it.", "My mantelpiece is ready."] },
    dancefloor: { open: ["Someone's put a dance floor in the meadow!", "There's a gramophone by the fence now. Fancy a dance?"], reply: ["Only if it plays the Monster Mash.", "My bones are too old for dancing.", "Go on then, one waltz."] },
    trolley: { open: ["Sandy's trolley comes right round to you now.", "No more queuing, the cocoa comes to us!"], reply: ["Best idea she's had.", "Service with a smile.", "I'll have another, then."] },
  }[n.subject] ?? { open: ["The meadow gets cosier every week."], reply: ["Doesn't it just."] }) }),
  "big-spender": () => ({ chip: "Baron Brassbolt",
    open: ["Baron Brassbolt's here again, buying up half the stall.", "Did you see the Baron? Top hat and all."],
    reply: ["He paid in gold, I heard.", "Leave some for the rest of us!", "Lovely manners, though.", "Does he ever carry his own pumpkins?"] }),
  "order-filled": () => ({ chip: "An order filled",
    open: ["Skyla's just sent a neighbour a whole cartload of pumpkins.", "Another neighbour's order went out tonight. They're doing ever so well."],
    reply: ["I should put in an order.", "They'll be carving all week.", "That's good neighbours for you."] }),
  level: () => ({ chip: "The patch grows",
    open: ["The patch keeps growing. Shane and Natalie must be thrilled.", "Have you seen how big the farm's got?"],
    reply: ["I remember when it was six pumpkins and a scarecrow.", "They've worked so hard.", "More pumpkins for us!"] }),
  "house-level": () => ({ chip: "The cottage",
    open: ["They've built on to the cottage again.", "The cottage has another room, did you notice?"],
    reply: ["I'd love a peek inside.", "Bet it's full of cauldrons.", "Lucky them."] }),
  "shop-open": () => ({ chip: "The Honest Pumpkin",
    open: ["Skyla's opened a proper shop, the Honest Pumpkin.", "You can go inside the Honest Pumpkin now."],
    reply: ["Warmer than the stall!", "Lovely displays.", "I'll have a browse on the way out."] }),
};
// The speaker's own evening.
function personal(v) {
  const out = [];
  if (v.outcome === "bought" && v.basket?.length) out.push({ key: "my-basket", chip: "Their pumpkins", slots: { count: v.quantity === 1 ? "one pumpkin" : `${v.quantity} pumpkins`, variety: name(v.bought) },
    open: ["I got {count}. The {variety} is going in the window.", "Look, {count}! The {variety} was the last on the table."], reply: ["Lovely choice.", "How will you carry them all?", "Carving tonight, then?"] });
  if (v.outcome === "soldout" || v.outcome === "budget") out.push({ key: "missed-out", chip: v.outcome === "soldout" ? "Sold out" : "Missed out", slots: { variety: name(v.preferred?.[0]) },
    open: v.outcome === "soldout" ? ["Sold out of {variety} again. They want to plant more.", "Not a {variety} left for me. Ah well."] : ["Couldn't stretch to a {variety} tonight. Next time.", "The {variety} was a bit dear for me today."],
    reply: ["Have a cocoa, it helps.", "There's always tomorrow.", "You can hold mine for a bit."] });
  if (v.hollow?.done && (v.hollow.terror ?? 0) >= 40) out.push({ key: "my-fright", chip: "The maze", open: ["I've just done the maze. My knees are still knocking.", "I screamed. Out loud. In front of Axel."], reply: ["You're still shaking!", "Did you get to the end?", "I'll go in if you hold my hand."] });
  else if (v.hollow?.done) out.push({ key: "my-fright", chip: "The maze", open: ["Did the maze. Honestly? I laughed.", "The maze wasn't so bad. Bit dark."], reply: ["Brave thing.", "Go again at midnight, then.", "Liar!"] });
  if (v.cocoaSpend) out.push({ key: "my-cocoa", chip: "Their cocoa", slots: { special: treat(v.cocoaKind ?? "cocoa") }, open: ["This {special} is just the thing on a cold night.", "Sandy's {special}. Honestly, try one."], reply: ["Give us a sip!", "You've got cream on your nose.", "Mine's gone already."] });
  return out;
}
const EVERGREEN = [
  { key: "moon", chip: "The moon", open: ["Look at that moon.", "Big old moon tonight."], reply: ["Perfect for a howl.", "Makes the pumpkins glow.", "Harvest moon, that."] },
  { key: "lake", chip: "The lake", open: ["The village lights look lovely across the lake.", "You can see the lamps on the water from here."], reply: ["Like little candles.", "Romantic, isn't it?", "I can see my house!"] },
  { key: "jack", chip: "The big jack-o'-lantern", open: ["That giant jack-o'-lantern gets bigger every year.", "Who carved the big pumpkin by the stall?"], reply: ["Shane, I think. With a saw.", "It winked at me, I swear.", "Must have taken all week."] },
  { key: "skyla", chip: "Skyla", open: ["Skyla's always got a smile, hasn't she?", "Skyla gave me the pick of the pile."], reply: ["And the cat on the counter!", "She knows every pumpkin by name.", "She's a delight."] },
  { key: "farmers", chip: "Shane and Natalie", open: ["Shane and Natalie have done wonders with this place.", "I saw Natalie out watering by lantern light."], reply: ["They never stop, those two.", "Shane waved at me!", "Proper pumpkin people."] },
  { key: "sandy", chip: "Sandy", open: ["Sandy remembers everyone's order.", "Sandy's moth nearly landed in my cocoa."], reply: ["She's a treasure.", "That moth's a menace.", "Best cocoa in the county."] },
];
const FLAVOUR = { ghost: "Ooh, ", witch: "By my broom, ", vampire: "Ah, ", skeleton: "Rattling good. ", scarecrow: "Well I'll be stuffed. ", mummy: "Mmf. ", zombie: "Braaains… I mean, ", werewolf: "Awoo! ", "dead-pirate": "Arr. ", clown: "Honk! " };

// Everything the speaker could bring up, weighted. News from the last two
// minutes counts three times over, the last ten minutes half again; news
// about something they did counts double; evergreen subjects count half.
export function topicsFor(s, speaker, used = []) {
  const best = new Map(), skip = new Set(used);
  const add = (t, weight) => { if (!skip.has(t.key) && weight > (best.get(t.key)?.weight ?? 0)) best.set(t.key, { ...t, weight }); };
  for (const n of s.social?.news ?? []) {
    const t = NEWS[n.kind]?.(n); if (!t) continue;
    // A story with nothing particular in it (another level, another order) is one topic.
    const age = s.time - n.at; add({ ...t, key: t.slots ? n.key : n.kind, at: n.at }, (age < 120 ? 3 : age < 600 ? 1.5 : 1) * (t.mine?.(speaker) ? 2 : 1));
  }
  for (const t of personal(speaker)) add(t, 1.2);
  for (const t of EVERGREEN) add(t, .5);
  return [...best.values()];
}
const fill = (text, slots = {}) => text.replace(/\{(\w+)\}/g, (_, k) => String(slots[k] ?? ""));

// The next line in a conversation. `group` keeps the thread between calls:
// an opener on a fresh topic, then one or two replies from the others. A new
// conversation opens on the freshest news, if any is under two minutes old.
export function converse(s, group, speaker) {
  const n = group.count++, roll = salt => hash(group.id, n, salt), kind = VISITOR_ROSTER[speaker.kind]?.id;
  let thread = group.thread;
  if (thread && thread.replies > 0) {
    thread.replies--;
    const text = fill(thread.reply[Math.floor(roll(1) * thread.reply.length) % thread.reply.length], thread.slots);
    return { text, chip: thread.chip, topic: thread.key, reply: true };
  }
  const options = topicsFor(s, speaker, group.used);
  if (!options.length) { group.thread = null; return { text: ["Mm.", "Quite.", "Lovely evening, though."][Math.floor(roll(1) * 3)], chip: null, topic: null }; }
  const fresh = !group.used.length && options.filter(t => t.at !== undefined && s.time - t.at < 120).sort((a, b) => b.at - a.at)[0];
  let t = fresh;
  if (!t) {
    let pick = roll(2) * options.reduce((sum, o) => sum + o.weight, 0);
    t = options.find(o => (pick -= o.weight) < 0) ?? options.at(-1);
  }
  group.used.push(t.key);
  group.thread = { key: t.key, chip: t.chip, slots: t.slots, reply: t.reply, replies: 1 + Math.floor(roll(3) * 2) };
  const prefix = FLAVOUR[kind] && roll(5) < .3 ? FLAVOUR[kind] : "";
  let line = fill(t.open[Math.floor(roll(4) * t.open.length) % t.open.length], t.slots);
  if (prefix.endsWith(", ") && !/^I\b/.test(line)) line = line[0].toLowerCase() + line.slice(1);
  return { text: prefix + line, chip: t.chip, topic: t.key, reply: false };
}
