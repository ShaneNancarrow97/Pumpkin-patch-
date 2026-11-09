// The Blackroot Blight is a parallel village story, never a replacement for
// an old completed chapter. Coordinates here use the village's design grid.
export const BLIGHT_MATERIAL = Object.freeze({ id: "cursed-spores", name: "Cursed spores", district: "green", yield: 1, respawn: 600 });
const patchScale = id => .72 + ([...id].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 307) % 34) / 100;
export const BLIGHT_NODE_SITES = Object.freeze([
  { id: "blight-green-01", district: "green", x: 12, z: 4 },
  { id: "blight-green-02", district: "green", x: 25, z: 4 },
  { id: "blight-green-03", district: "green", x: 39, z: 4 },
  { id: "blight-green-04", district: "green", x: 48, z: 4 },
  { id: "blight-green-05", district: "green", x: 72, z: 30 },
  { id: "blight-green-06", district: "green", x: 84, z: 30 },
  { id: "blight-green-07", district: "green", x: 85, z: 14 },
  { id: "blight-green-08", district: "green", x: 113, z: 14 },
  { id: "blight-green-09", district: "green", x: 38.8, z: 20.7 },
  { id: "blight-green-10", district: "green", x: 38.8, z: 26.3 },
  { id: "blight-green-11", district: "green", x: 80.4, z: 23.5 },
  { id: "blight-green-12", district: "green", x: 74.8, z: 18.7 },
  { id: "blight-green-13", district: "green", x: 48.6, z: 42.8 },
  { id: "blight-green-14", district: "green", x: 39.8, z: 43.6 },
  { id: "blight-green-15", district: "green", x: 30.2, z: 41.2 },
  { id: "blight-green-16", district: "green", x: 7.8, z: 43.6 },
  { id: "blight-green-17", district: "green", x: 17.4, z: 43.6 },
  { id: "blight-green-18", district: "green", x: 28.6, z: 45.2 },
  { id: "blight-green-19", district: "green", x: 90.2, z: 46 },
  { id: "blight-green-20", district: "green", x: 85.4, z: 40.4 },
  { id: "blight-green-21", district: "green", x: 66.2, z: 46.8 },
  { id: "blight-green-22", district: "green", x: 79, z: 47.6 },
  { id: "blight-green-23", district: "green", x: 81.4, z: 45.2 },
  { id: "blight-green-24", district: "green", x: 95, z: 41.2 },
  { id: "blight-green-25", district: "green", x: 2, z: 4.3 },
  { id: "blight-green-26", district: "green", x: 8.4, z: 2.7 },
  { id: "blight-green-27", district: "green", x: 84.8, z: 12.3 },
  { id: "blight-green-28", district: "green", x: 88, z: 29.1 },
  { id: "blight-green-29", district: "green", x: 114.3, z: 18.7 },
  { id: "blight-green-30", district: "green", x: 85.6, z: 16.3 },
  { id: "blight-green-31", district: "green", x: 105.6, z: -14.4 },
  { id: "blight-green-32", district: "green", x: 64, z: -2.4 },
  // Future district sockets remain behind the same unimplemented gates as
  // their ordinary resources. No current quest asks the player to reach them.
  { id: "blight-copse-01", district: "copse", x: 26, z: 58 },
  { id: "blight-copse-02", district: "copse", x: 26, z: 78 },
  { id: "blight-quarry-01", district: "quarry", x: 54, z: 66 },
  { id: "blight-quarry-02", district: "quarry", x: 63, z: 70 },
].map(n => Object.freeze({ ...n, kind: "blight", action: "Root out", material: BLIGHT_MATERIAL.id, scale: patchScale(n.id) })));

