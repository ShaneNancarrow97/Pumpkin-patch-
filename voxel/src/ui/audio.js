// Music and sound. The main game's own waltz (re-encoded smaller), and its soft
// synthesised tones for planting, picking, sales and purchases. Browsers only
// allow sound after the player has touched the page, so both wait for that.
import waltzUrl from "../../assets/moonlit-waltz.mp3";

export function createAudio(prefs) {
  let ctx = null, music = null, touched = false;
  const ensureMusic = () => {
    if (!music) { music = new Audio(waltzUrl); music.loop = true; }
    music.volume = prefs.musicVolume;
    return music;
  };
  const sync = () => {
    if (!touched) return;
    if (prefs.music) ensureMusic().play().catch(() => {});
    else music?.pause();
  };
  addEventListener("pointerdown", () => { if (!touched) { touched = true; sync(); } }, { capture: true, passive: true });
  return {
    sync,
    // A short falling sine blip, like the main game's tone().
    tone(freq = 520) {
      if (!prefs.sound || !touched) return;
      try {
        ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.15);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.22);
      } catch {}
    },
    setVolume(v) { prefs.musicVolume = v; if (music) music.volume = v; },
  };
}
