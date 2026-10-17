function initAudioUi(app2) {
  const { $, save, tone } = app2;
  const musicPlayer = $("spooky-track");
  let musicUnlocked = false, musicPending = false;
  const musicSupported = typeof musicPlayer?.play === "function";
  function refreshMusicUI() {
    const playing = musicSupported && !musicPlayer.paused && app2.state.music && !app2.state.paused && !document.hidden;
    const button = $("sound");
    button.setAttribute("aria-pressed", String(playing));
    button.setAttribute("aria-label", playing ? "Mute spooky music" : "Play spooky music");
    button.title = playing ? "Moonlit Waltz · tap to mute" : "Spooky music · tap to play";
    button.classList.toggle("music-playing", playing);
    button.style.color = playing ? "#ffd18c" : "#b6a5ae";
  }
  function syncMusic() {
    if (!musicSupported)
      return;
    musicPlayer.volume = app2.state.musicVolume;
    if (!app2.state.music || app2.state.paused || document.hidden || !musicUnlocked) {
      if (!musicPlayer.paused)
        musicPlayer.pause();
      refreshMusicUI();
      return;
    }
    if (!musicPlayer.paused || musicPending)
      return;
    musicPending = true;
    try {
      const result = musicPlayer.play();
      Promise.resolve(result).then(() => {
        musicPending = false;
        refreshMusicUI();
      }, () => {
        musicPending = false;
        musicUnlocked = false;
        refreshMusicUI();
      });
    } catch {
      musicPending = false;
      musicUnlocked = false;
      refreshMusicUI();
    }
  }
  function setMusicEnabled(enabled) {
    app2.actions.preference("music", enabled);
    musicUnlocked = true;
    syncMusic();
    save();
    refreshAudioSettings();
  }
  function musicGesture(event) {
    if (event.target === $("sound") || event.target?.closest?.("#sound"))
      return;
    if (!musicUnlocked) {
      musicUnlocked = true;
      syncMusic();
    }
  }
  document.addEventListener("pointerdown", musicGesture, { passive: true });
  document.addEventListener("keydown", musicGesture);
  document.addEventListener("visibilitychange", syncMusic);
  window.addEventListener("pagehide", () => {
    if (musicSupported)
      musicPlayer.pause();
  });
  musicPlayer.addEventListener("play", refreshMusicUI);
  musicPlayer.addEventListener("pause", refreshMusicUI);
  $("sound").onclick = () => setMusicEnabled(!musicUnlocked && app2.state.music ? true : !app2.state.music);
  function refreshAudioSettings() {
    const music = $("setting-music"), effects = $("setting-sound"), volume = $("music-volume");
    if (music) {
      music.textContent = app2.state.music ? "On" : "Off";
      music.setAttribute("aria-pressed", String(app2.state.music));
    }
    if (effects) {
      effects.textContent = app2.state.sound ? "On" : "Off";
      effects.setAttribute("aria-pressed", String(app2.state.sound));
    }
    if (volume) {
      volume.value = Math.round(app2.state.musicVolume * 100);
      $("music-volume-value").textContent = Math.round(app2.state.musicVolume * 100) + "%";
    }
  }
  function bindAudioSettings() {
    $("setting-music").onclick = () => setMusicEnabled(!app2.state.music);
    $("setting-sound").onclick = () => {
      app2.actions.preference("sound", !app2.state.sound);
      tone();
      save();
      refreshAudioSettings();
    };
    $("music-volume").oninput = (event) => {
      app2.actions.preference("musicVolume", Math.max(0, Math.min(1, Number(event.target.value) / 100)));
      musicUnlocked = true;
      syncMusic();
      save();
      refreshAudioSettings();
    };
    refreshAudioSettings();
  }
  return { sync: syncMusic, refresh: refreshMusicUI, bindSettings: bindAudioSettings };
}

export { initAudioUi };
