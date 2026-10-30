// The new-game introduction: a moonlit title card, then Shane and Natalie take
// turns to explain the patch over the farm itself. It plays once on a new save
// (shouldShowIntro in rules/intro.js) and again from Settings. The farm holds
// still while it plays (hold and release), and Skip, Escape or the last line
// hands it back.
import { INTRO_LINES, INTRO_TITLE } from "../content/intro.js";
import { VARIETIES } from "../model.js";

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rgb = (c) => `${(c >> 16) & 255} ${(c >> 8) & 255} ${c & 255}`;

// A stepped ridge, blocky like the voxel world's skyline, as a clip-path. Its
// rise is in px (turned into a share of the screen's height), so a tall phone
// gets the same gentle hills as a wide screen.
function ridge(seed, base, rise, step) {
  const points = [], share = 100 / Math.max(1, window.innerHeight || 800);
  for (let x = 0; x < 100; x += step) {
    const y = (base - rise * share * (0.6 * Math.sin(x * 0.08 + seed) + 0.4 * Math.sin(x * 0.21 + seed * 3))).toFixed(2);
    points.push(`${x}% ${y}%`, `${Math.min(100, x + step)}% ${y}%`);
  }
  return `polygon(0 100%, ${points.join(", ")}, 100% 100%)`;
}

// The night behind the title, after the farm's own far shore: stars, the
// crescent moon, bats, the far hills with the castle, the village's lights on
// the lake, and a near hill with a row of the game's own glowing pumpkins.
function night(pumpkin) {
  const stars = Array.from({ length: 34 }, (_, i) => `<i style="--x:${((i * 37.3) % 100).toFixed(1)}%;--y:${((i * 53.7) % 58).toFixed(1)}%;--s:${1 + (i % 3) * 0.6}px;--d:${((i * 0.73) % 4).toFixed(2)}s"></i>`).join("");
  const lights = [8, 13, 17, 24, 29, 41, 47, 55, 62, 68, 73, 81, 88, 93].map((x, i) => `<i style="--x:${x}%;--d:${(i * 0.37) % 2.6}s"></i>`).join("");
  const row = [[1, 0.62, 6], [0, 0.78, 2], [0, 1, 0], [2, 0.78, 3], [3, 0.62, 7]];
  const pumpkins = row.map(([v, size, lift], i) => {
    const url = pumpkin(v);
    return `<span class="intro-pumpkin" style="--size:${size};--lift:${lift}px;--glow:${rgb(VARIETIES[v].glow)};--d:${(i * 0.45).toFixed(2)}s">${url ? `<img src="${url}" alt="">` : "<b></b>"}</span>`;
  }).join("");
  return `<div class="intro-night" aria-hidden="true">
    <span class="intro-stars">${stars}</span>
    <i class="intro-moon"></i>
    <i class="intro-bat"></i><i class="intro-bat second"></i>
    <i class="intro-hills far" style="clip-path:${ridge(1.3, 50, 34, 2.5)}"></i>
    <i class="intro-castle"></i>
    <i class="intro-lake"></i>
    <span class="intro-lights">${lights}</span>
    <i class="intro-hills near" style="clip-path:${ridge(4.1, 70, 16, 4)}"></i>
    <span class="intro-pumpkins">${pumpkins}</span>
    <i class="intro-mist"></i>
  </div>`;
}

