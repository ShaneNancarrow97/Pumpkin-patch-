// Mothlight's quests (handover 73). Four kinds, each built from things the farm
// already does, so the village and the farm feed each other:
//   story quests open the village and its districts;
//   friendship quests are a resident's chapters, opening at friendship levels;
//   favours are small paid requests for your produce, one per resident at a time;
//   almanac duties are a page of everyday tasks that refills once it's done.
// A quest's lines are spoken by its giver unless a line names someone else
// ({ who, text }); a { choices } line offers answers in three tones, each with
// the giver's reply, as in a chat.
//
// Step kinds: tour, talk, gather, deliver (materials), pay (coins), find (a
// story object), give (farm items), place (village decor with tags near a
// spot), build (a blueprint goes up), and farm totals counted from the step's
// start: sell, harvest, carve, cook, fish, earn.
import { FIXTURES, PLAN_SCALE } from "./village.js";
import { BLIGHT_QUESTS } from "./village-blight.js";

export const QUESTS = Object.freeze([
  { id: "invitation", kind: "story", title: "The Moving Address", giver: "elowen", level: 3,
    blurb: "A letter whose ink won't keep still invites you to Mothlight Village.",
    steps: [
      { kind: "tour", text: "Take the grand tour of Mothlight" },
      { kind: "talk", who: "rowan", text: "Meet Rowan on the Green" },
      { kind: "talk", who: "elowen", text: "Tell Elowen what you think of Mothlight" },
    ],
    talk: {
      rowan: [{ who: "rowan", text: "Oh! Visitors! Real ones, with feet! Hello, hello. Rowan Rattlewood, carpenter, scarecrow, terrible at goodbyes." },
        { who: "rowan", text: "Elowen said she'd fetch the pumpkin farmers. I thought she was being poetic." },
        { choices: [{ tone: "warm", text: "It's lovely to meet you, Rowan.", reply: "Lovely! Did you hear that, crows? Lovely! Write it down, somebody." },
          { tone: "curious", text: "What do you make here?", reply: "Everything except finished things. Benches, signs, doors. Well. Most of a door." },
          { tone: "playful", text: "Are you the welcome committee?", reply: "Chair, secretary and the bunting. Mostly the bunting." }] },
        { who: "rowan", text: "Here, take my spare hatchet and pick. The Green's full of fallen timber and loose stone. Help yourself, the trees don't mind." }],
      elowen: [{ who: "elowen", text: "Well? What do you make of our little village?" },
        { choices: [{ tone: "warm", text: "It feels like it's been waiting for someone.", reply: "It has. For years. And now the almanac's ink is running about like a puppy." },
          { tone: "curious", text: "Why is so much of it empty?", reply: "People stopped knocking on each other's doors. Nobody meant it. We'd like to start again." },
          { tone: "playful", text: "It needs more pumpkins.", reply: "Doesn't everywhere? I knew we'd invited the right people." }] },
        { who: "elowen", text: "Come back as often as you like. Rowan needs a hand, my letter needs finding, and the Green needs lanterns. Your farm is welcome in every corner of it." }],
    },
    done: [{ who: "elowen", text: "The almanac's written your name on the first page. In very neat handwriting, for once." }],
    reward: { coins: 150, friendship: { elowen: 40, rowan: 40 }, unlock: ["gathering"], villageDecor: { "lantern-post": 2 } } },

  { id: "rowan-1", kind: "friendship", title: "Loose Boards", giver: "rowan", friendship: 1, needs: ["invitation"],
    blurb: "The Green's old bench has given up. Rowan could mend it, with a little timber and stone.",
    intro: [{ who: "rowan", text: "See that bench by the well? Used to seat six. Now it seats nobody, and badly." },
      { who: "rowan", text: "If you could bring me four logs and two good stones, I'd have it standing by supper." },
      { choices: [{ tone: "warm", text: "Leave it with me.", reply: "You're a treasure. I'll warm up my mallet." },
        { tone: "curious", text: "Where's the best timber?", reply: "Fallen branches along the north hedge. Stone by the south wall. The tools know the way." },
        { tone: "playful", text: "Will I get my name on it?", reply: "Carved on the armrest. In big letters. With a pumpkin." }] }],
    steps: [
      { kind: "gather", material: "logs", n: 4, text: "Gather 4 logs on the Green" },
      { kind: "gather", material: "stone", n: 2, text: "Gather 2 stone" },
      { kind: "deliver", who: "rowan", cost: { logs: 4, stone: 2 }, text: "Bring them to Rowan" },
    ],
    done: [{ who: "rowan", text: "There! Sturdy as a stubborn goat. Sit on it. Go on. Well? Comfy?" },
      { choices: [{ tone: "warm", text: "The comfiest bench in the land.", reply: "Ha! I'll tell the bench. It'll be unbearable." },
        { tone: "playful", text: "Wobbles a bit. Like you.", reply: "Character! That's character, that is." },
        { tone: "curious", text: "Who used to sit here?", reply: "The whole village, on lantern nights. Maybe again, eh?" }] }],
    reward: { friendship: { rowan: 70 }, effect: "bench", coins: 60 } },

  { id: "rowan-stall", kind: "friendship", title: "Open for Business", giver: "rowan", friendship: 2, needs: ["rowan-1"],
    blurb: "Rowan's market stall on the square is more splinters than shop. Get it trading again.",
    intro: [{ who: "rowan", text: "That stall on the square used to be mine. I sold stools, signs, lanterns. Then the awning blew off and so did my nerve." },
      { who: "rowan", text: "If we fixed it up, I could make things for your farm and your garden. Proper Mothlight pieces." },
      { choices: [{ tone: "warm", text: "Let's get you trading again.", reply: "Trading! Oh, I've missed the word." },
        { tone: "curious", text: "What would you sell?", reply: "Benches, lamps, signposts, crates. Things for here and things for home. A new lot every so often." },
        { tone: "playful", text: "Do you take pumpkins as payment?", reply: "Only as tips. Coins for the stock, pumpkins for the soul." }] }],
    steps: [
      { kind: "gather", material: "fibre", n: 3, text: "Gather 3 fibre for a new awning" },
      { kind: "deliver", who: "rowan", cost: { logs: 6, stone: 2, fibre: 3 }, text: "Bring Rowan 6 logs, 2 stone and 3 fibre" },
      { kind: "pay", coins: 200, who: "rowan", text: "Pay £200 for paint and a brass bell" },
    ],
    done: [{ who: "rowan", text: "*ding ding* Rattlewood's Stall is open! Come and look. New stock every so often, and a friend's discount once we're thick as thieves." }],
    reward: { friendship: { rowan: 60 }, unlock: ["stall"], effect: "stall", villageDecor: { "market-crates": 1 } } },

  { id: "rowan-2", kind: "friendship", title: "A Door of His Own", giver: "rowan", friendship: 3, needs: ["rowan-stall"],
    blurb: "Rowan mends everyone's home but his own. Help him build his workshop cottage.",
    intro: [{ who: "rowan", text: "I've drawn up plans for a workshop cottage. I've drawn them up nine times, actually." },
      { who: "rowan", text: "It'd need a lot of timber and stone. And someone to make me actually start." },
      { choices: [{ tone: "warm", text: "I'll make you start. Kindly.", reply: "Kindly bossy. My favourite kind." },
        { tone: "curious", text: "Why nine plans?", reply: "Because the first eight were finished, and finished things scare me. Silly, eh?" },
        { tone: "playful", text: "Plan ten: just build it.", reply: "Revolutionary. I'll write it on the top." }] }],
    steps: [
      { kind: "deliver", who: "rowan", cost: { logs: 20, stone: 12, fibre: 4 }, text: "Bring 20 logs, 12 stone and 4 fibre" },
      { kind: "pay", coins: 250, who: "rowan", text: "Pay £250 for nails, glass and a door that shuts" },
      { kind: "build", blueprint: "rowan-workshop", text: "Raise Rowan's workshop" },
      { kind: "talk", who: "rowan", text: "Visit Rowan at his new door" },
    ],
    talk: { rowan: [{ who: "rowan", text: "It's real. Walls, roof, chimney, and a door. On two hinges. I keep opening it to hear it not creak." },
      { choices: [{ tone: "warm", text: "Welcome home, Rowan.", reply: "...Home. Gosh. Give me a minute, I've got sawdust in my eye." },
        { tone: "playful", text: "Now finish your own furniture.", reply: "One revolution at a time, please." },
        { tone: "curious", text: "What will you make first?", reply: "A shelf for your farm. Every barn needs a carpenter's shelf." }] }] },
    reward: { friendship: { rowan: 180 }, build: "rowan-workshop", decor: ["shelf-bracket"], villageDecor: { "timber-gate": 1 }, coins: 100 } },

  { id: "rowan-pumpkins", kind: "friendship", title: "A Door Made of Pumpkin", giver: "rowan", friendship: 4, needs: ["rowan-2"],
    blurb: "Rowan dreams of a front door carved from one of your pumpkins. He'll need to see how carving's done.",
    intro: [{ who: "rowan", text: "Hear me out. A pumpkin door. Smells of harvest, keeps out draughts, glows at night." },
      { who: "rowan", text: "Bring me a dozen of your classic oranges to practise on, and show me how you carve at the farm." },
      { choices: [{ tone: "playful", text: "And when it rots?", reply: "Then it's compost and I build another. Very sustainable." },
        { tone: "warm", text: "I'll pick you the roundest ones.", reply: "Round ones! You know me too well." },
        { tone: "curious", text: "Can you carve a door?", reply: "I can carve anything that holds still. Pumpkins are very good at that." }] }],
    steps: [
      { kind: "give", item: "pumpkin:orange", n: 12, who: "rowan", text: "Give Rowan 12 Orange pumpkins" },
      { kind: "carve", n: 1, text: "Carve a jack-o'-lantern at your farm's bench" },
      { kind: "talk", who: "rowan", text: "Tell Rowan how carving went" },
    ],
    talk: { rowan: [{ who: "rowan", text: "You carved one! With a face! I've carved twelve. They all look like me. Is that normal?" },
      { choices: [{ tone: "warm", text: "That means they're full of heart.", reply: "Full of straw, but I'll take heart." },
        { tone: "playful", text: "Twelve Rowans. The crows will be confused.", reply: "Good. Keeps them on their toes." },
        { tone: "curious", text: "Which will be the door?", reply: "The one that winked at me. I swear it winked." }] }] },
    reward: { friendship: { rowan: 120 }, villageDecor: { "pumpkin-arch": 1 }, coins: 180 } },

  { id: "elowen-1", kind: "friendship", title: "A Letter That Will Not Stay Still", giver: "elowen", friendship: 1, needs: ["invitation"],
    blurb: "Three pages of Elowen's old letter have blown away: two on the Green, and one, she thinks, over the hill to your farm.",
    intro: [{ who: "elowen", text: "My letter's escaped again. Three pages. The ink got restless and the wind helped." },
      { who: "elowen", text: "Two will be on the Green somewhere. The third... I watched it sail over the hill. Towards your pumpkin patch." },
      { choices: [{ tone: "curious", text: "What does the letter say?", reply: "I'll tell you when it's whole. It's rude to read a letter in pieces." },
        { tone: "warm", text: "We'll bring every page home.", reply: "Thank you. Follow the moths; they're fond of paper." },
        { tone: "playful", text: "Maybe it's eloping.", reply: "With whom? Oh dear. Not Parsnip." }] }],
    steps: [
      { kind: "find", item: "page-1", text: "Find the page by the well" },
      { kind: "find", item: "page-2", text: "Find the page by the old oak" },
      { kind: "find", item: "page-3", text: "Find the page that blew to your farm" },
      { kind: "talk", who: "elowen", text: "Bring the pages to Elowen" },
    ],
    talk: { elowen: [{ who: "elowen", text: "All three. And look: the ink's settled. It knows it's home." },
      { who: "elowen", text: "'Dear Mothlight, I'm writing to ask everyone to come back. Come knock on doors again.' That's as far as I got." },
      { choices: [{ tone: "warm", text: "Then let's help you finish it.", reply: "Let's. In the meantime, take this. It's the village almanac's little sister." },
        { tone: "curious", text: "Why didn't you send it?", reply: "I was afraid no one would come. And then you did, without being asked." },
        { tone: "playful", text: "Add 'pumpkins provided'.", reply: "That would've worked, wouldn't it? Here, take this." }] },
      { who: "elowen", text: "Your own almanac. It fills a page with little things to do around the farm and the Green, and rewards you when it's full." }] },
    reward: { friendship: { elowen: 80 }, unlock: ["almanac"], villageDecor: { "reading-stand": 1 }, coins: 80 } },

  { id: "elowen-moonlight", kind: "friendship", title: "Ink by Pumpkinlight", giver: "elowen", friendship: 2, needs: ["elowen-1"],
    blurb: "Elowen's moths read best by the glow of Moonlight pumpkins, and she'd love the farm's news to spread.",
    intro: [{ who: "elowen", text: "My moths read best by the glow of a Moonlight pumpkin. Silver light, no flicker." },
      { who: "elowen", text: "Could you spare six? And tell your shoppers about Mothlight; the almanac loves a rumour." },
      { choices: [{ tone: "curious", text: "Do moths really read?", reply: "Slowly. They eat the full stops. That's why my sentences run on." },
        { tone: "warm", text: "Six of our best, coming up.", reply: "You're spoiling us. The moths are lining up already." },
        { tone: "playful", text: "I'll put up a poster: 'Moths welcome'.", reply: "They'll queue round the block. Politely." }] }],
    steps: [
      { kind: "give", item: "pumpkin:moonlight", n: 6, who: "elowen", text: "Give Elowen 6 Moonlight pumpkins" },
      { kind: "sell", n: 25, text: "Sell 25 pumpkins so word of Mothlight spreads" },
      { kind: "talk", who: "elowen", text: "Tell Elowen the news has spread" },
    ],
    talk: { elowen: [{ who: "elowen", text: "Three strangers asked the moths for directions today. Directions! To us!" }] },
    reward: { friendship: { elowen: 90 }, villageDecor: { "moth-lamp": 1 }, coins: 140 } },

  { id: "elowen-2", kind: "friendship", title: "A Room for Quiet Wings", giver: "elowen", friendship: 3, needs: ["elowen-1"],
    blurb: "Elowen has never had a home of her own: only a cold corner of the old library. Build her conservatory.",
    intro: [{ who: "elowen", text: "I've slept in the library's draughty corner for years. The moths don't mind. My back does." },
      { who: "elowen", text: "There's a plot by the green with room for a glasshouse. A conservatory library, with the moon on the ceiling." },
      { choices: [{ tone: "curious", text: "Why a glass roof?", reply: "So I can read by moonlight and the moths can find their way in." },
        { tone: "warm", text: "You deserve a proper home.", reply: "...I'm not used to hearing that. Thank you." },
        { tone: "playful", text: "Glass? Near Rowan's hammer?", reply: "We'll keep him at a safe distance. With biscuits." }] }],
    steps: [
      { kind: "deliver", who: "elowen", cost: { logs: 18, stone: 14, fibre: 6, herbs: 2 }, text: "Bring 18 logs, 14 stone, 6 fibre and 2 herbs" },
      { kind: "pay", coins: 450, who: "elowen", text: "Pay £450 for glass and a brass telescope" },
      { kind: "build", blueprint: "elowen-conservatory", text: "Raise Elowen's conservatory" },
      { kind: "place", tags: ["light", "seat", "books"], near: "elowen", text: "Make a reading nook by her door: a light, a seat and something to read" },
      { kind: "talk", who: "elowen", text: "Show Elowen her reading nook" },
    ],
    talk: { elowen: [{ who: "elowen", text: "A lamp, a seat and a stand of books, right by my own door. You thought of the moths, too; look how they're settling." },
      { choices: [{ tone: "warm", text: "Welcome home, Elowen.", reply: "Home. I'd almost forgotten the shape of the word. It's a lovely shape." },
        { tone: "curious", text: "What will you read first?", reply: "The almanac. Out loud. To the house. It's very new and should hear its own story." },
        { tone: "playful", text: "Rowan only broke two panes.", reply: "Three. But he replaced four. He's very generous with glass." }] }] },
    reward: { friendship: { elowen: 180 }, build: "elowen-conservatory", decor: ["midnight-reading-bench"], villageDecor: { "moth-statue": 1 }, coins: 100 } },

  { id: "two-doorbells", kind: "story", title: "Two Doorbells", giver: "elowen", level: 4, needs: ["rowan-2", "elowen-2"],
    blurb: "With two new homes on the Green, Elowen wants the village's first supper in years.",
    intro: [{ who: "elowen", text: "Two new doors on the Green, and both of them knock. I think that calls for a supper." },
      { who: "rowan", text: "A supper! I'll make the table. You make the food. Elowen makes the speech." },
      { who: "elowen", text: "I do not make speeches. I make footnotes. Farmer, could you bring something warm from your kitchen, and a basket of pumpkins?" }],
    steps: [
      { kind: "give", item: "pumpkin:any", n: 10, who: "elowen", text: "Bring 10 pumpkins of any kind" },
      { kind: "cook", n: 1, text: "Cook a dish at Maisie's truck or your kitchen" },
      { kind: "talk", who: "rowan", text: "Join the supper on the Green" },
    ],
    talk: { rowan: [{ who: "rowan", text: "Everyone's here! Well, three of us and some moths. And a crow. That's a crowd in Mothlight!" },
      { who: "elowen", text: "The almanac's written a whole page. 'The first supper.' Look, it's drawn the bench." },
      { choices: [{ tone: "warm", text: "To Mothlight. To knocking on doors.", reply: "To knocking on doors! *clink of mismatched mugs*" },
        { tone: "playful", text: "Who's washing up?", reply: "The crow volunteered. We'll see." },
        { tone: "curious", text: "What comes next for the village?", reply: "The woods beyond the gate. Mabel and Tansy live out there, behind the brambles. One day soon." }] }] },
    reward: { coins: 300, friendship: { elowen: 60, rowan: 60 }, villageDecor: { "bunting-posts": 2 }, unlock: ["copse-hint"] } },
  { id: "lantern-keepers", kind: "story", title: "The Lantern Keepers", giver: "elowen", level: 5, needs: ["two-doorbells"],
    blurb: "Carry Mothlight's lantern night back to your farm, and earn two Moonlit mummy costumes.",
    intro: [{ who: "elowen", text: "We have doors, a supper table and neighbours who knock. Now I'd like your farm to feel like the village's other home." },
      { who: "rowan", text: "Bring us timber, stone and a little fibre for lantern night. Then grow a harvest back home. We'll stitch something wonderfully haunted for you both." }],
    steps: [
      { kind: "deliver", who: "rowan", cost: { logs: 12, stone: 8, fibre: 6, herbs: 4 }, text: "Bring Rowan 12 logs, 8 stone, 6 fibre and 4 herbs" },
      { kind: "harvest", n: 24, text: "Harvest 24 pumpkins back at your farm" },
      { kind: "talk", who: "elowen", text: "Return to Elowen for your Lantern Keeper outfits" },
    ],
    talk: { elowen: [{ who: "elowen", text: "Twenty-four little lights for the fields. You haven't just visited Mothlight; you've carried it home." },
      { who: "rowan", text: "Two Moonlit mummy costumes. Soft linen, good stitching and absolutely no actual curses. I checked twice." }] },
    reward: { friendship: { elowen: 120, rowan: 120 }, costumes: ["natalie-mummy", "shane-mummy"], villageDecor: { "moon-gate": 1, "moth-lamp": 2 }, effect: "lantern-keepers", coins: 250 } },
  ...BLIGHT_QUESTS,
].map((q) => Object.freeze({ kind: "friendship", needs: [], intro: [], talk: {}, done: [], reward: {}, ...q, steps: Object.freeze(q.steps.map(Object.freeze)) })));
export const QUEST_BY_ID = Object.freeze(Object.fromEntries(QUESTS.map((q) => [q.id, q])));