// Each clearing step counts new work from the moment that step begins. Three,
// three and two patches fit the Green's many sites without a forced respawn wait.
export const BLIGHT_QUESTS = Object.freeze([
  { id: "blight-first-signs", kind: "story", arc: "blight", chapter: 1, title: "A Bruise Beneath the Green", giver: "elowen", level: 3, needs: ["invitation"],
    blurb: "Red sap beads on purple fungus around the Green. Elowen needs sealed samples before the roots find your pumpkin fields.",
    intro: [
      { who: "elowen", text: "Do you see those purple caps? The red drops aren't dew. They climb back up the stalk when the moon goes behind a cloud." },
      { who: "elowen", text: "Rowan calls it Blackroot. He found a strand under his bench. It tapped on the wood after he pulled it out. Three taps, like somebody knocking." },
      { who: "elowen", text: "Root out three fresh patches around the Green. Lift the whole dark knot, not just the cap. Keep a little spore sample in each sealed jar for me." },
      { choices: [
        { tone: "warm", text: "We'll keep it away from everyone's homes.", reply: "Thank you. Don't let its ugly little tricks make you careless." },
        { tone: "curious", text: "Does it come back?", reply: "The buried roots regrow after a while. We can quiet this outbreak; finding what wakes it will take longer." },
        { tone: "playful", text: "No mushroom soup, then?", reply: "Absolutely no mushroom soup. These jars stay out of the kitchen." },
      ] },
    ],
    steps: [
      { kind: "root-out", district: "green", n: 3, text: "Root out 3 fresh Blackroot patches on Hollow Green" },
      { kind: "deliver", who: "elowen", cost: { "cursed-spores": 3 }, text: "Bring Elowen 3 sealed cursed-spore samples" },
      { kind: "talk", who: "rowan", text: "Ask Rowan what he heard beneath the roots" },
    ],
    talk: { rowan: [
      { who: "rowan", text: "You pulled the lot out? Good. The knocking's stopped. Mostly. The third tap's still in my mallet." },
      { who: "rowan", text: "Elowen says the spores fold towards sound. Old roots carry old voices. She's working on a quieting mixture, made from perfectly ordinary garden herbs." },
      { who: "rowan", text: "I'll hang a little light where the roots were. Something friendly to knock on instead." },
    ] },
    reward: { coins: 60, friendship: { elowen: 25, rowan: 20 }, villageDecor: { "toadstool-lamp": 1 }, effect: "blight-studied" } },

  { id: "blight-root-and-remedy", kind: "story", arc: "blight", chapter: 2, title: "Roots, Remedies and Supper", giver: "rowan", level: 5, needs: ["blight-first-signs"],
    blurb: "Make a clean herb wrap, quiet a second outbreak, then return to your farm for a healthy harvest. Elowen has a farmhouse recipe to thank you.",
    intro: [
      { who: "rowan", text: "Elowen's jars hum when the roots wake. I've lined a box with fibre so we can carry the quieting herbs without waking them further." },
      { who: "rowan", text: "Bring me three ordinary herbs and four fibre. Then clear three more fresh patches. Elowen says the mixture is for the roots; it is not food." },
      { who: "rowan", text: "Afterwards, check your own patch. A dozen sound pumpkins will tell us the healthy soil is holding its ground." },
    ],
    steps: [
      { kind: "talk", who: "rowan", text: "Help Rowan prepare the quieting wraps" },
      { kind: "deliver", who: "rowan", cost: { herbs: 3, fibre: 4 }, text: "Bring Rowan 3 herbs and 4 fibre for the wraps" },
      { kind: "root-out", district: "green", n: 3, text: "Root out 3 more fresh Blackroot patches on the Green" },
      { kind: "harvest", n: 12, text: "Harvest 12 healthy pumpkins at your farm" },
      { kind: "talk", who: "elowen", text: "Tell Elowen how the clean harvest fared" },
    ],
    talk: {
      rowan: [
        { who: "rowan", text: "Fibre outside, clean herbs inside. Tie it firm. There: one quieting wrap. It works on Blackroot. Sadly, it doesn't work on crows." },
        { who: "rowan", text: "Leave the unopened patches until the wraps are ready. We need to measure what changes after we use them." },
      ],
      elowen: [
        { who: "elowen", text: "Twelve healthy pumpkins. The blight hasn't crossed the hill. Your farm and our Green are looking after one another." },
        { who: "elowen", text: "You've earned a proper supper. I wrote down that vegetable skillet you liked. Clean garden herbs only. Rowan was quite firm about the humming jars!" },
      ],
    },
    reward: { friendship: { elowen: 35, rowan: 35 }, recipes: ["garden-skillet"], villageDecor: { "coffin-planter": 1 }, effect: "blight-remedy" } },

  { id: "blight-lantern-ward", kind: "story", arc: "blight", chapter: 3, title: "A Light the Roots Remember", giver: "elowen", level: 8, needs: ["blight-root-and-remedy"],
    blurb: "Investigate the last two Green patches, help Rowan line a ward with timber and stone, then take an apothecary cabinet home. The trail beyond the gates remains a mystery.",
    intro: [
      { who: "elowen", text: "The quieting wraps hold, but the buried threads point north. Towards the Copse. And somewhere beneath the Quarry, something answers." },
      { who: "elowen", text: "We're not opening closed gates on a hunch. Rowan wants to give the Green a proper ward first: solid timber, clean stone and a light that remembers home." },
      { who: "elowen", text: "Root out two fresh patches for comparison, then take the sealed samples and building materials to Rowan. One more good harvest will show whether the hill stays quiet." },
    ],
    steps: [
      { kind: "root-out", district: "green", n: 2, text: "Root out 2 fresh Blackroot patches for the ward study" },
      { kind: "deliver", who: "rowan", cost: { "cursed-spores": 2, logs: 6, stone: 4 }, text: "Bring Rowan 2 spore samples, 6 logs and 4 stone" },
      { kind: "harvest", n: 18, text: "Harvest 18 pumpkins while the ward is tested" },
      { kind: "talk", who: "elowen", text: "Return to Elowen with news from your farm" },
    ],
    talk: { elowen: [
      { who: "elowen", text: "Not a red drop beyond the hill. The Green can breathe again. Blackroot will still return in little knots, but now we know how to lift it safely." },
      { who: "elowen", text: "Rowan made you an apothecary cabinet for the house. Shelves for clean spices, not cursed samples. He says it's a home worth coming back to." },
      { who: "elowen", text: "When the northern paths are ready, we'll follow the threads into the Copse and down to the old Quarry. For now, you've kept both our homes safe." },
    ] },
    reward: { coins: 120, friendship: { elowen: 45, rowan: 45 }, decor: ["gothic-spice-cabinet"], villageDecor: { "moth-lamp": 1 }, effect: "blight-ward" } },
].map(Object.freeze));
