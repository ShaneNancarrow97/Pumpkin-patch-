// TV mode: a phone mirrored to a television and played with a controller from
// the sofa. Everything over the world shrinks to suit a 16:9 screen (--tv-zoom,
// from the screen's height and the chosen size), menus open wider in the
// middle, close buttons grow, and play mode swaps its touch sticks for a slim
// legend of the pad's buttons (ui/tv-mode.css, loaded last).
//
// Cast to TV readies the phone for mirroring: TV mode, fullscreen, landscape
// and the screen kept awake, then the way to the TV for this kind of device.
// A web page can't start Smart View, Cast or AirPlay itself; the phone does.

export const TV_SIZES = [["compact", "Compact", .86], ["standard", "Standard", 1], ["large", "Large", 1.18]];

// The zoom for a screen this many CSS pixels tall: what a 700-pixel-tall
// screen would show (a folded phone at 412 gets .59), and at most .75 (an
// unfolded Fold is about 750 tall, and its menus would otherwise cover most
// of the TV), scaled by the chosen size and never past life size.
//
// A TV's own screen (Samsung DeX, by cable or wirelessly, or a browser on the
// TV) is tall in CSS pixels, about 1080: there everything grows instead, so
// text stands as high on the TV as it does from a mirrored phone (about 1.85%
// of the screen's height), up to 1.6 times.
export function tvZoom(height, size = "standard", width = 0) {
  const k = TV_SIZES.find((s) => s[0] === size)?.[2] ?? 1, h = Number(height) || 700;
  if (bigScreen(width, h)) return Math.round(Math.min(1.6, Math.max(1, h * .0185 / 13)) * k * 1000) / 1000;
  return Math.round(Math.min(1, Math.max(.45, Math.min(.75, h / 700)) * k) * 1000) / 1000;
}
// A screen shaped and sized like a TV's own: landscape, about 16:9, and at
// least 900 CSS pixels tall. A phone's own screen never is.
export function bigScreen(width, height) {
  const w = Number(width) || 0, h = Number(height) || 0, a = w / h;
  return h >= 900 && a > 1.6 && a < 1.95;
}

// How this device puts its screen on a TV, from its user agent.
export function castRoute(ua = "") {
  if (/iPhone|iPad|iPod/i.test(ua)) return "apple";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua)) return /Chrome|Edg\//i.test(ua) ? "chrome" : "mac";
  if (/CrOS|Chrome|Edg\//i.test(ua)) return "chrome";
  return "other";
}

export const CAST_STEPS = {
  android: ["Swipe down from the top of the screen with two fingers.", "Tap <b>Smart View</b> on a Samsung, or <b>Cast</b> or <b>Screen cast</b> on other phones.", "Choose your TV and start mirroring."],
  apple: ["Open Control Centre.", "Tap <b>Screen Mirroring</b>.", "Choose your Apple TV or AirPlay TV."],
  mac: ["Open Control Centre in the menu bar.", "Click <b>Screen Mirroring</b>.", "Choose your Apple TV or AirPlay TV."],
  chrome: ["Open the browser's <b>⋮</b> menu.", "Choose <b>Cast…</b> (under <b>Cast, save and share</b> in newer versions).", "Pick your TV, with <b>Cast tab</b> as the source."],
  other: ["Use your device's screen mirroring: Smart View, Cast, Screen cast or AirPlay.", "Choose your TV.", "Come back here and play."],
};

export function createTvMode({ prefs, savePrefs = () => {}, notice = () => {}, onChange = () => {} }) {
  let wake = null;
  function apply() {
    const on = !!prefs.tvMode;
    document.body.classList.toggle("tv-mode", on);
    onChange(on);
    document.documentElement.style.setProperty("--tv-zoom", on ? String(tvZoom(innerHeight, prefs.tvSize, innerWidth)) : "1");
    // The game opened on a TV's own screen (DeX, the first time): TV mode sizes everything for the sofa.
    if (!on && !prefs.bigScreenHinted && bigScreen(innerWidth, innerHeight) && navigator.maxTouchPoints > 0) {
      prefs.bigScreenHinted = true; savePrefs();
      setTimeout(() => notice("On a TV's own screen? Turn on TV mode in Settings: menus sized for the sofa, and the controller's buttons on screen."), 1500);
    }
  }
  function set(on) { prefs.tvMode = !!on; savePrefs(); apply(); }
  // The screen stays awake while mirroring; the lock lapses when the page is hidden, so take it again on return.
  async function keepAwake() {
    try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener?.("release", () => { wake = null; }); } return !!wake; }
    catch { wake = null; return false; }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && prefs.tvMode && document.fullscreenElement) keepAwake(); });
  addEventListener("resize", apply);
  // A controller joining in landscape, the first time: say where TV mode is.
  addEventListener("gamepadconnected", () => {
    if (prefs.tvMode !== undefined || prefs.tvHinted || innerWidth < innerHeight) return;
    prefs.tvHinted = true; savePrefs();
    notice("Controller connected. Casting to a TV? Turn on TV mode in Settings for smaller menus and no touch sticks.");
  });
  // Everything a page may do towards a TV: TV mode, fullscreen, landscape and an awake screen. Returns what took.
  async function ready() {
    set(true);
    const done = { tv: true, fullscreen: !!document.fullscreenElement, landscape: false, awake: false };
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen({ navigationUI: "hide" }); done.fullscreen = true; } } catch {}
    try { if (document.fullscreenElement && screen.orientation?.lock) { await screen.orientation.lock("landscape"); done.landscape = true; } } catch {}
    done.awake = await keepAwake();
    apply();
    return done;
  }
  apply();
  return { apply, set, ready, keepAwake, get on() { return !!prefs.tvMode; }, zoom: () => (prefs.tvMode ? tvZoom(innerHeight, prefs.tvSize, innerWidth) : 1), route: () => castRoute(navigator.userAgent) };
}
