import { asset } from "../platform/assets.js";
import { iconArt } from "../ui/icons.js";
import { farmPaintOrder, visitorGround } from "../scene/farm-layers.mjs";
import { advanceFarmActors, characterWalkFrame, createFarmActors, queueFarmTask, resetFarmActors } from "../scene/character-motion.mjs";
import { characterIdleMeta, characterWalkMeta } from "../content/character-walk-meta.mjs";
import { pumpkinVarieties } from "../content/products.js";
import { stockQuantity } from "../core/inventory.js";
import { plotVariety, selectedPlotVariety } from "../core/plot-model.mjs";
import { cost, fresh, growthTime, price, unlocked, update, upgrades } from "../core/model.mjs";
import { createPersistence } from "../platform/storage.js";
import { createNotifications } from "../ui/notifications.js";
import { createActions } from "../core/commands.js";
import { SimulationClock } from "../core/clock.js";
import { houseMapStages } from "../content/house-map-meta.mjs";
import { costumeArtMeta, idleArtMeta, visitorArtMeta } from "../content/animation-meta.mjs";

function createGame() {
  const settingsSections = [];
  let started = false;
  const $ = (id) => document.getElementById(id), ctx = $("canvas").getContext("2d"), W = 1e3, H = 610;
  const notifications = createNotifications($), toast = notifications.show;
  let storage;
  try {
    storage = localStorage;
  } catch {
    storage = null;
  }
  const persistence = createPersistence(storage);
  let s = persistence.load();
  const actions = createActions(() => s), { plant: plant2, harvest: harvest2, click: click2, buy: buy2, upgradePlot: upgradePlot2 } = actions;
  const simulationClock = new SimulationClock();
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const atlas = new Image();
  atlas.src = asset("assets/house/character-atlas.webp");
  const nightFarm = new Image();
  nightFarm.src = asset("assets/house/farm-night.webp");
  const mapHouseImage = new Image();
  mapHouseImage.src = asset("assets/house/exteriors.webp");
  const sproutImage = new Image();
  sproutImage.src = asset("assets/house/sprout.svg");
  const pumpkinFrames = new Image();
  pumpkinFrames.src = asset("assets/house/pumpkin-animation.webp");
  const idleSprites = [new Image(), new Image()];
  idleSprites[0].src = asset("assets/house/natalie-idle.webp");
  idleSprites[1].src = asset("assets/house/shane-idle.webp");
  const visitorTypes = ["ghost", "witch", "vampire", "skeleton", "scarecrow"];
  const walkingVisitors = Object.fromEntries(visitorTypes.map((type) => {
    const image = new Image();
    image.src = asset("assets/house/visitor-" + type + ".webp");
    return [type, image];
  }));
  const costumeSprites = { natalie: new Image(), shane: new Image() };
  costumeSprites.natalie.src = asset("assets/house/natalie-costumes.webp");
  costumeSprites.shane.src = asset("assets/house/shane-costumes.webp");
  const walkingCharacters = Object.fromEntries(Object.entries(characterWalkMeta).map(([id, meta]) => {
    const image = new Image();
    image.src = asset(meta.path);
    return [id, image];
  }));
  const characterIdles = Object.fromEntries(Object.entries(characterIdleMeta).map(([id, meta]) => {
    const image = new Image();
    image.src = asset(meta.path);
    return [id, image];
  }));
  const renderScale = Math.min(2, window.devicePixelRatio || 1);
  $("canvas").width = W * renderScale;
  $("canvas").height = H * renderScale;
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  let lastTap = -5, plotUpgradeMode = false;
  let saveAvailable = true, saveReason = "";
  let lastVisitorLine = -Infinity;
  let time = 0, last = performance.now(), uiTimer = 0, saveTimer = 0, visitorBubbleTimer, audio;
  const positions = Array.from({ length: 12 }, (_, i) => ({ x: 407 + i % 3 * 113, y: 326 + Math.floor(i / 3) * 64 }));
  const actors = createFarmActors();
  const portraits = [["Natalie", "Co-owner & pumpkin whisperer"], ["Shane", "Co-owner & chief pumpkin lifter"]];
  const banter = [
    [0, "Our very own pumpkin patch. Just us, a few seeds, and a suspicious amount of ambition."],
    [1, "I brought the spade. You brought the vision. And about twelve layers, apparently."],
    [0, "It’s called an autumn outfit, Shane. Now help me plant something."],
    [1, "Do we name the pumpkins? Because this one is definitely a Kevin."],
    [0, "We cannot keep every pumpkin. We’re running a shop, not an orange adoption centre."],
    [1, "Hear me out: a loyalty card. Buy nine pumpkins, receive a slightly larger pumpkin."],
    [0, "The shop smells like autumn and good decisions. Mostly autumn."],
    [1, "Nothing beats a full harvest. Except you. You’re pretty great."],
    [0, "That was almost as sweet as our pumpkins. Almost."],
    [1, "A little dirt on your boots, a little money in the till. That’s a good day."],
    [0, "Imagine fairy lights all the way down the path. And a hot chocolate stand…"],
    [1, "One empire at a time, Nat. First pumpkins. Then world domination."],
    [0, "Look at what we made together. I think we’re getting the hang of this."],
    [1, "Skyla rang the bell. That either means a sale or she wants her dinner."],
    [0, "She checks every pumpkin. Mostly by sitting beside it and looking important."]
  ];
  let dialogueIndex = 0;
  const achievements = { first: ["🌱", "Our first little harvest", "Pick 5 pumpkins.", "Five pumpkins. One big beginning."], visitors: ["♡", "The neighbourhood favourite", "Serve 10 happy visitors.", "Word travels fast when the pumpkins are good."], moon: ["☾", "A little moonlight", "Upgrade a plot to Moonlight seeds.", "This plot now grows pale pumpkins worth £24 each."], helper: ["☞", "Better together", "Buy the Helping hands upgrade.", "Shane and Natalie now keep the farm growing."], empire: ["♛", "An autumn empire", "Earn £1,000 in total.", "From a handful of seeds to something wonderful."], clicker: ["✦", "Pumpkin whisperer", "Tap the big pumpkin 100 times.", "Good things grow with a little encouragement."] };
  function say(index, text) {
    const who = portraits[index];
    $("dialogue-portrait").className = "portrait " + (index ? "shane" : "natalie");
    $("dialogue-portrait").setAttribute("aria-label", who[0]);
    $("dialogue-name").innerHTML = who[0].toUpperCase() + " <span>" + who[1] + "</span>";
    $("dialogue-text").textContent = "“" + text + "”";
  }
  function tone(freq = 520) {
    if (!s.sound)
      return;
    try {
      audio ?? (audio = new (window.AudioContext || window.webkitAudioContext)());
      if (audio.state === "suspended")
        audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(freq * 0.6, audio.currentTime + 0.15);
      g.gain.setValueAtTime(0.06, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(1e-3, audio.currentTime + 0.2);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.2);
    } catch {
    }
  }
  function floating(text, x, y) {
    const el = document.createElement("span");
    el.className = "float-word";
    el.textContent = text;
    el.style.left = x / 10 + "%";
    el.style.top = y / 6.1 + "%";
    $("world").append(el);
    setTimeout(() => el.remove(), 1200);
  }
  function work(index) {
    queueFarmTask(actors, index, positions);
  }
  function bubble(text) {
    if ($("modal").open || app2.features.home.active || time - lastVisitorLine < 6) return;
    lastVisitorLine = time;
    $("visitor-bubble").textContent = text;
    $("visitor-bubble").classList.add("visible");
    clearTimeout(visitorBubbleTimer);
    visitorBubbleTimer = setTimeout(() => $("visitor-bubble").classList.remove("visible"), 1400);
  }
  function plantOne(i) {
    if (plant2(s, i)) {
      work(i);
      tone(340);
      return true;
    }
    return false;
  }
  function harvestOne(i) {
    const result = harvest2(s, i), n = result.value;
    if (n) {
      const streak = result.streak;
      if (streak.bonus) {
        floating("Streak ×" + streak.count + " · +£" + streak.bonus, positions[i].x - 50, positions[i].y - 60);
        tone(880);
      }
      work(i);
      floating("+" + n + " 🎃", positions[i].x - 15, positions[i].y - 25);
      tone(650);
      if (s.harvested <= n)
        say(0, "Our first pumpkin! Quick, put it in the shop before Shane gives it a name.");
      return n;
    }
    return 0;
  }
  positions.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "plot";
    b.style.left = (p.x - 55) / 10 + "%";
    b.style.top = (p.y - 38) / 6.1 + "%";
    b.dataset.plot = i;
    b.addEventListener("click", () => {
      if (s.paused)
        return;
      if (plotUpgradeMode) {
        if (upgradePlot2(s, i)) {
          const v = plotVariety(s, i);
          toast("Plot " + (i + 1) + ": " + v.name + " unlocked. Next planting: " + selectedPlotVariety(s, i).name + ".");
          tone(720);
          save();
          renderUI();
        }
        return;
      }
      if (s.plots[i].phase === "ready")
        harvestOne(i);
      else if (s.plots[i].phase === "empty")
        plantOne(i);
      else {
        click2(s);
        work(i);
        floating("A little love ♡", p.x - 35, p.y - 25);
        tone(430);
      }
      renderUI();
    });
    $("plots").append(b);
  });
  function renderPlotButton(b, i) {
    const p = s.plots[i], locked = i >= unlocked(s), big = p.progress > 0.5;
    const seeds = selectedPlotVariety(s, i), owned = plotVariety(s, i), crop = p.phase === "empty" ? seeds : pumpkinVarieties.find((v) => v.price === p.price), next = pumpkinVarieties[s.plotLevels[i] + 1];
    const key = locked ? "locked" : plotUpgradeMode ? "upgrade-" + s.plotLevels[i] : p.phase + "-" + p.price + "-" + seeds.id + "-" + (big ? "big" : "small");
    b.className = "plot " + crop.id + (locked ? " locked" : "") + (p.phase === "ready" ? " is-ready" : "") + (plotUpgradeMode ? " upgrading" : "");
    b.disabled = s.paused || locked || plotUpgradeMode && (!next || s.coins < next.cost);
    b.dataset.seedName = seeds.name;
    b.dataset.cropPrice = p.price;
    const gourd = '<span class="gourd-art" aria-hidden="true" style="background-image:url(&quot;' + asset("assets/house/pumpkin-animation.webp") + '&quot;)"></span>';
    if (b._visualKey !== key) {
      b._visualKey = key;
      if (locked)
        b.innerHTML = '<span class="locked-vine">♧</span><small>EXPAND TO UNLOCK</small>';
      else if (plotUpgradeMode)
        b.innerHTML = '<span class="plot-upgrade-name">' + (next ? next.name : owned.name) + '</span><span class="plot-upgrade-price">' + (next ? "Upgrade · £" + next.cost : "Fully upgraded") + "</span>";
      else if (p.phase === "empty")
        b.innerHTML = '<span class="seed-icon">+</span><span class="seed-label">' + seeds.name + " · £" + seeds.price + "</span>";
      else if (p.phase === "growing")
        b.innerHTML = (big ? gourd : '<img class="sprout-image" src="' + asset("assets/house/sprout.svg") + '" alt="">') + '<span class="growth-track"><i></i></span>';
      else
        b.innerHTML = gourd + '<span class="ready">PICK · £' + p.price + "</span>";
    }
    if (locked)
      b.setAttribute("aria-label", "Locked plot " + (i + 1) + ". Buy Room for more to unlock.");
    else if (plotUpgradeMode)
      b.setAttribute("aria-label", next ? "Unlock " + next.name + " on plot " + (i + 1) + " for £" + next.cost + ". Current crop is unchanged." : owned.name + " plot " + (i + 1) + ". All varieties unlocked.");
    else if (p.phase === "empty")
      b.setAttribute("aria-label", "Plant plot " + (i + 1) + ". " + seeds.name + " pumpkins sell for £" + seeds.price + ".");
    else if (p.phase === "growing") {
      b.setAttribute("aria-label", "Growing plot " + (i + 1) + ". " + crop.name + ", worth £" + p.price + ". " + Math.ceil((1 - p.progress) * growthTime(s)) + " seconds left. Tap to boost.");
      const track = b.querySelector(".growth-track i");
      if (track)
        track.style.width = p.progress * 100 + "%";
      const gourd2 = b.querySelector(".gourd-art");
      if (gourd2)
        gourd2.style.width = Math.round(35 + p.progress * 24) + "%";
    } else
      b.setAttribute("aria-label", "Harvest plot " + (i + 1) + ". " + crop.name + " pumpkin, worth £" + p.price + ".");
    const art = b.querySelector(".gourd-art");
    if (art) {
      const frame2 = reduced ? 0 : Math.floor(time * 4 + i * 0.6) % 6;
      art.style.backgroundPosition = frame2 % 3 * 50 + "% " + Math.floor(frame2 / 3) * 100 + "%";
    }
  }
  function setPlotUpgradeMode(on) {
    plotUpgradeMode = on;
    $("world").classList.toggle("upgrade-mode", on);
    $("plot-upgrades").classList.toggle("active", on);
    $("plot-upgrades").setAttribute("aria-pressed", String(on));
    $("plot-upgrades").innerHTML = iconArt("seeds") + (on ? "Finish upgrades" : "Crops & seeds");
    renderUI();
  }
  $("plot-upgrades").onclick = () => plotUpgradeMode ? setPlotUpgradeMode(false) : app2.features.plots.open();
  function renderUI() {
    document.body?.classList?.toggle?.("game-paused", s.paused);
    const fmt = (n) => Math.floor(n).toLocaleString("en-GB");
    $("coins").textContent = "£" + fmt(s.coins);
    $("stock").textContent = fmt(stockQuantity(s.inventory));
    $("sold").textContent = fmt(s.sold);
    $("day").textContent = 1 + Math.floor(s.elapsed / 180);
    const values = s.plots.slice(0, unlocked(s)).map((p, i) => p.phase === "empty" ? price(s, i) : p.price), low = Math.min(...values), high = Math.max(...values);
    $("income").textContent = (low === high ? "£" + low : "£" + low + "–£" + high) + " / pumpkin";
    $("stock-note").textContent = stockQuantity(s.inventory) ? "Visitors buy automatically" : "Waiting for a harvest";
    $("patch-state").textContent = plotUpgradeMode ? "Choose one plot · upgrades its next planting" : unlocked(s) + " plots · click to plant or pick";
    if (typeof app2.features.audio.refresh === "function")
      app2.features.audio.refresh();
    const levels = s.earned >= 1e3 ? [4, "AUTUMN EMPIRE", "Built with a lot of heart", s.earned % 1e3 / 1e3] : s.earned >= 500 ? [3, "LOCAL FAVOURITE", "A patch worth visiting", (s.earned - 500) / 500] : s.earned >= 150 ? [2, "GROWING ROOTS", "Something good is growing", (s.earned - 150) / 350] : [1, "LITTLE SEED", "A lovely beginning", s.earned / 150];
    $("level-title").textContent = "LEVEL " + levels[0] + " · " + levels[1];
    $("level-label").textContent = levels[2];
    $("level-progress").style.width = Math.min(100, levels[3] * 100) + "%";
    $("goal").textContent = !s.achievements.includes("first") ? "First harvest: pick " + Math.min(5, s.harvested) + "/5 pumpkins" : !s.achievements.includes("visitors") ? "A warm welcome: " + Math.min(10, s.sold) + "/10 visitors" : !s.plotLevels.some((level2) => level2 > 0) ? "Upgrade a plot to Moonlight · £180" : s.earned < 1e3 ? "Our autumn empire: £" + fmt(s.earned) + "/£1,000 earned" : "An autumn empire, grown together ♡";
    [...$("plots").children].forEach(renderPlotButton);
    $("plant-count").textContent = s.plots.slice(0, unlocked(s)).filter((p) => p.phase === "empty").length;
    $("harvest-count").textContent = s.plots.slice(0, unlocked(s)).filter((p) => p.phase === "ready").length * (1 + s.upgrades.yield);
    $("plant-all").disabled = s.paused || !s.plots.slice(0, unlocked(s)).some((p) => p.phase === "empty");
    $("harvest-all").disabled = s.paused || !s.plots.slice(0, unlocked(s)).some((p) => p.phase === "ready");
    $("click-pumpkin").disabled = s.paused;
    $("mobile-boost").disabled = s.paused;
    $("plot-upgrades").disabled = s.paused;
    if (typeof app2.features.home.refreshMapHouse === "function")
      app2.features.home.refreshMapHouse();
    if (typeof app2.features.home.refreshBalance === "function")
      app2.features.home.refreshBalance();
    if (typeof app2.features.outfits.refreshBalance === "function")
      app2.features.outfits.refreshBalance();
    if (typeof app2.features.festivals.refresh === "function")
      app2.features.festivals.refresh();
    if (typeof app2.features.menus.refreshUpgrades === "function")
      app2.features.menus.refreshUpgrades();
    app2.features.shop?.refresh();
    app2.features.plots?.refresh();
    app2.features.rooms?.refresh();
    if (typeof app2.features.audio.sync === "function")
      app2.features.audio.sync();
    upgrades.forEach((u) => {
      const b = $("upgrade-" + u.id), level2 = s.upgrades[u.id], max = level2 >= u.max;
      const nextCost = cost(s, u.id), shortfall = Math.max(0, Math.ceil(nextCost - s.coins));
      b.disabled = s.paused || max || shortfall > 0;
      b.querySelector(".upgrade-price").textContent = max ? "✓ Owned" : "£" + fmt(nextCost);
      const status = max ? "Fully upgraded" : s.paused ? "Resume to upgrade" : shortfall ? "Need £" + fmt(shortfall) : "Ready to upgrade";
      b.querySelector(".upgrade-level").textContent = "Level " + level2 + " / " + u.max + " · " + status;
      b.querySelector(".upgrade-track i").style.width = level2 / u.max * 100 + "%";
      b.title = max ? "Upgrade complete" : u.description + " Costs £" + nextCost;
      b.setAttribute("aria-label", u.name + ". Level " + level2 + " of " + u.max + ". " + status + (max ? "." : ". Costs £" + fmt(nextCost) + "."));
    });
  }
  upgrades.forEach((u) => {
    const b = document.createElement("button");
    b.className = "upgrade";
    b.id = "upgrade-" + u.id;
    b.innerHTML = '<span class="upgrade-icon upgrade-icon-' + u.id + '" aria-hidden="true">' + iconArt(u.id) + '</span><span class="upgrade-info"><h3>' + u.name + "</h3><p>" + u.description + '</p><span class="upgrade-track"><i></i></span><small class="upgrade-level"></small></span><span class="upgrade-price"></span>';
    b.addEventListener("click", () => {
      if (buy2(s, u.id)) {
        tone(820);
        toast(u.name + " upgraded!");
        b.classList.add("just-upgraded");
        setTimeout(() => b.classList.remove("just-upgraded"), 650);
        if (u.id === "auto")
          say(1, "You mind the shop. We’ll plant and pick. Teamwork makes the pumpkin dream work.");
        if (u.id === "plots")
          say(0, "More room for our little empire. I might be getting carried away.");
        renderUI();
        save();
      }
    });
    $("upgrades").append(b);
  });
  $("plant-all").onclick = () => {
    let n = 0;
    for (let i = 0; i < unlocked(s); i++)
      if (plantOne(i))
        n++;
    if (n)
      toast(n + " seeds planted. Give them a little love!");
    renderUI();
  };
  $("harvest-all").onclick = () => {
    let n = 0;
    for (let i = 0; i < unlocked(s); i++)
      n += harvestOne(i);
    if (n)
      toast(n + " pumpkins added to the shop. Visitors are on their way!");
    renderUI();
  };
  function tap() {
    const r = click2(s);
    if (s.paused)
      return;
    lastTap = time;
    tone(420 + Math.random() * 120);
    floating(r.reward ? "+1 🎃" : r.boost ? "−1.5s ✧" : "♡", 160, 330);
    if (!r.boost && !r.reward && s.clicks % 8 === 1)
      toast("Keep tapping: 8 taps make a bonus pumpkin, or plant some seeds!");
    renderUI();
  }
  $("click-pumpkin").onclick = tap;
  $("mobile-boost").onclick = tap;
  const mapViewport = $("world-viewport");
  function scrollAcross(element, left, animate = false, top) {
    if (animate && !reduced && typeof element.scrollTo === "function") {
      try {
        element.scrollTo({ left, top: top === void 0 ? element.scrollTop || 0 : top, behavior: "smooth" });
        return;
      } catch {
      }
    }
    element.scrollLeft = left;
    if (top !== void 0)
      element.scrollTop = top;
  }
  function scrollToSection(element, block = "start") {
    if (typeof element.scrollIntoView !== "function")
      return;
    try {
      element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block });
    } catch {
      element.scrollIntoView();
    }
  }
  let mapFocus = "field";
  function fitMap() {
    const width = Math.round(Math.max(720, mapViewport.clientWidth, (mapViewport.clientHeight || 420) * W / H));
    $("world").style.width = width + "px";
    $("world").style.height = Math.round(width * H / W) + "px";
  }
  function viewMap(shop = false, animate = true) {
    mapFocus = shop === "home" ? "home" : shop ? "shop" : "field";
    const total = mapViewport.scrollWidth, mapHeight = parseFloat($("world").style.height) || 610;
    const target = mapFocus === "shop" ? total - mapViewport.clientWidth : mapFocus === "home" ? 0 : Math.max(0, Math.min(total - mapViewport.clientWidth, total * 0.515 - mapViewport.clientWidth / 2));
    let top = Math.max(0, Math.min(Math.max(0, mapHeight - mapViewport.clientHeight), mapHeight * (mapFocus === "home" ? 0.35 : mapFocus === "shop" ? 0.49 : 0.69) - mapViewport.clientHeight / 2));
    if (mapFocus === "field") {
      const viewport = mapViewport.getBoundingClientRect(), resources = document.querySelector(".stats").getBoundingClientRect();
      const inset = Math.max(0, Math.min(mapViewport.clientHeight, resources.bottom - viewport.top));
      const head = (positions[0].y + 24 - 160) * mapHeight / H;
      top = Math.min(top, Math.max(0, head - inset - 12));
    }
    scrollAcross(mapViewport, target, animate, top);
    for (const [id, focus] of [["view-home", "home"], ["view-field", "field"], ["view-shop", "shop"]]) {
      $(id).classList.toggle("active", focus === mapFocus);
      $(id).setAttribute("aria-pressed", String(focus === mapFocus));
    }
  }
  $("view-field").onclick = () => viewMap(false);
  $("view-shop").onclick = () => viewMap(true);
  $("view-home").onclick = () => viewMap("home");
  requestAnimationFrame(() => {
    fitMap();
    viewMap(false, false);
  });
  window.addEventListener("resize", () => {
    fitMap();
    viewMap(mapFocus === "home" ? "home" : mapFocus === "shop", false);
  });
  function pause() {
    actions.pause(!s.paused);
    last = performance.now();
    $("paused-overlay").hidden = !s.paused;
    $("pause").innerHTML = s.paused ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M6 3l15 9L6 21z"/></svg> <span>Resume</span>' : '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg> <span>Pause</span>';
    $("pause").setAttribute("aria-label", s.paused ? "Resume game" : "Pause game");
    renderUI();
  }
  $("pause").onclick = pause;
  $("resume").onclick = pause;
  $("talk-shortcut").onclick = () => $("talk").click();
  $("talk").onclick = () => {
    dialogueIndex = (dialogueIndex + 1) % banter.length;
    say(...banter[dialogueIndex]);
    app2.features.menus.openConversation();
  };
  let modalPreviousFocus = null;
  function showModal(html) {
    if (typeof app2.features.menus?.restoreUpgrades === "function")
      app2.features.menus?.restoreUpgrades();
    const modal = $("modal");
    if (!modal.open)
      modalPreviousFocus = document.activeElement;
    notifications.clear();
    $("modal-content").innerHTML = '<p id="menu-feedback" class="menu-feedback" role="status" hidden></p>' + html;
    $("modal-content").scrollTop = 0;
    const heading = $("modal-content").querySelector("h2");
    if (heading) {
      heading.id = "menu-title";
      modal.setAttribute("aria-labelledby", "menu-title");
    } else
      modal.removeAttribute("aria-labelledby");
    modal.setAttribute("aria-modal", "false");
    modal.classList.add("dialog-fallback");
    modal.classList.toggle("menu-costumes", !!$("modal-content").querySelector(".costume-menu"));
    modal.classList.toggle("menu-rooms", !!$("modal-content").querySelector(".rooms-menu"));
    modal.classList.toggle("menu-crops", !!$("modal-content").querySelector(".plot-crops-menu"));
    const upgradesOpen = !!$("modal-content").querySelector(".farm-upgrades-menu");
    modal.classList.toggle("menu-upgrades", upgradesOpen);
    document.body.classList.toggle("upgrade-panel-open", upgradesOpen);
    if (typeof modal.show === "function") {
      if (!modal.open)
        modal.show();
    } else {
      modal.setAttribute("open", "");
      modal.open = true;
    }
    $("modal-shade").hidden = false;
    document.body.classList.add("modal-open");
    document.querySelector("main").inert = true;
    modal.querySelector(".modal-close").focus?.();
    if (typeof app2.features.menus?.markActiveNav === "function") {
      const id = $("modal-content").querySelector(".costume-menu") ? "outfits-nav" : $("modal-content").querySelector(".farm-upgrades-menu") ? "upgrades-nav" : $("modal-content").querySelector(".favour-menu,.achievement") ? "scrapbook-nav" : app2.features.home.active ? "house-nav" : "patch-nav";
      app2.features.menus?.markActiveNav(id);
    }
  }
  function closedMenuUI() {
    if ($("modal").open)
      return;
    if (typeof app2.features.menus?.restoreUpgrades === "function")
      app2.features.menus?.restoreUpgrades();
    $("modal").classList.remove("dialog-fallback");
    $("modal-shade").hidden = true;
    document.body.classList.remove("modal-open", "upgrade-panel-open");
    document.querySelector("main").inert = false;
    if (typeof app2.features.menus?.markActiveNav === "function")
      app2.features.menus?.markActiveNav(app2.features.home.active ? "house-nav" : "patch-nav");
  }
  function closeModal() {
    const modal = $("modal");
    if (typeof modal.close === "function")
      modal.close();
    else {
      modal.removeAttribute("open");
      modal.open = false;
    }
    closedMenuUI();
    modalPreviousFocus?.focus?.();
  }
  $("modal").querySelector(".modal-close").onclick = closeModal;
  $("modal-shade").onclick = closeModal;
  $("modal").addEventListener("close", closedMenuUI);
  $("modal").addEventListener("click", (e) => {
    if (e.target === $("modal")) {
      const r = $("modal").getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        closeModal();
    }
  });
  $("help").onclick = () => showModal('<div class="modal-subtitle">WELCOME TO YOUR LITTLE EMPIRE</div><h2>A patch to call your own.</h2><div class="help-step"><b>1</b><p><strong>Plant a little happiness.</strong><br>Tap empty plots, or Plant all. Seeds are free. Swipe the map to explore the patch and shop.</p></div><div class="help-step"><b>2</b><p><strong>Give it a little love.</strong><br>Wait for pumpkins to grow, or tap Boost or the big pumpkin to speed up every growing plot. Eight taps with nothing growing give a bonus pumpkin.</p></div><div class="help-step"><b>3</b><p><strong>Pick, stock, and prosper.</strong><br>Click ripe pumpkins or Harvest all. Visitors buy from your stock automatically and leave coins.</p></div><div class="help-step"><b>4</b><p><strong>Grow together.</strong><br>Invest in faster growing, bigger harvests, more plots, and Helping hands for automatic planting and picking.</p></div><p>Keyboard: <b>P</b> to plant all · <b>H</b> to harvest all · <b>Space</b> to tap · <b>Esc</b> to pause. Use <b>Upgrade pumpkins</b> to buy better seeds for a single plot. They take effect at its next planting. Pick six plots within five seconds for a £5 streak bonus, available once per minute; tap the map’s favour card for more rewards. Music and effects have separate controls in Settings.</p>');
  $("scrapbook-nav").onclick = () => {
    showModal('<button class="secondary" id="journal-favours">Midnight favours · collect rewards</button><div class="modal-subtitle">THE GOOD THINGS WE GREW</div><h2>Our little scrapbook.</h2><p>' + s.achievements.length + " of 6 memories made. There’s plenty of autumn ahead.</p>" + Object.entries(achievements).map(([id, a]) => '<div class="achievement ' + (s.achievements.includes(id) ? "earned" : "") + '"><span>' + a[0] + "</span><div><h3>" + a[1] + "</h3><p>" + a[2] + "</p><small>" + (s.achievements.includes(id) ? "✓ " + a[3] : "A memory waiting to be made") + "</small></div></div>").join(""));
    $("journal-favours").onclick = app2.features.festivals.open;
  };
  $("patch-nav").onclick = () => scrollToSection($("world"), "center");
  function openSettings() {
    showModal('<div class="modal-subtitle">MAKE YOURSELF AT HOME</div><h2>Little preferences.</h2><div class="setting-row"><span>Spooky music <small class="audio-caption">Moonlit Waltz · original looping score</small></span><button class="secondary" id="setting-music">On</button></div><label class="volume-setting" for="music-volume"><span>Music volume <b id="music-volume-value"></b></span><input id="music-volume" type="range" min="0" max="100" step="1"></label><div class="setting-row"><span>Harvest sound effects</span><button class="secondary" id="setting-sound">Off</button></div><p>Music begins after your first tap and rests when you pause or leave the game. Your patch saves automatically in this browser.</p><div class="setting-row"><span>Start a new patch</span><button class="danger" id="reset">Reset progress</button></div><p id="reset-note">Resetting clears your patch, house, outfits, seed upgrades and favours.</p>');
    app2.features.audio.bindSettings();
    let confirmReset = false;
    $("reset").onclick = () => {
      if (!confirmReset) {
        confirmReset = true;
        $("reset").textContent = "Confirm reset";
        $("reset-note").textContent = "Tap Confirm reset to start over. Close this window to keep your patch.";
        return;
      }
      replaceGameState(fresh());
      toast("A fresh beginning. Let’s grow something lovely.");
    };
    for (const renderSection of settingsSections)
      renderSection();
  }
  $("settings").onclick = openSettings;
  document.addEventListener("keydown", (e) => {
    if ($("modal").open) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
      return;
    }
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName))
      return;
    if (e.code === "Space") {
      if (document.activeElement?.tagName === "BUTTON")
        return;
      e.preventDefault();
      tap();
    }
    if (e.key.toLowerCase() === "p")
      $("plant-all").click();
    if (e.key.toLowerCase() === "h")
      $("harvest-all").click();
    if (e.key === "Escape")
      pause();
  });
  function replaceGameState(state) {
    closeModal();
    s = state;
    persistence.allowReplacement();
    simulationClock.reset();
    last = performance.now();
    app2.features.home.setMode(false);
    plotUpgradeMode = false;
    app2.features.home.reset();
    app2.features.shop?.reset();
    resetFarmActors(actors);
    dialogueIndex = 0;
    say(...banter[0]);
    $("paused-overlay").hidden = true;
    $("pause").setAttribute("aria-label", "Pause game");
    $("pause").innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg> <span>Pause</span>';
    setPlotUpgradeMode(false);
    app2.features.home.render();
    save();
  }
  function save() {
    const result = persistence.save(s);
    saveAvailable = result.ok;
    saveReason = result.reason || "";
    $("save-status").textContent = saveAvailable ? "✓ Progress saved" : persistence.blocked ? "Stored save kept" : "Saving unavailable";
    $("save-warning").hidden = saveAvailable;
    const backupDue = saveAvailable && !!app2.features.backups?.reminder;
    $("preferences-nav").classList.toggle("needs-backup", !saveAvailable || backupDue);
    $("preferences-nav").setAttribute("aria-label", !saveAvailable ? "Game settings. Save needs attention. Download a backup." : backupDue ? "Game settings. A backup is due." : "Game settings");
    $("save-warning").textContent = persistence.blocked ? "Stored save needs review · open Settings" : "Saving unavailable · back up your patch";
    app2.features.backups?.refresh();
  }
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    if (document.hidden)
      save();
  });
  function events(list) {
    for (const e of list) {
      if (e.type === "sale" && !(e.route === "shop" && $("shop-panel"))) {
        floating("+£" + e.amount, 822, 350);
        tone(700);
        const lines = ["Lovely glow!", "Perfect for tonight.", "Freshly picked!", "Spooky choice!", "Taking this home!"];
        bubble(lines[e.visitor % lines.length]);
      }
      if (e.type === "empty")
        bubble(e.reason === "budget" ? "A smaller pumpkin next time." : "Back after harvest!");
      if (e.type === "harvest") {
        work(e.index);
        floating("+" + e.count + " 🎃", positions[e.index].x - 15, positions[e.index].y - 25);
      }
      if (e.type === "plant")
        work(e.index);
      if (e.type === "achievement") {
        toast("New scrapbook memory: " + achievements[e.id][1]);
        if (e.id === "moon")
          say(0, "Our first Moonlight plot! Its next pumpkins will glow pale and pretty — and sell for £24 each.");
        else if (e.id === "empire")
          say(1, "A thousand coins. From a handful of seeds. Look at what we made together.");
        else if (e.id === "first")
          say(1, "Five pumpkins in! Told you this spade was a solid investment.");
      }
    }
  }
  const background = document.createElement("canvas");
  background.width = W * renderScale;
  background.height = H * renderScale;
  const bg = background.getContext("2d");
  bg.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  function ellipse(c, x, y, rx, ry, color) {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  function path(c, points, fill, stroke, width = 1) {
    c.beginPath();
    points(c);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
  }
  function rounded(c, x, y, w, h, r, color) {
    r = Math.min(r, w / 2, h / 2);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
    c.fill();
  }
  function pumpkin(c, x, y, size, value = 12) {
    const white = value === true || value === 24;
    if (pumpkinFrames.complete && pumpkinFrames.naturalWidth) {
      const frame2 = reduced ? 0 : Math.floor(time * 4) % 6, sw = pumpkinFrames.naturalWidth / 3, sh = pumpkinFrames.naturalHeight / 2;
      c.save();
      if (white)
        c.filter = "grayscale(.88) brightness(1.25)";
      else if (value === 42)
        c.filter = "hue-rotate(245deg) saturate(.9)";
      else if (value === 70)
        c.filter = "hue-rotate(20deg) brightness(1.35) saturate(.85)";
      c.drawImage(pumpkinFrames, frame2 % 3 * sw, Math.floor(frame2 / 3) * sh, sw, sh, x - 53 * size, y - 66 * size, 106 * size, 106 * size);
      c.restore();
      return;
    }
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    ellipse(c, 0, 24, 43, 10, "#725c3220");
    const colors = white ? ["#d6cba0", "#e6dab2", "#f5edcd"] : ["#cc692f", "#e08a3b", "#f3a64b"];
    ellipse(c, -26, 0, 19, 30, colors[0]);
    ellipse(c, 26, 0, 19, 30, colors[0]);
    ellipse(c, -13, 0, 22, 34, colors[1]);
    ellipse(c, 13, 0, 22, 34, colors[1]);
    ellipse(c, 0, 0, 17, 36, colors[2]);
    path(c, (p) => {
      p.moveTo(-5, -32);
      p.quadraticCurveTo(-10, -49, 1, -54);
      p.lineTo(8, -49);
      p.quadraticCurveTo(-2, -42, 4, -32);
      p.closePath();
    }, "#6d7847");
    path(c, (p) => {
      p.moveTo(7, -34);
      p.quadraticCurveTo(27, -49, 38, -39);
      p.quadraticCurveTo(30, -25, 7, -32);
    }, "#929849");
    path(c, (p) => {
      p.moveTo(-7, -23);
      p.quadraticCurveTo(-16, 0, -8, 24);
    }, null, white ? "#fff9e3" : "#ffc876", 3);
    c.restore();
  }
  function tree(c, x, y, size, palette) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    ellipse(c, 3, 91, 62, 16, "#656a3519");
    path(c, (p) => {
      p.moveTo(-10, 83);
      p.lineTo(-7, -4);
      p.lineTo(8, -6);
      p.lineTo(13, 83);
      p.closePath();
    }, "#947348");
    path(c, (p) => {
      p.moveTo(0, 50);
      p.lineTo(-27, 12);
      p.moveTo(4, 35);
      p.lineTo(31, 3);
    }, null, "#947348", 7);
    for (const [a, b, r, col] of [[-35, -4, 31, 0], [32, -13, 35, 0], [-23, -38, 35, 1], [19, -41, 35, 1], [0, -63, 30, 2], [-49, -24, 22, 1], [46, -39, 24, 2], [0, -14, 34, 2]])
      ellipse(c, a, b, r, r * 0.9, palette[col]);
    for (let i = 0; i < 20; i++) {
      const a = Math.sin(i * 12.4) * 46, b = Math.cos(i * 4.6) * 44 - 20;
      ellipse(c, a, b, 2.2, 1.2, "#fff8bf35");
    }
    c.restore();
  }
  function fence(c, x1, x2, y) {
    path(c, (p) => {
      p.moveTo(x1, y);
      p.lineTo(x2, y);
      p.moveTo(x1, y + 16);
      p.lineTo(x2, y + 16);
    }, null, "#b2996a", 6);
    for (let x = x1; x < x2; x += 36) {
      rounded(c, x, y - 13, 7, 47, 2, "#aa8a59");
      path(c, (p) => {
        p.moveTo(x + 2, y - 9);
        p.lineTo(x + 2, y + 29);
      }, null, "#ccb382", 2);
    }
  }
  function drawBackground() {
    const c = bg;
    let g = c.createLinearGradient(0, 0, 0, 280);
    g.addColorStop(0, "#f7e9c1");
    g.addColorStop(1, "#e4dfa5");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    ellipse(c, 785, 58, 32, 32, "#fff5d1");
    ellipse(c, 785, 58, 49, 49, "#fff6d322");
    for (const a of [[110, 62, 60], [360, 38, 46], [635, 70, 42], [920, 35, 52]]) {
      ellipse(c, a[0], a[1], a[2], 10, "#fff9e36b");
      ellipse(c, a[0] - 17, a[1] - 7, a[2] * 0.45, 13, "#fff9e35c");
    }
    path(c, (p) => {
      p.moveTo(0, 180);
      p.bezierCurveTo(180, 80, 290, 179, 480, 132);
      p.bezierCurveTo(690, 85, 800, 92, 1e3, 156);
      p.lineTo(1e3, 610);
      p.lineTo(0, 610);
      p.closePath();
    }, "#b5bd87");
    path(c, (p) => {
      p.moveTo(0, 224);
      p.bezierCurveTo(240, 108, 460, 223, 650, 157);
      p.bezierCurveTo(800, 126, 920, 168, 1e3, 197);
      p.lineTo(1e3, 610);
      p.lineTo(0, 610);
      p.closePath();
    }, "#cbd097");
    path(c, (p) => {
      p.moveTo(0, 264);
      p.bezierCurveTo(100, 226, 236, 247, 336, 227);
      p.bezierCurveTo(579, 190, 807, 221, 1e3, 261);
      p.lineTo(1e3, 610);
      p.lineTo(0, 610);
      p.closePath();
    }, "#cfd398");
    for (let i = 0; i < 28; i++) {
      const x = i * 40 - 25, y = 135 + Math.sin(i * 0.7) * 17;
      tree(c, x, y, 0.33, ["#9eac74", "#b0b982", "#c7c28a"]);
    }
    for (let i = 0; i < 180; i++) {
      const x = i * 137.17 % 1e3, y = 240 + i * 71.2 % 360;
      path(c, (p) => {
        p.moveTo(x, y);
        p.lineTo(x - 3, y - 5);
        p.moveTo(x + 1, y);
        p.lineTo(x + 4, y - 4);
      }, null, i % 3 ? "#a6b17445" : "#edefbc80", 1.3);
    }
    path(c, (p) => {
      p.moveTo(1030, 401);
      p.bezierCurveTo(914, 405, 902, 394, 825, 418);
      p.bezierCurveTo(758, 449, 775, 532, 810, 625);
      p.lineTo(700, 625);
      p.bezierCurveTo(714, 528, 673, 454, 753, 383);
      p.bezierCurveTo(848, 334, 926, 346, 1030, 344);
      p.closePath();
    }, "#e9d8ad");
    path(c, (p) => {
      p.moveTo(0, 528);
      p.bezierCurveTo(187, 486, 221, 503, 311, 542);
      p.bezierCurveTo(415, 586, 549, 570, 735, 570);
      p.lineTo(757, 609);
      p.lineTo(0, 610);
      p.closePath();
    }, "#e9d8ad");
    for (let i = 0; i < 43; i++)
      ellipse(c, 758 + i * 17 % 240, 369 + i * 7 % 37, 1.5, 1, "#baac7d55");
    fence(c, 10, 743, 245);
    fence(c, 928, 1020, 283);
    rounded(c, 111, 125, 9, 116, 2, "#987249");
    rounded(c, 266, 132, 9, 111, 2, "#987249");
    c.save();
    c.translate(183, 165);
    c.rotate(-0.035);
    rounded(c, -125, -17, 248, 47, 5, "#6e7850");
    rounded(c, -118, -11, 234, 34, 3, "#79805a");
    c.restore();
    for (let i = 0; i < 8; i++) {
      ellipse(c, 89 + i * 4, 145 + i * 7, 9, 4, i % 2 ? "#cbaa62" : "#bb8e4d");
    }
    ellipse(c, 139, 334, 112, 17, "#69713a15");
    rounded(c, 55, 248, 141, 77, 5, "#e9d4a1");
    path(c, (p) => {
      p.moveTo(39, 252);
      p.lineTo(122, 196);
      p.lineTo(214, 252);
      p.closePath();
    }, "#9d7350");
    path(c, (p) => {
      p.moveTo(45, 250);
      p.lineTo(122, 205);
      p.lineTo(205, 250);
    }, null, "#b18b5e", 5);
    rounded(c, 115, 277, 31, 48, 4, "#9a8657");
    rounded(c, 70, 268, 25, 29, 2, "#9aa78a");
    rounded(c, 162, 269, 24, 28, 2, "#9aa78a");
    for (const x of [82, 174]) {
      path(c, (p) => {
        p.moveTo(x, 269);
        p.lineTo(x, 297);
        p.moveTo(x - 11, 283);
        p.lineTo(x + 11, 283);
      }, null, "#faf0d2", 3);
    }
    ellipse(c, 139, 303, 2, 2, "#e2c696");
    rounded(c, 68, 229, 18, 16, 2, "#886b4e");
    rounded(c, 182, 310, 25, 21, 2, "#a99467");
    pumpkin(c, 193, 307, 0.2);
    for (let i = 0; i < 12; i++) {
      const p = positions[i];
      ellipse(c, p.x, p.y + 7, 55, 32, "#b5b47c33");
      ellipse(c, p.x, p.y, 52, 29, i < 6 ? "#99734c" : "#bcac7a");
      ellipse(c, p.x, p.y - 3, 50, 24, i < 6 ? "#ad8759" : "#c4b789");
      for (let k = -2; k <= 2; k++)
        path(c, (q) => {
          q.moveTo(p.x - 32, p.y + k * 7 - 2);
          q.quadraticCurveTo(p.x, p.y + k * 7 + 2, p.x + 32, p.y + k * 7 - 2);
        }, null, i < 6 ? "#94754e60" : "#ad9f6e55", 1.6);
      for (let n = 0; n < 10; n++)
        ellipse(c, p.x + Math.sin(n * 8) * 39, p.y + Math.cos(n * 7) * 16, 1.2, 1, "#795f4736");
    }
    ellipse(c, 854, 359, 109, 22, "#726c4324");
    rounded(c, 768, 237, 183, 100, 3, "#bb9565");
    for (let i = 0; i < 10; i++)
      path(c, (p) => {
        p.moveTo(772 + i * 18, 244);
        p.lineTo(772 + i * 18, 334);
      }, null, "#a8815450", 2);
    rounded(c, 793, 251, 130, 58, 3, "#6c7250");
    rounded(c, 799, 257, 118, 45, 2, "#f2d9a1");
    rounded(c, 836, 259, 42, 43, 1, "#8a8660");
    path(c, (p) => {
      p.moveTo(838, 281);
      p.lineTo(877, 281);
      p.moveTo(858, 259);
      p.lineTo(858, 302);
    }, null, "#cfbb83", 3);
    rounded(c, 777, 307, 165, 18, 3, "#b18855");
    rounded(c, 777, 313, 165, 5, 2, "#d9b37a");
    pumpkin(c, 809, 299, 0.22);
    pumpkin(c, 835, 300, 0.21, true);
    pumpkin(c, 891, 299, 0.24);
    pumpkin(c, 919, 300, 0.18);
    for (const x of [774, 938])
      rounded(c, x, 228, 8, 125, 2, "#8c7048");
    rounded(c, 754, 167, 214, 61, 6, "#826944");
    rounded(c, 760, 172, 202, 54, 4, "#927a51");
    for (let i = 0; i < 9; i++) {
      const x = 750 + i * 25;
      path(c, (p) => {
        p.moveTo(x + 12, 222);
        p.lineTo(x - 2, 253);
        p.lineTo(x + 23, 253);
        p.lineTo(x + 37, 222);
        p.closePath();
      }, i % 2 ? "#f7e4be" : "#bf7955");
      rounded(c, x - 2, 250, 25, 10, 5, i % 2 ? "#f2dcb0" : "#b56b49");
    }
    rounded(c, 907, 343, 39, 32, 3, "#baa173");
    path(c, (p) => {
      p.moveTo(910, 353);
      p.lineTo(942, 353);
      p.moveTo(910, 364);
      p.lineTo(942, 364);
    }, null, "#8c785340", 2);
    pumpkin(c, 925, 337, 0.32);
    pumpkin(c, 950, 365, 0.28);
    pumpkin(c, 902, 371, 0.17, true);
    rounded(c, 766, 348, 40, 14, 3, "#d4b67b");
    rounded(c, 771, 337, 30, 14, 3, "#ddc18a");
    for (let i = 0; i < 9; i++)
      path(c, (p) => {
        p.moveTo(772 + i * 3, 341);
        p.lineTo(772 + i * 3, 359);
      }, null, "#b69b6250", 1);
    tree(c, 53, 224, 1.02, ["#b6a25b", "#cbb362", "#ddc478"]);
    tree(c, 303, 189, 0.67, ["#aa9658", "#c4a366", "#d8b77a"]);
    tree(c, 950, 184, 0.85, ["#ad9353", "#c3a360", "#dbb476"]);
    tree(c, -22, 426, 1.22, ["#ad9b53", "#c0ac62", "#d4bb73"]);
    tree(c, 991, 520, 0.82, ["#bcb16d", "#cbbb76", "#d8c786"]);
    path(c, (p) => {
      p.moveTo(294, 203);
      p.quadraticCurveTo(560, 270, 755, 216);
    }, null, "#9c987180", 1.3);
    for (let i = 0; i < 16; i++) {
      const t = i / 15, x = 294 + 461 * t, y = (1 - t) * (1 - t) * 203 + 2 * (1 - t) * t * 270 + t * t * 216;
      path(c, (p) => {
        p.moveTo(x, y);
        p.lineTo(x, y + 8);
      }, null, "#989777", 1);
      ellipse(c, x, y + 11, 3, 4, "#fff6c9");
      ellipse(c, x, y + 11, 6, 7, "#fff6c938");
    }
    ellipse(c, 189, 511, 89, 32, "#96915a26");
    rounded(c, 122, 504, 139, 19, 8, "#b49a6a");
    rounded(c, 129, 495, 126, 14, 5, "#d7ba80");
    path(c, (p) => {
      p.moveTo(138, 497);
      p.lineTo(138, 510);
      p.moveTo(240, 497);
      p.lineTo(240, 510);
    }, null, "#ac9062", 2);
    pumpkin(c, 187, 484, 1.15);
    rounded(c, 276, 435, 29, 46, 8, "#b09162");
    path(c, (p) => {
      p.moveTo(277, 445);
      p.lineTo(304, 445);
      p.moveTo(277, 470);
      p.lineTo(304, 470);
    }, null, "#777358", 4);
    ellipse(c, 290, 435, 14, 4, "#cfb180");
    rounded(c, 92, 471, 28, 36, 8, "#ded0a2");
    path(c, (p) => {
      p.moveTo(94, 473);
      p.lineTo(118, 473);
    }, null, "#b5a170", 3);
    pumpkin(c, 108, 465, 0.23);
    for (let i = 0; i < 30; i++) {
      const x = 38 + i * 143 % 690, y = 290 + i * 37 % 267;
      if (x > 340 && x < 685)
        continue;
      path(c, (p) => {
        p.moveTo(x, y);
        p.lineTo(x + 2, y - 10);
      }, null, "#8d9d61", 1);
      ellipse(c, x + 2, y - 10, 3, 2, i % 3 ? "#e8c071" : "#f5e4ad");
    }
    for (const [x, y] of [[333, 527], [335, 269], [947, 408], [58, 553]]) {
      pumpkin(c, x, y, 0.3);
      pumpkin(c, x + 23, y + 7, 0.23, true);
    }
    for (let i = 0; i < 35; i++) {
      const x = i * 89 % 1e3, y = 567 + i * 31 % 43;
      ellipse(c, x, y, 4, 1.5, i % 2 ? "#bda76b80" : "#c7915580");
    }
    c.save();
    c.font = "italic 14px Georgia";
    c.fillStyle = "#8d7953";
    c.textAlign = "center";
    c.fillText("tap a little love", 189, 548);
    for (const p of positions.slice(0, 6)) {
      path(c, (q) => {
        q.moveTo(p.x - 46, p.y + 7);
        q.bezierCurveTo(p.x - 68, p.y + 24, p.x - 15, p.y + 34, p.x + 25, p.y + 21);
      }, null, "#75895380", 2);
      for (let j = 0; j < 3; j++) {
        c.save();
        c.translate(p.x - 36 + j * 21, p.y + 24);
        c.rotate(-0.35 + j * 0.3);
        ellipse(c, 0, 0, 7, 3, j % 2 ? "#8fa15b" : "#a1af67");
        c.restore();
      }
    }
    for (let i = 0; i < 7; i++) {
      path(c, (q) => {
        q.moveTo(787, 270 + i * 8);
        q.lineTo(791, 270 + i * 8);
        q.moveTo(926, 270 + i * 8);
        q.lineTo(931, 270 + i * 8);
      }, null, "#8c674670", 1);
    }
    for (const [x, y] of [[740, 347], [746, 355], [756, 350], [982, 336]]) {
      path(c, (q) => {
        q.moveTo(x, y + 9);
        q.lineTo(x, y);
      }, null, "#6e8850", 1.5);
      for (let k = 0; k < 5; k++)
        ellipse(c, x + Math.cos(k * 1.256) * 3, y + Math.sin(k * 1.256) * 3, 2.5, 2.5, "#dc9976");
      ellipse(c, x, y, 1.8, 1.8, "#f4da8e");
    }
    c.restore();
  }
  let backgroundReady = false;
  function visitor(c, v) {
    const { x, y } = visitorGround(v);
    const sway = reduced || s.paused ? 0 : Math.sin(v.age * 2.4) * 2.2;
    c.save();
    c.translate(x, y + sway);
    ellipse(c, 0, 4, 20, 5, "#08041065");
    const type = visitorTypes[v.id % visitorTypes.length], image = walkingVisitors[type], meta = visitorArtMeta[type], walking = v.age < 3 || v.checked && v.age >= v.leaveAt;
    if (image.complete && image.naturalWidth && meta) {
      const frame2 = walking && !reduced && !s.paused ? Math.floor(v.age * 5) % 4 : 0, r = meta.rects[frame2], height = type === "ghost" ? 82 : 110, scale = height / meta.height, dw = r[2] * scale, dh = r[3] * scale;
      if (type === "ghost")
        moonGlow(c, 0, -38, 43, 0.065, "191,172,255");
      c.drawImage(image, ...r, -dw / 2, -dh, dw, dh);
    } else {
      path(c, (p) => {
        p.moveTo(-18, -5);
        p.lineTo(-18, -35);
        p.quadraticCurveTo(-18, -60, 0, -60);
        p.quadraticCurveTo(18, -60, 18, -35);
        p.lineTo(18, -5);
        p.lineTo(9, -11);
        p.lineTo(0, -5);
        p.lineTo(-9, -11);
        p.closePath();
      }, "#d3c8df");
      ellipse(c, -6, -37, 2, 3, "#49364c");
      ellipse(c, 6, -37, 2, 3, "#49364c");
    }
    if (v.bought) {
      const carried = v.basket?.[0], variety = pumpkinVarieties.find((p) => "pumpkin-" + p.id === carried?.productId);
      pumpkin(c, 20, -23, 0.28, variety?.price || v.amount);
      if (v.quantity > 1) {
        const second = v.basket?.find((l) => l !== carried) || carried;
        const other = pumpkinVarieties.find((p) => "pumpkin-" + p.id === second?.productId);
        pumpkin(c, 5, -17, 0.22, other?.price || variety?.price || v.amount);
      }
    }
    c.restore();
  }
  function moonGlow(c, x, y, r, alpha, color = "255,163,58") {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + color + "," + alpha + ")");
    g.addColorStop(1, "rgba(" + color + ",0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  function drawNightBeds(c) {
    for (let i = 0; i < 12; i++) {
      const p = positions[i], open = i < unlocked(s);
      const soil = c.createRadialGradient(p.x, p.y, 5, p.x, p.y, 52);
      soil.addColorStop(0, open ? "#34231f99" : "#261f2238");
      soil.addColorStop(1, "#20191c00");
      ellipse(c, p.x, p.y + 3, 52, 23, soil);
      if (!open) continue;
      for (let n = 0; n < 15; n++) ellipse(c, p.x + Math.sin(n * 7.31 + i) * 36, p.y + Math.cos(n * 13.2 + i) * 14, 0.7, 0.5, n % 2 ? "#96765355" : "#17131c65");
    }
  }
  function drawCrop(index) {
    const p = positions[index], plot = s.plots[index];
    if (plot.phase === "empty") return;
    ellipse(ctx, p.x, p.y + 5, plot.phase === "ready" ? 27 : 17, 6, "#08050a66");
    if (plot.phase === "growing" && plot.progress < 0.22) {
      const height = 28 + plot.progress * 38;
      if (sproutImage.complete && sproutImage.naturalWidth) ctx.drawImage(sproutImage, p.x - height / 2, p.y - height + 6, height, height);
      return;
    }
    const size = plot.phase === "ready" ? 0.72 : 0.4 + plot.progress * 0.32;
    pumpkin(ctx, p.x, p.y - 27 * size, size, plot.price);
  }
  function drawActor(a) {
    if (!atlas.complete || !atlas.naturalWidth) return;
    const walk = a.walking, bob = reduced || s.paused || walk ? 0 : Math.sin(time * 2.3) * 0.45;
    ellipse(ctx, a.x, a.y + 3, 24, 6, "#05030970");
    ctx.save();
    ctx.translate(a.x, a.y + bob);
    const character = a.side ? "shane" : "natalie", outfit = s.wardrobe.equipped[character], costumed = outfit !== character + "-base";
    const movement = characterWalkMeta[outfit], walkImage = walkingCharacters[outfit];
    if (walk && movement && walkImage.complete && walkImage.naturalWidth) {
      const frame2 = characterWalkFrame(a, reduced), r = movement.rects[frame2], scale = 160 / movement.referenceHeight;
      ctx.drawImage(walkImage, ...r, -movement.anchor[0] * scale, -movement.anchor[1] * scale, r[2] * scale, r[3] * scale);
      a.clip = "walk";
      a.frame = frame2;
      a.artPath = movement.path;
      ctx.restore();
      return;
    }
    const standing = characterIdleMeta[outfit], standingImage = characterIdles[outfit];
    if (standing && standingImage.complete && standingImage.naturalWidth) {
      const phase = (time + a.side * 1.7) % 5, frame2 = reduced || s.paused || walk ? 0 : phase < 2.7 ? 0 : phase < 3.35 ? 1 : phase < 3.48 ? 2 : phase < 4.05 ? 1 : 0;
      const r = standing.rects[frame2], scale = 160 / standing.referenceHeight;
      ctx.drawImage(standingImage, ...r, -standing.anchor[0] * scale, -standing.anchor[1] * scale, r[2] * scale, r[3] * scale);
      a.clip = "idle";
      a.frame = frame2;
      a.artPath = standing.path;
      ctx.restore();
      return;
    }
    const idle = costumed ? costumeSprites[character] : idleSprites[a.side], meta = costumed ? costumeArtMeta[outfit] : idleArtMeta[character];
    if (idle.complete && idle.naturalWidth && meta) {
      const phase = (time + a.side * 1.7) % 5, frame2 = reduced || s.paused || walk ? 0 : phase < 2.7 ? 0 : phase < 3.35 ? 1 : phase < 3.48 ? 2 : phase < 4.05 ? 3 : 0;
      const r = meta.rects[frame2], scale = 160 / meta.height, dw = r[2] * scale, dh = r[3] * scale;
      ctx.drawImage(idle, ...r, -dw / 2, -dh, dw, dh);
      a.clip = "idle";
      a.frame = frame2;
      a.artPath = costumed ? "assets/house/" + character + "-costumes.webp" : "assets/house/" + character + "-idle.webp";
    } else ctx.drawImage(atlas, a.side * 768, 0, 768, 1024, -59, -158, 118, 160);
    ctx.restore();
  }
  let paintOrder = [];
  let nightBedCache = null, nightBedLevel = -1;
  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    if (nightFarm.complete && nightFarm.naturalWidth) {
      ctx.drawImage(nightFarm, 0, 0, W, H);
      if (!nightBedCache || nightBedLevel !== s.upgrades.plots) {
        nightBedCache = document.createElement("canvas");
        nightBedCache.width = W * renderScale;
        nightBedCache.height = H * renderScale;
        const nc = nightBedCache.getContext("2d");
        nc.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        drawNightBeds(nc);
        nightBedLevel = s.upgrades.plots;
      }
      ctx.drawImage(nightBedCache, 0, 0, W, H);
      const flicker = reduced ? 1 : 0.9 + Math.sin(time * 4.3) * 0.065 + Math.sin(time * 7.1) * 0.025;
      moonGlow(ctx, 851, 235, 64, 0.1 * flicker);
      moonGlow(ctx, 166, 263, 45, 0.08 * flicker);
    } else if (nightFarm.complete) {
      if (!backgroundReady) {
        drawBackground();
        backgroundReady = true;
      }
      ctx.drawImage(background, 0, 0, W, H);
    }
    if (mapHouseImage.complete && mapHouseImage.naturalWidth) {
      const stage = houseMapStages[s.house.level];
      ellipse(ctx, stage.x + stage.width * 0.52, 321, stage.width * 0.46, 13, "#05030b4d");
      ctx.drawImage(mapHouseImage, ...stage.rect, stage.x, stage.y, stage.width, stage.height);
      moonGlow(ctx, stage.x + stage.width * 0.58, stage.y + stage.height * 0.7, 41, 0.065);
    }
    for (let i = 0; i < unlocked(s); i++)
      if (s.plots[i].phase === "ready") {
        const p = positions[i], pulse = reduced ? 0.16 : 0.14 + Math.sin(time * 2.8 + i) * 0.035;
        moonGlow(ctx, p.x, p.y - 10, 53, pulse, (pumpkinVarieties.find((v) => v.price === s.plots[i].price) || pumpkinVarieties[0]).glow);
      }
    const heroBreathe = reduced ? 1 : 1 + Math.sin(time * 1.9) * 0.013, heroTap = time - lastTap < 0.3 && !reduced ? 1 + 0.07 * Math.sin((time - lastTap) / 0.3 * Math.PI) : 1;
    moonGlow(ctx, 177, 377, 94, reduced ? 0.2 : 0.2 + Math.sin(time * 3.2) * 0.035);
    pumpkin(ctx, 177, 377, 1.35 * heroBreathe * heroTap);
    app2.features.shop?.drawMap(ctx, s, time);
    advanceFarmActors(actors, dt, s.paused);
    paintOrder = farmPaintOrder(s.plots, positions, actors, s.visitors, unlocked(s));
    for (const layer of paintOrder) {
      if (layer.kind === "crop") drawCrop(layer.index);
      else if (layer.kind === "actor") drawActor(actors[layer.index]);
      else visitor(ctx, s.visitors[layer.index]);
    }
    if (!s.paused && !reduced) {
      for (let i = 0; i < 17; i++) {
        const x = (i * 131 + Math.sin(time * 0.36 + i) * 22) % 1e3, y = 183 + i * 47 % 325 + Math.sin(time * 0.56 + i * 1.4) * 17, alpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(time * 1.3 + i));
        ellipse(ctx, x, y, 1.2, 1.2, "rgba(255,211,122," + alpha + ")");
        moonGlow(ctx, x, y, 6, alpha * 0.06);
      }
    }
  }
  let mapDrawFailed = false;
  function frame(now) {
    const elapsed = Math.max(0, (now - last) / 1e3), dt = Math.min(0.12, elapsed);
    last = now;
    if (!document.hidden) {
      time += s.paused ? 0 : dt;
      if (!s.paused)
        simulationClock.advance(elapsed, (step) => events(update(s, step)));
      uiTimer += dt;
      saveTimer += dt;
      if (uiTimer > 0.2) {
        renderUI();
        uiTimer = 0;
      }
      if (saveTimer > 5) {
        save();
        saveTimer = 0;
      }
      app2.features.shop?.frame(dt, time);
      if (!document.body.classList.contains("at-home") && !mapDrawFailed) {
        try {
          draw(dt);
        } catch (error) {
          mapDrawFailed = true;
          document.body.classList.add("map-fallback");
          ctx.clearRect(0, 0, W, H);
          console.error("Map animation could not draw:", error);
          $("map-status").hidden = false;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  function startGame() {
    if (started)
      return;
    started = true;
    renderUI();
    save();
    document.body.classList.add("game-ready", "canvas-crops");
    $("game-startup").hidden = true;
    requestAnimationFrame(frame);
  }
  $("retry-map").onclick = () => {
    mapDrawFailed = false;
    document.body.classList.remove("map-fallback");
    nightBedCache = null;
    $("map-status").hidden = true;
  };
  const app2 = {
    get state() {
      return s;
    },
    set state(value) {
      s = value;
    },
    features: {},
    get plotUpgradeMode() {
      return plotUpgradeMode;
    },
    get mapFocus() {
      return mapFocus;
    },
    get dialogueIndex() {
      return dialogueIndex;
    },
    set dialogueIndex(value) {
      dialogueIndex = value;
    },
    get saveAvailable() {
      return saveAvailable;
    },
    get saveReason() {
      return saveReason;
    },
    persistence,
    actions,
    dispatch: actions.execute,
    $,
    gameAsset: asset,
    save,
    tone,
    toast,
    showModal,
    closeModal,
    renderUI,
    replaceGameState,
    fitMap,
    viewMap,
    scrollToSection,
    scrollAcross,
    setPlotUpgradeMode,
    pause,
    say,
    banter,
    portraits,
    addSettingsSection(render) {
      settingsSections.push(render);
    },
    start: startGame,
    clock: simulationClock,
    scene: { ctx, draw, drawBackground, actors, art: { visitors: walkingVisitors, characters: walkingCharacters, characterIdles, pumpkins: pumpkinFrames }, get failed() {
      return mapDrawFailed;
    }, get paintOrder() {
      return paintOrder;
    }, get time() {
      return time;
    }, set time(value) {
      time = value;
    } },
    effects: events
  };
  return app2;
}

export { createGame };