// Story objects: the pages of Elowen's letter. The third blows onto the farm, by the patch.
export const STORY_OBJECTS = Object.freeze([
  { id: "page-1", place: "village", x: FIXTURES.well.x / PLAN_SCALE + 2.3, z: FIXTURES.well.z / PLAN_SCALE - 1.4, name: "A page of Elowen's letter" },
  { id: "page-2", place: "village", x: 26, z: 7, name: "A page of Elowen's letter" },
  { id: "page-3", place: "farm", x: 3.4, z: 12.6, name: "A page of Elowen's letter" },
].map((o) => Object.freeze(o.place === "village" ? { ...o, x: o.x * PLAN_SCALE, z: o.z * PLAN_SCALE } : o)));

// Blueprints: homes built by a quest's build step (materials and coins are taken by its deliver and pay steps).
export const BLUEPRINTS = Object.freeze([
  { id: "rowan-workshop", name: "Rowan's workshop cottage", plot: "02", resident: "rowan" },
  { id: "elowen-conservatory", name: "Elowen's conservatory library", plot: "01", resident: "elowen" },
].map(Object.freeze));

// Favours: one open request per resident, for things the farm makes. Paid like
// a sale (it counts towards your level), with a little friendship. `level` and
// `when` keep a favour back until the farm can make what it asks for.
export const FAVOUR_WAIT = 300;
export const FAVOURS = Object.freeze([
  { id: "r-heads", who: "rowan", item: "pumpkin:orange", n: 6, pay: 72, text: "Six Orange pumpkins for scarecrow heads", line: "I'm stuffing new scarecrows for the fields. They need heads, and nothing's friendlier than an orange." },
  { id: "r-sign", who: "rowan", item: "pumpkin:witchfire", n: 4, pay: 80, level: 4, text: "Four Witchfire pumpkins to paint the stall's sign", line: "I want the stall's sign to glow like your Witchfires. I'll mix the paint from their skins." },
  { id: "r-logs", who: "rowan", item: "material:logs", n: 6, pay: 48, text: "Six logs for a neighbour's fence", line: "The crows' fence is down again. Six logs would do it. They'll pay me in buttons; I'll pay you in coins." },
  { id: "r-stone", who: "rowan", item: "material:stone", n: 5, pay: 45, text: "Five stone for the well's edge", line: "The well's lip is crumbling. Five good stones and I'll have it smart as a chapel." },
  { id: "r-pie", who: "rowan", item: "food:pumpkin-pie", n: 1, pay: 60, when: (s) => s.kitchen?.purchased, text: "A pumpkin pie for the workbench", line: "I've been dreaming of pie. Not just any pie. Your pie. Is that forward of me?" },
  { id: "r-apples", who: "rowan", item: "pantry:apples", n: 3, pay: 36, when: (s) => (s.kitchen?.pantry?.apples ?? 0) > 0 || s.kitchen?.purchased, text: "Three apples for the crows' rent", line: "The crows want apples this month. Three should settle the account." },
  { id: "r-moonlight", who: "rowan", item: "pumpkin:moonlight", n: 5, pay: 90, level: 3, text: "Five Moonlight pumpkins for lantern night", line: "Lantern night practice! I need five Moonlights. Silver ones look grand on the bandstand." },
  { id: "e-moonlight", who: "elowen", item: "pumpkin:moonlight", n: 3, pay: 60, text: "Three Moonlight pumpkins for the reading room", line: "The reading room's lamps are low. Three Moonlights would light every page." },
  { id: "e-midnight", who: "elowen", item: "pumpkin:midnight-moon", n: 1, pay: 70, level: 5, text: "One Midnight Moon pumpkin for its seeds", line: "I'd love a Midnight Moon to press its seeds into the almanac. Only one; they're precious." },
  { id: "e-herbs", who: "elowen", item: "material:herbs", n: 3, pay: 39, text: "Three herbs for violet ink", line: "Violet ink needs herbs from the Green. Three bunches would last me a month of letters." },
  { id: "e-fibre", who: "elowen", item: "material:fibre", n: 4, pay: 40, text: "Four fibre to rebind old books", line: "Some of the old books are falling apart. Four bundles of fibre and I'll stitch them whole." },
  { id: "e-cocoa", who: "elowen", item: "pantry:cocoa", n: 2, pay: 30, when: (s) => s.kitchen?.purchased, text: "Two cocoa for late reading", line: "Late reading wants cocoa. Two measures, and I'll read till the moths fall asleep." },
  { id: "e-cookies", who: "elowen", item: "food:ghost-cookies", n: 2, pay: 66, when: (s) => s.kitchen?.recipes?.includes?.("ghost-cookies"), text: "Two ghost cookies for the study", line: "The little ghost in my study has asked, very politely, for cookies shaped like herself." },
  { id: "e-orange", who: "elowen", item: "pumpkin:orange", n: 8, pay: 88, text: "Eight Orange pumpkins for the almanac's harvest page", line: "The almanac wants to draw a harvest. It draws from life. Eight oranges, please." },
].map((f) => Object.freeze({ level: 1, ...f })));
export const FAVOUR_BY_ID = Object.freeze(Object.fromEntries(FAVOURS.map((f) => [f.id, f])));

