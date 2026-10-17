import { escapeHtml } from "./html.js";
import { iconArt } from "./icons.js";

function initMenuUi(app2) {
  const { $, showModal, closeModal, renderUI, setPlotUpgradeMode, viewMap, pause, fitMap, say, banter, portraits, addSettingsSection, toast } = app2;
  const farmUpgradeContainer = $("upgrades");
  function restoreUpgradeMenu() {
    if (farmUpgradeContainer.parentNode !== $("upgrade-home"))
      $("upgrade-home").append(farmUpgradeContainer);
  }
  $("upgrades-nav").onclick = () => {
    showModal('<section class="farm-upgrades-menu"><header class="upgrade-panel-heading"><div><div class="modal-subtitle">GROW OUR LITTLE EMPIRE</div><h2>Patch upgrades</h2></div><div class="upgrade-panel-wallet"><small>Our coins</small><strong id="upgrade-menu-coins"></strong></div></header><nav class="upgrade-sections" aria-label="Upgrade sections"><button class="active" aria-pressed="true" id="menu-farm">' + iconArt("upgrades") + 'Farm</button><button id="menu-crops">' + iconArt("seeds") + 'Crops & seeds</button><button id="menu-shop">' + iconArt("shop") + 'Skyla’s shop</button></nav><div id="upgrade-menu-slot"></div><button class="secondary" id="menu-seeds">Upgrade plots on the map →</button></section>');
    $("upgrade-menu-slot").append(farmUpgradeContainer);
    $("menu-seeds").onclick = () => {
      closeModal();
      if (app2.features.home.active)
        app2.features.home.setMode(false);
      setPlotUpgradeMode(true);
      viewMap(false);
    };
    $("menu-shop").onclick = () => app2.features.shop.open("upgrades");
    $("menu-crops").onclick = () => app2.features.plots.open();
    renderUI();
  };
  function refreshUpgradeMenu() {
    if ($("upgrade-menu-coins"))
      $("upgrade-menu-coins").textContent = "£" + Math.floor(app2.state.coins).toLocaleString("en-GB");
  }
  async function toggleScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      app2.$("settings").click();
      toast("Full-screen is unavailable here. You can keep playing in this window.");
    }
    refreshScreenMode();
  }
  $("fullscreen-shortcut").hidden = typeof document.documentElement.requestFullscreen !== "function";
  $("fullscreen-shortcut").onclick = toggleScreen;
  $("preferences-nav").onclick = () => $("settings").click();
  document.querySelector(".brand").onclick = (event) => {
    event.preventDefault();
    app2.features.home.setMode(false);
  };
  addSettingsSection(() => {
    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = '<span>Take a tea break</span><button class="secondary" id="menu-pause">' + (app2.state.paused ? "Resume game" : "Pause game") + "</button>";
    $("modal-content").append(row);
    $("menu-pause").onclick = () => {
      pause();
      $("menu-pause").textContent = app2.state.paused ? "Resume game" : "Pause game";
    };
    const helpRow = document.createElement("div");
    helpRow.className = "setting-row";
    helpRow.innerHTML = '<span>New to the patch?</span><button class="secondary" id="menu-help">How to play</button>';
    $("modal-content").append(helpRow);
    $("menu-help").onclick = () => $("help").click();
    if (typeof document.documentElement.requestFullscreen === "function") {
      const screenRow = document.createElement("div");
      screenRow.className = "setting-row";
      screenRow.innerHTML = '<span>Screen size</span><button class="secondary" id="screen-mode">' + (document.fullscreenElement ? "Exit full screen" : "Expand screen") + "</button>";
      $("modal-content").append(screenRow);
      $("screen-mode").onclick = toggleScreen;
    }
  });
  function refreshScreenMode() {
    $("fullscreen-shortcut").setAttribute("aria-label", document.fullscreenElement ? "Exit full-screen game" : "Enter full-screen game");
    const button = $("screen-mode");
    if (button)
      button.textContent = document.fullscreenElement ? "Exit full screen" : "Expand screen";
    requestAnimationFrame(() => {
      if (!app2.features.home.active) {
        fitMap();
        viewMap(app2.mapFocus === "home" ? "home" : app2.mapFocus === "shop", false);
      }
    });
  }
  document.addEventListener("fullscreenchange", refreshScreenMode);
  function openConversation() {
    const index = banter[app2.dialogueIndex][0], who = portraits[index];
    showModal('<section class="conversation-menu"><div class="conversation-heading"><span class="portrait ' + (index ? "shane" : "natalie") + '" aria-hidden="true"></span><div><div class="modal-subtitle">A LITTLE TIME TOGETHER</div><h2>' + who[0] + '</h2></div></div><p class="conversation-line">' + escapeHtml($("dialogue-text").textContent) + '</p><button class="primary" id="conversation-next">Keep chatting →</button></section>');
    $("conversation-next").onclick = () => {
      app2.dialogueIndex = (app2.dialogueIndex + 1) % banter.length;
      say(...banter[app2.dialogueIndex]);
      openConversation();
    };
  }
  function markActiveNav(id) {
    for (const button of document.querySelectorAll(".topbar .nav")) {
      const active = button.id === id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }
  markActiveNav("patch-nav");
  return { restoreUpgrades: restoreUpgradeMenu, refreshUpgrades: refreshUpgradeMenu, markActiveNav, openConversation };
}

export { initMenuUi };