export function createIntro({ people, portrait, pumpkin, hold, release, onOpen }) {
  const overlay = document.getElementById("intro");
  let step = -1, previousFocus = null, inert = [], timers = [], revealing = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const find = (selector) => overlay.querySelector(selector);

  // A portrait, or a crescent until the sprite sheets have loaded; then it fills
  // itself in, unless someone else is speaking by then.
  function fill(img, who) {
    const url = portrait(who);
    img.dataset.who = who; img.hidden = !url; img.nextElementSibling.hidden = !!url;
    if (url) img.src = url;
    else later(() => { if (step > 0 && img.isConnected && img.dataset.who === who) fill(img, who); }, 300);
  }

  // One line: the speaker's portrait on their side, the words drifting in.
  function speak(line) {
    const talk = find(".intro-talk"), [name, title] = people[line.who];
    talk.dataset.who = line.who;
    talk.classList.remove("in"); void talk.offsetWidth; talk.classList.add("in");
    find(".intro-name").innerHTML = `<b>${escape(name)}</b> <span>${escape(title)}</span>`;
    const words = line.text.split(" ");
    find(".intro-line").innerHTML = words.map((w, i) => `<span style="--i:${i}">${escape(w)}</span>`).join(" ");
    fill(find(".intro-frame img"), line.who);
    const skyla = find(".intro-skyla");
    skyla.hidden = !line.skyla;
    if (line.skyla) fill(skyla.querySelector("img"), "skyla");
    revealing = !reduced();
    if (revealing) later(() => (revealing = false), 350 + words.length * 45);
  }

  function show() {
    overlay.dataset.stage = step ? "talk" : "title";
    find(".intro-dots").querySelectorAll("i").forEach((dot, i) => { dot.classList.toggle("on", i <= step); dot.classList.toggle("now", i === step); });
    find(".intro-progress").textContent = step ? `Line ${step} of ${INTRO_LINES.length}` : "";
    find("[data-intro-next]").textContent = step === 0 ? "Begin" : step === INTRO_LINES.length ? "Start growing" : "Next";
    if (step) speak(INTRO_LINES[step - 1]);
  }

  // Tap, click, Enter or Space: finish the words appearing, or go on.
  function next() {
    if (step < 0 || overlay.dataset.stage === "closing") return;
    if (revealing) { revealing = false; find(".intro-talk").classList.add("shown"); return; }
    if (step >= INTRO_LINES.length) return close(true);
    step++; find(".intro-talk").classList.remove("shown"); show();
  }

  // Skip ends at once; the last line fades out into the farm.
  function close(fade = false) {
    if (step < 0) return;
    const done = () => {
      timers.forEach(clearTimeout); timers = [];
      step = -1; overlay.hidden = true; overlay.innerHTML = ""; delete overlay.dataset.stage;
      for (const [el, was] of inert) el.inert = was;
      inert = [];
      document.body.classList.remove("intro-playing");
      if (!reduced()) { document.body.classList.add("intro-after"); setTimeout(() => document.body.classList.remove("intro-after"), 700); }
      release();
      if (previousFocus?.isConnected && previousFocus !== document.body && !previousFocus.inert) previousFocus.focus({ preventScroll: true });
      else document.activeElement?.blur?.();
    };
    if (fade && !reduced()) { overlay.dataset.stage = "closing"; later(done, 450); } else done();
  }

  function play() {
    if (step >= 0) return;
    onOpen();
    previousFocus = document.activeElement;
    inert = [...document.body.children].filter((el) => el !== overlay && el.tagName !== "SCRIPT").map((el) => [el, el.inert]);
    for (const [el] of inert) el.inert = true;
    document.body.classList.add("intro-playing");
    hold();
    overlay.innerHTML = `${night(pumpkin)}<i class="intro-veil" aria-hidden="true"></i>
      <button class="intro-skip" data-intro-skip aria-label="Skip the introduction">Skip <span aria-hidden="true">›</span></button>
      <header class="intro-card">
        <h1 id="intro-title"><small>${escape(INTRO_TITLE.owners)}</small> <span>${escape(INTRO_TITLE.name)}</span></h1>
        <p class="intro-tagline">${escape(INTRO_TITLE.tagline)}</p>
      </header>
      <div class="intro-talk">
        <span class="intro-frame" aria-hidden="true"><img alt="" hidden><b>☾</b></span>
        <div class="intro-speech" aria-live="polite" aria-atomic="true">
          <span class="intro-skyla" aria-hidden="true" hidden><img alt="" hidden><b hidden></b></span>
          <p class="intro-name"></p><p class="intro-line"></p>
        </div>
      </div>
      <footer class="intro-foot">
        <span class="intro-dots" aria-hidden="true">${"<i></i>".repeat(INTRO_LINES.length + 1)}</span><span class="sr intro-progress"></span>
        <button class="intro-next" data-intro-next data-pad-default>Begin</button>
      </footer>`;
    overlay.hidden = false;
    step = 0; show();
    find("[data-intro-next]").focus({ preventScroll: true });
  }

  overlay.addEventListener("click", (e) => { if (e.target.closest("[data-intro-skip]")) close(); else next(); });
  // Keys go to the introduction first while it plays; buttons keep their own Enter and Space.
  document.addEventListener("keydown", (e) => {
    if (step < 0) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if ((e.key === "Enter" || e.key === " ") && !e.target.closest?.("button")) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) next(); }
    else if (e.key === "Tab") {
      const buttons = [...overlay.querySelectorAll("button")], first = buttons[0], last = buttons.at(-1);
      if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  return {
    get active() { return step >= 0; },
    get step() { return step; },
    play, next, skip: () => close(),
  };
}