// Almanac duties: a page of four, drawn from those the farm can do now, counted
// from when the page was drawn. Each pays a little; a whole page pays its prize.
export const DUTIES = Object.freeze([
  { id: "chat", kind: "chat", n: 2, coins: 40, text: "Chat with 2 neighbours" },
  { id: "gather", kind: "gather", n: 8, coins: 50, text: "Gather 8 materials" },
  { id: "sell", kind: "sell", n: 30, coins: 60, text: "Sell 30 pumpkins" },
  { id: "harvest", kind: "harvest", n: 25, coins: 50, text: "Pick 25 pumpkins" },
  { id: "gift", kind: "gift", n: 1, coins: 40, text: "Give a gift in Mothlight" },
  { id: "favour", kind: "favour", n: 1, coins: 60, text: "Do a neighbour a favour" },
  { id: "decorate", kind: "decorate", n: 1, coins: 50, text: "Place a decoration in Mothlight" },
  { id: "earn", kind: "earn", n: 600, coins: 60, text: "Earn £600 on the farm" },
  { id: "carve", kind: "carve", n: 1, coins: 70, level: 4, when: (s) => !!s.estate?.placed?.some?.((p) => p.id === "carving-bench"), text: "Carve a jack-o'-lantern" },
  { id: "cook", kind: "cook", n: 2, coins: 70, when: (s) => s.kitchen?.purchased, text: "Cook 2 batches of food" },
  { id: "fish", kind: "fish", n: 2, coins: 70, when: (s) => !!s.estate?.placed?.some?.((p) => p.id === "fishing-lake"), text: "Catch 2 fish at your lake" },
].map((d) => Object.freeze({ level: 1, ...d })));
export const DUTY_BY_ID = Object.freeze(Object.fromEntries(DUTIES.map((d) => [d.id, d])));
// A full page's prize, in turn.
export const ALMANAC_PRIZES = Object.freeze([
  { villageDecor: { "flower-barrow": 1 }, coins: 120 },
  { materials: { logs: 8, stone: 6, fibre: 4 } },
  { villageDecor: { "toadstool-lamp": 2 }, coins: 80 },
  { coins: 300 },
  { villageDecor: { sundial: 1 }, materials: { herbs: 4 } },
  { villageDecor: { "moth-lantern-string": 1 }, coins: 150 },
].map(Object.freeze));
