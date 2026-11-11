// The words of Mothlight's main story, chapter by chapter. village-expansion.js keeps where each step happens
// and what it rewards; this file keeps what the player is told.
//
//   blurb    what the chapter is about, for the journal
//   intro    its giver's opening scene, played once before the first step (a line may name another speaker)
//   steps    one entry per step, in order:
//              verb   the action's own word on the prompt and the button ("Read", "Hang", "Knock")
//              look   what is there before you act
//              found  what happens when you do (a reveal's scene stays with its step in village-expansion.js)
//              clue   what a puzzle shows as known: enough to solve it, never the answer in the buttons' order
//   done     the giver's closing scene
//   change   one line for the receipt: what is different in Mothlight now
//
// Voices: Elowen is precise and dry; Rowan cheerful and unfinished; Vesper courtly; Mabel shy and exact;
// Tansy brisk; Opal spare; Cinder eager; Corvus theatrical and chastened; the Baron grand and puzzled;
// Granny gruff. Nobody is cruel and nothing here is a monster: the village's trouble is doors left shut.
const line = (who, text) => Object.freeze({ who, text });

export const EXPANSION_STORY = Object.freeze({
  "green-research": {
    blurb: "Ink is seeping up through the roots of the great tree and writing on Elowen's pages by itself. She thinks the village is trying to remember something.",
    intro: [
      line("elowen", "The almanac has started writing itself. I leave a page out at night, and by morning the roots have signed it."),
      line("elowen", "There is one pinned by my door, stamped with a moth. Read it for me? I have looked at it so often the marks have stopped meaning anything."),
    ],
    steps: [
      { verb: "Read", look: "A damp page pinned beside Elowen's door. Root-ink has stamped it with three small marks, over and over." },
      { verb: "Solve", look: "Three cold glass lights stand in the flower bed, each engraved with a mark. They want lighting in the order the page gave.", clue: "The page repeats three marks: moth, moon, lantern.", found: "The three lights catch one after another, and the ink on the page dries at last." },
      { verb: "Light", look: "An old ward lantern on its post, dark for years. The three lights have left it warm.", found: "The ward lantern takes the flame. For a moment every root on the Green glows faintly, like veins." },
    ],
    done: [
      line("elowen", "A ward lantern. We used to light one for every door that had somebody behind it."),
      line("elowen", "Take this lamp home with you. If the roots are remembering, we had better give them something worth writing down."),
    ],
    change: "The first ward lantern burns on Hollow Green.",
  },
  "green-workshop": {
    blurb: "Rowan built himself a front door and has never once heard anyone knock on it. The bell that should hang beside it is still in pieces.",
    intro: [
      line("rowan", "I've a confession. Nobody's ever knocked on my door. I checked it works. Knocked on it myself, felt daft, went back in."),
      line("rowan", "There's a bell meant to hang by it. It's been nearly finished since the roof went on. Have a look, would you? Tell me it's not as bad as I think."),
    ],
    steps: [
      { verb: "Examine", look: "A brass bell lying on its side on Rowan's doorstep, with its frame in three pieces beside it.", found: "Nothing is broken. The frame was simply never put together: a brace, the bell and its clapper, all waiting." },
      { verb: "Solve", look: "The three pieces of the bell frame, and a pencil note tucked under the brace.", clue: "Rowan's note: \"A brace holds the bell up. The clapper goes inside the bell. Do it in that order or it all lands on your foot.\"", found: "The frame stands square. The bell swings once, testing itself." },
      { verb: "Hang", look: "An empty iron hook beside Rowan's door, at exactly knocking height.", found: "The bell hangs by the door. Rowan rings it, jumps, and laughs at himself." },
    ],
    done: [
      line("rowan", "Would you look at that. A finished thing. On my own house."),
      line("rowan", "Ring it whenever you're passing. I'll pretend to be surprised. Here: I made you a shelf while I was putting off the bell."),
    ],
    change: "A welcome bell hangs by Rowan's door.",
  },
  "green-supper": {
    blurb: "Vesper has laid a supper table on the Green every evening for years and cleared it away untouched. Tonight the place cards have gone missing, which Vesper takes as an encouraging sign.",
    intro: [
      line("vesper", "I lay this table every evening. Three places. I clear it every morning. One learns to fold a napkin very beautifully when nobody arrives to unfold it."),
      line("vesper", "Tonight the place cards have wandered off. Cards only wander when they expect to be needed. Do find them for me."),
    ],
    steps: [
      { verb: "Search", look: "A long supper table under the lanterns: three chairs, three empty card holders.", found: "Three place cards, tucked under a plate. On the back of each is a note in the same hand: \"beside the new timber\", \"in the reading light\", \"last, nearest the door, to welcome\"." },
      { verb: "Solve", look: "Three chairs and three cards. Each neighbour has a proper place, and a proper moment to sit down.", clue: "Seat the carpenter first, beside the new timber. Then the reader, under the light. The host sits down last.", found: "Three cards, three chairs. For the first time the table looks as if it is expecting company." },
      { verb: "Join", look: "The lanterns are lit and the chairs are pulled out. All the supper needs is for someone to sit down first." },
    ],
    done: [
      line("vesper", "Do you know, I had quite forgotten what a full table sounds like. It is mostly spoons."),
      line("vesper", "Keep this bench. And keep coming. A seat is only a seat until somebody is expected in it."),
    ],
    change: "Hollow Green's seal is lit: the first of four.",
  },
  "copse-threads": {
    blurb: "Brambles have closed over Moonroot Copse and its two cottages. A banner on Mabel's gate restitches itself every night, and nobody has seen Mabel in a long time.",
    intro: [
      line("mabel", "Oh! A visitor. An actual one, on the actual path. I had the brambles so nicely arranged to prevent this."),
      line("mabel", "The banner on my gate has started sewing itself. I didn't ask it to. Would you look at it and tell me what it wants? I should rather not go out there myself."),
    ],
    steps: [
      { verb: "Study", look: "A cloth banner on Mabel's gate. Its thread moves by itself, unpicking and resewing the same picture." },
      { verb: "Follow", look: "Along the lane to Tansy's cottage some bramble leaves are green and whole where the rest are black. Someone has marked a way through.", found: "The green leaves lead from Mabel's gate to Tansy's without a single thorn. Somebody wanted these two houses joined." },
      { verb: "Solve", look: "Mabel's pattern frame, with three loose patches waiting to be pinned in order.", clue: "The banner, from top to bottom: a moon, a moth beneath it, and an open door at the foot.", found: "The pattern holds. The thread stops moving, as if it has finally been understood." },
    ],
    done: [
      line("mabel", "Moon, moth, open door. It's an invitation. My own gate has been inviting people in behind my back."),
      line("mabel", "I made these while I was hiding. Two outfits. It seems a waste to keep them in a drawer if there is going to be company."),
    ],
    change: "Mabel's tailoring is yours to wear: two outfits join the wardrobe.",
  },
  "copse-lantern": {
    blurb: "Something under the Copse is humming, and Tansy's garden hums back. The old miners' stair behind her cottage goes down to it.",
    intro: [
      line("tansy", "Hear that? No, lower. In your boots. My whole herb bed has been humming along with it for a week."),
      line("tansy", "It's coming up the old miners' stair. I'd go myself, but somebody has to stay and tell the brambles to behave. Mind your head on the way down."),
    ],
    steps: [
      { verb: "Read", look: "Chalk marks on the cave wall, left by miners long ago. The oldest are nearly worn away." },
      { verb: "Mine", look: "A seam of amethyst, shivering with a low note. One crystal stands a little proud of the rock.", found: "The crystal comes free in one piece and goes on singing quietly in your hand." },
      { verb: "Solve", look: "Three standing stones at the foot of the stair, each cut with a mark. They ring when touched.", clue: "The miners' oldest marks: a small bell, then a candle, then a star.", found: "The stones answer one after another, and then the whole stair falls silent. It is a comfortable silence." },
    ],
    done: [
      line("tansy", "It stopped! Oh, the mint will be so relieved. It was going flat."),
      line("tansy", "The miners left a light on for whoever came after them. That's all the humming was. Somebody waiting to be answered."),
    ],
    change: "The Lantern Steps are quiet, and yours to mine.",
  },
  "copse-restored": {
    blurb: "The Copse is quiet, but its brambles are still rooted in something black under Tansy's garden. Lift it, and Mabel might open her door.",
    intro: [
      line("mabel", "Tansy says the brambles have an anchor. A black knot in the middle of the garden, holding all of it shut."),
      line("mabel", "I have been practising opening the door. I get as far as the handle. Perhaps if the garden went first, I could go second."),
    ],
    steps: [
      { verb: "Solve", look: "Three lanterns along the garden path, each on a turning post: one carved with a root, one a stem, one a bloom.", clue: "Tansy's rule, painted on a seed tray: \"Everything healthy grows the same way. Root first, then stem, then bloom.\"", found: "The three lanterns face along the path, and the brambles lean away from the light." },
      { verb: "Lift", look: "A black, knuckled root at the heart of the garden. Every bramble in the Copse runs back to it.", found: "The anchor comes up with a sound like a held breath let go. Underneath is nothing but good soil." },
      { verb: "Watch", look: "Mabel's door, and Mabel's hand on the far side of it." },
    ],
    done: [
      line("mabel", "I opened it. Did you see? I opened it, and nothing dreadful came in. You came in."),
      line("tansy", "Take two of my planters for your garden, and my notes on keeping a harvest fresh. A neighbour's allowed to be useful."),
    ],
    change: "Moonroot Copse is restored. Its seal is the second of four.",
  },
  "quarry-bell": {
    blurb: "The bridge to Lantern Quarry has stood half-finished since its bell cracked. Opal has kept the pieces, and the dark, ever since.",
    intro: [
      line("opal", "That bell rang every evening to call the masons down for supper. It cracked the night nobody came. I have not had the heart to recast it."),
      line("opal", "The bridge lanterns still stand. If light could cross the ravine again, I might believe the rest could follow. Start with the bell. Listen to it."),
    ],
    steps: [
      { verb: "Listen", look: "A bronze bell on Opal's bench, split from lip to crown. She has kept it polished.", found: "Struck gently, the bell gives a flat, cracked note. Across the ravine a single lantern flickers in reply." },
      { verb: "Solve", look: "Three mirrored lanterns along the bridge. Turned the right way, they would carry one beam from this bank to the far one.", found: "The beam leaps from mirror to mirror and lands on the far bank. The quarry has a way in again." },
      { verb: "Secure", look: "The bridge's last brace, cut and never fitted. It has leant against the parapet for years.", found: "The brace seats with one clean knock. The bridge stops creaking." },
    ],
    done: [
      line("opal", "It holds. Of course it holds; I cut that stone myself. I simply never had a reason to finish it."),
      line("opal", "Keep this lantern. And when you cross, walk in the middle. Not because it is unsafe. Because it is yours to cross."),
    ],
    change: "The footbridge is finished, and the Drowned Workings open below the Lantern Steps.",
  },
  "quarry-supper": {
    blurb: "Chef Cinder has cooked the same supper every night for a dining room that stays empty. The menu he wrote for the masons is still on the wall.",
    intro: [
      line("cinder", "Table for— oh. You're real. Forgive me, I have been seating empty chairs for so long I've started asking them about their day."),
      line("cinder", "The night the bell cracked I had supper ready for forty masons. Nobody came. I never worked out what was wrong with it. The menu is still up. Tell me what you make of it."),
    ],
    steps: [
      { verb: "Read", look: "A hand-lettered menu behind dusty glass by the restaurant door.", found: "The old menu: a warm pumpkin dish, a garnish of garden herbs, a spoon of butter to finish. Underneath, in smaller letters: \"Nothing fiery. They have had a long day.\"" },
      { verb: "Solve", look: "Cinder's pot, four jars and a ladle. Three of the jars belong in the old supper.", clue: "From the menu: warm pumpkin, garden herbs, a buttery finish. \"Nothing fiery.\"", found: "Cinder tastes the pot and goes very still. \"That's it. That is exactly it.\"" },
      { verb: "Tell Cinder", look: "Cinder wants to know the supper still works in a living kitchen. Cook a fresh batch of anything at your farm, then come back.", found: "You tell Cinder about the batch. He wants to know everything: the steam, the smell, who had the first spoonful." },
    ],
    done: [
      line("cinder", "It was never the supper. The supper was perfect. It was only that nobody knocked."),
      line("cinder", "Take the recipe home. Lantern stew. Make it for people who turn up."),
    ],
    change: "Cinder's lantern stew joins your recipes.",
  },
  "restaurant-opening": {
    blurb: "The stew is right and the tables are laid. All Cinder's restaurant has never had is an opening night.",
    intro: [
      line("cinder", "I have a confession. In all these years I never put the welcome card in the window. I told myself I would when everything was ready."),
      line("cinder", "Everything was ready years ago. Would you put it up? If I do it, I shall only take it down again."),
    ],
    steps: [
      { verb: "Place", look: "A small card on the sill inside the restaurant window, face down.", found: "The card goes up in the window: \"Open. Come in, whoever you are.\"" },
      { verb: "Solve", look: "Three chairs at the best table, and Cinder's seating note propped against the salt.", clue: "Cinder's note: \"Rowan built the table, so he sits first. Elowen reads the grace. The cook sits down last, and only when everyone else is eating.\"", found: "Three chairs drawn out. Cinder hovers behind the third as if it might bite." },
      { verb: "Open", look: "The pot is on, the card is in the window, and someone is coming up the steps." },
    ],
    done: [
      line("cinder", "They ate it. They asked for more. Somebody complimented the spoons."),
      line("cinder", "I can keep things cold as well as hot, you know. Opal has plans for a cold store, and I shall be wanting your cooking for the restaurant. Proper orders. Paid."),
    ],
    change: "Cinder's restaurant is open. The Quarry's seal is the third of four.",
  },
  "moor-stage": {
    blurb: "Carnival Moor's lights are on and its rides turn, but there has been no show since Corvus frightened his last audience clean out of the tent.",
    intro: [
      line("corvus", "Roll up, roll— no. Old habit. There is nothing to roll up for."),
      line("corvus", "My last show was magnificent. Thunder, trapdoors, a scream on every seat. They ran. All of them. I took my bow to an empty tent. The programme is still where I dropped it."),
    ],
    steps: [
      { verb: "Read", look: "A trampled programme at the foot of the stage, its cover a grinning raven.", found: "Every act in the programme is a fright. Not one line welcomes anybody in. On the last page Corvus has written, small: \"Why did they go?\"" },
      { verb: "Solve", look: "The stage manager's cue board, wiped clean. Three cues want places in a gentler running order.", clue: "Light the lanterns as people come in, so they can find a seat. Raise the curtain once they are settled. Save the bow for the very end.", found: "The cues are chalked on the board in a new order. Corvus reads them twice, moving his beak." },
      { verb: "Raise", look: "The great striped curtain, down since the last show, and its rope.", found: "The curtain rises on an empty stage with the lanterns already lit. It looks like an invitation rather than a trap." },
    ],
    done: [
      line("corvus", "Light first. So they can see there is nothing to fear. I had it backwards for thirty years."),
      line("corvus", "A showman pays his debts. I shall dress your hayride lane with a little scenery of mine. Nothing that bites."),
    ],
    change: "Corvus's scenery joins your hayride.",
  },
  "moor-collection": {
    blurb: "Baron Brassbolt owns one of everything and cannot remember where any of it came from. One frame in his manor has always been empty.",
    intro: [
      line("baron", "Ah, the pumpkin magnates. Do come and admire things. I have a great many, all of them expensive."),
      line("baron", "That frame? Empty. I bought it to hold something important and have never worked out what. It vexes me. Everything else here has a receipt."),
    ],
    steps: [
      { verb: "Examine", look: "A gilded frame on the manor steps with nothing in it. A folded note is wedged behind the glass.", found: "The note is in the Baron's own hand, years old: \"For the things nobody sold me. A gift. A promise. A home.\"" },
      { verb: "Solve", look: "Three small things from the back of a drawer: a chipped cup, a ticket stub and a door key.", clue: "The Baron's note: \"A gift first. Then a promise. Then a home.\"", found: "A cup somebody gave him, a ticket from a promise kept, and a key. They fit the frame as if it had been measured for them." },
      { verb: "Furnish", look: "A cold corner of the manor's porch, all marble and no chairs.", found: "Two chairs, a lamp and the frame on the wall. It is the only corner of the manor that looks lived in." },
    ],
    done: [
      line("baron", "Three things, and I did not pay for any of them. I find I like them best. How irritating."),
      line("baron", "You shall have me as a guest at the farm. I will book properly, in advance, and try very hard not to tip."),
    ],
    change: "The Baron can reserve a table at your farm.",
  },
  "moor-restored": {
    blurb: "The stage is ready and the Baron has promised to sit in the front row. Corvus needs a show that ends with people staying.",
    intro: [
      line("corvus", "I have written a new finale. Then I tore it up. Then I wrote the old one again out of nerves, and tore that up too."),
      line("corvus", "Help me order it. I know how to make them gasp. I never learnt how to make them stay."),
    ],
    steps: [
      { verb: "Solve", look: "Corvus's torn-up finale, in three pieces on the stage boards.", clue: "Pieced together, his notes read: \"Bring them in together. Let them tell me who they are. THEN the fireworks.\"", found: "Gather, listen, celebrate. Corvus pins the running order to the curtain where he cannot lose his nerve." },
      { verb: "Light", look: "One lantern at the end of the midway has never been lit. Corvus always said the dark made a better exit.", found: "The last lantern burns. The way out of the carnival is now as bright as the way in." },
      { verb: "Welcome", look: "Rows of seats, and the sound of neighbours finding them." },
    ],
    done: [
      line("corvus", "They stayed. They stayed for the bow. I had forgotten it was meant to be a thank you."),
      line("corvus", "Take this for your mantelpiece. A little model of the night, in case I ever doubt it happened."),
    ],
    change: "Carnival Moor is restored. Its seal is the fourth, and the Marsh road opens.",
  },
  "marsh-reflections": {
    blurb: "With four seals lit, the road to Mirror Marsh has surfaced. Its old observatory reflects an inscription that is not written anywhere.",
    intro: [
      line("elowen", "Four seals. I have been writing that in the almanac all morning to see if it would stay written. It has."),
      line("elowen", "The marsh shows things the right way round only in the water. There is an inscription on the observatory you can read nowhere but its reflection. I think it is the last page."),
    ],
    steps: [
      { verb: "Read", look: "The observatory's stone lintel is blank. Its reflection in the marsh is not.", found: "In the water the lintel reads: \"We came back by an open door, a shared supper and a lantern left burning.\"" },
      { verb: "Solve", look: "Three marker stones at the water's edge: a door, a supper bowl and a lantern.", clue: "The reflection: \"an open door, a shared supper and a lantern left burning.\"", found: "Door, supper, lantern. Under the water, a line of pale stones begins to show." },
      { verb: "Raise", look: "Stepping stones, a hand's breadth under the surface, leading out across the marsh.", found: "The stones rise dripping into the air, one by one, all the way to the far bank." },
    ],
    done: [
      line("elowen", "That is how you did it. Every district. A door, a supper, a lantern. You have been walking the path without anyone showing it to you."),
      line("elowen", "The stones lead down as well as across. There is something under all of this, and I think it is time we went and listened to it."),
    ],
    change: "The marsh path is raised, and with it the way down to the Root Cathedral.",
  },
  "marsh-heart": {
    blurb: "Under the marsh, every root in Mothlight meets in one great chamber. Whatever Blackroot is, it begins here.",
    intro: [
      line("elowen", "Every root I have ever followed comes here. The tree on the Green, the brambles in the Copse, the black knots under your boots."),
      line("elowen", "I expected something dreadful. A monster, at least. Stay close. I should like a witness when I am wrong."),
    ],
    steps: [
      { verb: "Mine", look: "A pale opal bedded in the cathedral wall, with something moving slowly inside it.", found: "The opal comes away whole. Held to the ear, it sounds like a room full of people talking quietly." },
      { verb: "Solve", look: "Crystals in the vault overhead, turning slowly out of line. Three carvings ring the chamber floor.", clue: "Carved round the chamber: roots running to a heart, and from the heart, a small house.", found: "Root, heart, home. The crystals in the vault turn like a slow sky, and settle." },
      { verb: "Listen", look: "The great root at the centre of the cathedral. It is hollow, and it is listening." },
    ],
    done: [
      line("elowen", "It was never a curse. It is every knock nobody answered, kept somewhere safe because nobody else would keep it."),
      line("elowen", "Blackroot grows where a door stays shut. That is all. That is the whole dreadful secret. We can mend that."),
    ],
    change: "You know what Blackroot is.",
  },
  "marsh-restored": {
    blurb: "Opal wants the observatory to do the opposite of what it was built for: to be seen from every door in Mothlight.",
    intro: [
      line("opal", "This place was built to look out. Nobody thought to make it something you could look at. I should like to correct that before I lose my nerve."),
      line("opal", "One beam, through three mirrors, out of the great window. If I have cut the glass true, every district will see it."),
    ],
    steps: [
      { verb: "Solve", look: "Three mirrors in the observatory's dome, and one cold lamp waiting at the foot of them.", found: "The beam climbs the dome, mirror to mirror, and stops at the shuttered window." },
      { verb: "Open", look: "The observatory's great window, shuttered since the village went quiet.", found: "The shutters fold back. Light pours out across the marsh, and far away a lamp on the Green answers it." },
      { verb: "Watch", look: "The marsh at night, with lamps coming on along paths nobody has walked in years." },
    ],
    done: [
      line("opal", "There. Now nobody in Mothlight can say they did not know where to find a light."),
      line("opal", "Take this bench. Put it somewhere with a view of a window. Any window. It need not be mine."),
    ],
    change: "Mirror Marsh is restored. Every district is lit.",
  },
  "festival-prepare": {
    blurb: "Every door is open and every district lit. Vesper proposes the one thing Mothlight has not had in living or unliving memory: a party with everybody at it.",
    intro: [
      line("vesper", "I have kept the Velvet Bat for a very long time, and I have never once had to ask whether there were enough chairs. I am asking now. It is thrilling."),
      line("vesper", "Lantern Night. The whole village at one table. I have drawn up a programme. It begins, I am afraid, with you and a great many pumpkins."),
    ],
    steps: [
      { verb: "Read", look: "Vesper's programme, written in a beautiful hand and pinned to the supper table.", found: "\"Lantern Night. Everyone. Bring: twelve fresh pumpkins, two batches of something warm, and yourselves.\"" },
      { verb: "Tell Vesper", look: "Lantern Night needs pumpkins picked for the occasion. Harvest twelve at your farm, then come back.", found: "Twelve pumpkins, picked fresh. Vesper inspects each one as if it were a guest." },
      { verb: "Tell Vesper", look: "And something warm for the table. Cook two fresh batches at your farm, then come back.", found: "Two batches, still warm. The whole Green smells of supper." },
    ],
    done: [
      line("vesper", "Splendid. I have not been this nervous since I was alive, and I was a nervous man."),
      line("vesper", "Rowan wants a word about the table. Apparently mine is not big enough. I have never been so pleased to be told so."),
    ],
    change: "Lantern Night is on the calendar.",
  },
  "festival-arrange": {
    blurb: "Rowan has measured the Green and concluded that the only table big enough for everybody is the village itself. It needs a running order, a larder and one last invitation.",
    intro: [
      line("rowan", "I measured Vesper's table. Then I measured the neighbours. Then I sat down for a bit."),
      line("rowan", "So here's the plan: no table. Well, lots of tables. All the way round the tree. The village is the table. I just need to know what happens on it, and in what order."),
    ],
    steps: [
      { verb: "Solve", look: "Rowan's planning plank, chalked and rubbed out several times, and four painted signs waiting for their posts.", clue: "Rowan's plank: \"Say hello before anyone eats. Eat before anyone talks too long. Stories, THEN Corvus.\"", found: "Welcome, supper, stories, show. Rowan saws the plank into a signpost." },
      { verb: "Supply", look: "The long tables round the tree, laid and waiting. They want twelve pumpkins and four cooked portions from your farm.", found: "Twelve pumpkins down the middle and four warm dishes between them. The tables look like a harvest." },
      { verb: "Take", look: "One invitation is left on the table, and it has no name on it.", found: "Rowan says that one is for whoever turns up without being asked. There is always someone. You put it where it will be found." },
    ],
    done: [
      line("rowan", "That's the lot. Tables, supper, running order. I finished something, and it's the size of a village."),
      line("rowan", "Elowen's got the last job. She says it has to be her. Something about the first lantern."),
    ],
    change: "The tables are laid for Lantern Night.",
  },
  "lantern-night": {
    blurb: "One lantern for each place you brought back. Light them in the order you walked them, and Mothlight will have its first Lantern Night.",
    intro: [
      line("elowen", "The first thing you ever did here was light a ward lantern outside my door. I wrote it down. I did not know it was the first line of anything."),
      line("elowen", "Five lanterns round the tree, one for each district. Light them the way you walked them. The roots will know if we get it wrong, but I rather think they will forgive us."),
    ],
    steps: [
      { verb: "Solve", look: "Five unlit lanterns in a ring round the great tree, each painted with a district's mark.", clue: "The road your story took: the Green first, then the Copse, down to the Quarry, out to the Moor, and last across the Marsh.", found: "Five lanterns, lit in the order you earned them. The great tree's roots glow gold instead of black." },
      { verb: "Begin", look: "The whole village, round one table, waiting for somebody to say begin." },
      { verb: "Leave", look: "An unlit lantern by the tree with a card on it: \"For next year.\"", found: "You set the lantern where it will be found. A promise is only a door left open on purpose." },
    ],
    done: [
      line("elowen", "I have kept the almanac for longer than I will admit, and tonight is the first page I have not had to write alone."),
      line("elowen", "Thank you for knocking. That is all it ever took. Come back tomorrow. There is always a tomorrow now."),
    ],
    change: "Mothlight remembered. Lantern Night is yours to keep.",
  },
  "granny-listens": {
    blurb: "West of the Copse a maze of corn surrounds a crooked house nobody visits. The scarecrows at its gate have been taught a rhyme.",
    intro: [
      line("tansy", "That's the Crooked Acre. Granny Brambletooth's. She was old when I was a seedling, and she has not had a visitor since."),
      line("tansy", "Don't go barging up to the door. She can't abide it. The scarecrows will tell you the proper way, if you can read crooked."),
    ],
    steps: [
      { verb: "Read", look: "A scarecrow at the edge of the corn with a board hung round its neck. The writing leans." },
      { verb: "Solve", look: "Three field bells on posts along the path, each cast with a shape: a moon, a crow, a thorn.", clue: "The scarecrow's rhyme: \"Moon before crow, crow before thorn.\"", found: "Three bells, rung in order. Somewhere in the corn a kettle comes off the boil." },
      { verb: "Knock", look: "The crooked front door, and a brass knocker shaped like an ear." },
    ],
    done: [
      line("granny", "Most folk run at the gate. The clever ones shout from the lane. You knocked. I shall put the kettle back on."),
      line("granny", "There's a straight way through the corn for those I'm expecting. I've had it shut forty years. Mind you wipe your feet."),
    ],
    change: "Granny's door is open, and a straight path through the corn.",
  },
  "granny-bells": {
    blurb: "Granny's scarecrows were built to send people away. She would like them retrained, and she has a pudding she has not made for company in forty years.",
    intro: [
      line("granny", "Those three in the field were stitched to see folk off. Very good at it. Too good. I've had nobody to cook for since the old king was a tadpole."),
      line("granny", "There's a card in my recipe tin about how a visitor ought to be met. Find it. I've forgotten the middle part, and the middle part's the one that matters."),
    ],
    steps: [
      { verb: "Search", look: "A dented recipe tin on Granny's porch, full of cards in the same leaning hand.", found: "Behind the pudding recipe is a card headed \"How to be Called Upon\": \"They knock. You wait, so they know you heard and were not startled. Then you welcome them. In that order, or it's an ambush.\"" },
      { verb: "Solve", look: "The three watchers on their poles, each with a painted board that can be turned to face the lane.", clue: "Granny's card: \"They knock. You wait. Then you welcome.\"", found: "The three watchers turn on their poles to face the lane. For the first time they look as if they are waving." },
      { verb: "Open", look: "A small gate in the garden wall, tied shut with forty years of string.", found: "The string gives. The gate swings in, which is the welcoming direction for a gate." },
    ],
    done: [
      line("granny", "Knock, wait, welcome. It's the waiting I'd lost. I used to get the door open before they'd finished and frighten them off the step."),
      line("granny", "Here. Bramble pudding. It's better than it sounds and worse than it looks. Make it for somebody."),
    ],
    change: "Granny's bramble pudding joins your recipes.",
  },
  "granny-eyes": {
    blurb: "The watchers in the corn have empty settings where their eyes should be. Granny says they used to see who was coming, and be glad.",
    intro: [
      line("granny", "They had eyes once. Proper ones, cut from the caves. Could tell a friend from a fox at two fields. Then nobody came, and I let them go dark. Seemed kinder."),
      line("granny", "Have a look at the big one. If you've been down those mines, you may have just what he's missing."),
    ],
    steps: [
      { verb: "Study", look: "The tallest scarecrow, close to. Two neat settings in its sackcloth face, both empty.", found: "Pinned inside the scarecrow's hat is a jeweller's note: \"One eye for moonlight. One for warmth. And a thought to see by.\"" },
      { verb: "Solve", look: "Three little drawers in the scarecrow's post, each with a brass label.", clue: "The jeweller's note: \"Moonlight first, then warmth, then a thought to see by.\"", found: "The settings are cleaned and ready. All they need now is the stones." },
      { verb: "Wake", look: "The kindest of the three watchers, waiting. He needs one Lantern Amethyst and one Ember Garnet from the caves.", found: "An amethyst for moonlight, a garnet for warmth. The scarecrow's head lifts, and it looks down the lane like someone hoping." },
    ],
    done: [
      line("granny", "There he is. Hello, you daft old thing. Look who's come to see us."),
      line("granny", "He'll keep an eye on your hayride lane, if you'll have him. He likes to wave at the wagon."),
    ],
    change: "Granny's scarecrow joins your hayride.",
  },
  "granny-table": {
    blurb: "Granny has cooked for one for so long that her table has forgotten how to be laid for two. She asks, gruffly, whether you would bring supper.",
    intro: [
      line("granny", "I'm not asking. I'm mentioning. If a person were to turn up with something hot from their own kitchen, a person would not be turned away."),
      line("granny", "And I'd need the table laid. I know it's cup, plate and something else. It's the something else I can't lay hands on."),
    ],
    steps: [
      { verb: "Tell Granny", look: "Granny would like something hot from your own kitchen. Cook a fresh batch at your farm, then come back.", found: "You set the dish down. Granny lifts the lid, sniffs, and says nothing at all, which from Granny is a standing ovation." },
      { verb: "Solve", look: "Granny's kitchen table, bare. Something is scratched under its edge, where a child might have written it.", clue: "Under the table edge: \"A cup to hold. A plate to share. A chair so they'll stay.\"", found: "A cup, a plate and a second chair pulled up. The table remembers the rest by itself." },
      { verb: "Sit down", look: "Two places laid in the crooked kitchen, and the kettle singing." },
    ],
    done: [
      line("granny", "It was the chair. Forty years laying a table, and I'd stopped putting out the second chair."),
      line("granny", "That rocker's yours. It creaks in the key of company. Don't oil it."),
    ],
    change: "A place is always laid at Granny's.",
  },
  "granny-invited": {
    blurb: "There is one invitation to Lantern Night that nobody else in Mothlight dares deliver. Granny Brambletooth has not left the Crooked Acre in forty years.",
    intro: [
      line("granny", "A party. On the Green. With people. I know what a party is, thank you. I simply have not been to one since they were invented."),
      line("granny", "Well, hand it over. Don't hover. If I'm going I shall need to pack, and if I'm packing I shall need telling what to take."),
    ],
    steps: [
      { verb: "Deliver", look: "Granny's letterbox, which has a small sign: \"No circulars. No crows.\"", found: "Granny reads the invitation three times, turns it over to check the back, and puts it in her apron pocket, next to a biscuit." },
      { verb: "Solve", look: "Granny's shelf by the door, and a packing list on the back of a seed packet.", clue: "Her list: \"Bell, to say I've arrived. Shawl, for the walk. Lantern, to find my way home after.\"", found: "A bell, a shawl and a lantern, set by the door. Granny looks at them as if they belonged to a braver woman." },
      { verb: "Walk", look: "The garden gate, the lane beyond it, and Granny on the wrong side of forty years." },
    ],
    done: [
      line("granny", "I've left the door on the latch. First time. If the house wants to listen for me coming back, it can."),
      line("granny", "These are for you two. I made them for visitors I never had. They'll do nicely for friends."),
    ],
    change: "Granny is coming to Lantern Night.",
  },
});

// What a chapter's saved effects mean to the player. Effects not listed here are bookkeeping and stay out of
// sight (a chapter's own id, the seals, flags another chapter reads).
export const EFFECT_BENEFITS = Object.freeze({
  "preservation-research": "Preservation wax to research in your kitchen",
  "footbridge": "The quarry footbridge",
  "cold-store-blueprint": "Cold store plans from Opal",
  "food-commissions": "Paid cooking orders from Cinder",
  "ride-scenery": "Corvus's scenery on your hayride",
  "vip-reservations": "The Baron's table reservations at your farm",
  "acre-shortcut": "A straight path through Granny's corn",
  "scarecrow-scenery": "Granny's scarecrow on your hayride",
  "green-seal": "Hollow Green's seal (1 of 4)",
  "copse-seal": "Moonroot Copse's seal (2 of 4)",
  "quarry-seal": "Lantern Quarry's seal (3 of 4)",
  "moor-seal": "Carnival Moor's seal (4 of 4)",
});

// A verb for any step that has none of its own.
export const STEP_VERBS = Object.freeze({ inspect: "Look closer", puzzle: "Solve", restore: "Restore", reveal: "Watch", farm: "Check in", "story-vein": "Mine", vein: "Mine" });
