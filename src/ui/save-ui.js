import { houseLevels } from "../core/house-model.mjs";
import { escapeHtml } from "./html.js";
import { SAVE_KEY, serialize } from "../core/model.mjs";
import { makeBackup, readBackupWithRepairs } from "../core/save-model.mjs";
import { SAVE_SCHEMA } from "../core/save-repair.mjs";
import { GAME_VERSION } from "../platform/version.js";

function initSaveUi(app2) {
  const { $, showModal, replaceGameState, toast, addSettingsSection, scrollToSection } = app2;
  const beforeImportKey = SAVE_KEY + "-before-import";
  let lastImportedFrom = null, reminder = false;
  addSettingsSection(() => {
    if (reminder) {
      reminder = false;
      app2.save();
    }
    const panel = document.createElement("section");
    panel.className = "backup-panel";
    panel.innerHTML = '<div class="modal-subtitle">KEEP WHAT WE GREW</div><h3>Your patch, safely tucked away.</h3><p id="backup-save-status" role="status"></p><p id="save-repair-note" class="save-repair-note" hidden></p><p id="last-backup-note"></p><p>Download a backup before moving to another browser or replacing the game file. You can bring your house, outfits and harvest with you.</p><div class="backup-actions"><button class="secondary" id="export-save">Download backup</button><button class="secondary" id="choose-save">Load a backup</button></div><input id="import-save" type="file" accept=".json,application/json" hidden><button class="secondary" id="export-retained-save" hidden>Download saved original</button><p id="retained-save-note" hidden>The original browser save is kept separately. Download it before clearing browser data.</p><p id="backup-message" role="status"></p><button class="secondary" id="undo-import" hidden>Undo last import</button><div id="snapshot-list" class="snapshot-list" hidden><h4>Earlier copies</h4><p>Kept automatically on this device, at least ten minutes apart.</p><div id="snapshot-buttons" class="backup-actions"></div></div><p class="game-version" id="game-version"></p>';
    $("modal-content").append(panel);
    $("export-save").onclick = downloadSaveBackup;
    $("export-retained-save").onclick = () => {
      const raw = app2.persistence.retainedSave;
      if (raw)
        downloadBackupText(raw, "pumpkin-patch-saved-original-");
    };
    $("choose-save").onclick = () => $("import-save").click();
    $("import-save").onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file)
        return;
      const message = $("backup-message");
      message.textContent = "Opening your backup…";
      try {
        if (file.size > 8e6)
          throw new Error("Choose a Pumpkin Patch backup smaller than 8 MB.");
        const text = typeof file.text === "function" ? await file.text() : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("This file could not be read."));
          reader.readAsText(file);
        });
        if ($("backup-message") !== message)
          return;
        previewSaveBackup(text);
      } catch (error) {
        if ($("backup-message") === message)
          message.textContent = error.message;
      } finally {
        event.target.value = "";
      }
    };
    let previous = lastImportedFrom;
    try {
      previous || (previous = localStorage.getItem(beforeImportKey));
    } catch {
    }
    if (previous) {
      $("undo-import").hidden = false;
      $("undo-import").onclick = () => {
        try {
          previewSaveBackup(previous, true);
        } catch (error) {
          $("backup-message").textContent = error.message;
        }
      };
    }
    const snapshots = app2.persistence.snapshots;
    if (snapshots.length) {
      $("snapshot-list").hidden = false;
      for (const snap of snapshots) {
        const button = document.createElement("button");
        button.className = "secondary";
        button.textContent = "Restore " + describeTime(snap.at);
        button.onclick = () => {
          try {
            previewSaveBackup(snap.raw, false, "RETURN TO AN EARLIER COPY");
          } catch (error) {
            $("backup-message").textContent = error.message;
          }
        };
        $("snapshot-buttons").append(button);
      }
    }
    $("game-version").textContent = "Pumpkin Patch " + GAME_VERSION + " · save format " + SAVE_SCHEMA;
    refreshSaveDetails();
  });
  function describeTime(at) {
    const minutes = Math.max(0, Math.round((Date.now() - at) / 6e4));
    if (minutes < 60) return minutes <= 1 ? "a minute ago" : minutes + " minutes ago";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours === 1 ? "an hour ago" : hours + " hours ago";
    return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function repairText(repairs) {
    return repairs.length ? repairs.join(", ").replace(/, ([^,]*)$/, " and $1") : "";
  }
  function downloadSaveBackup() {
    try {
      const data = makeBackup(app2.state, GAME_VERSION);
      downloadBackupText(data, "pumpkin-patch-backup-");
      app2.persistence.markBackup();
      reminder = false;
      refreshSaveDetails();
    } catch {
      if ($("backup-message"))
        $("backup-message").textContent = "The backup could not be prepared.";
    }
  }
  function downloadBackupText(data, prefix) {
    try {
      const blob = new Blob([data], { type: "application/json" }), url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = prefix + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3e4);
      if ($("backup-message"))
        $("backup-message").textContent = "Backup prepared. Keep the downloaded JSON file with your game.";
    } catch {
      if ($("backup-message"))
        $("backup-message").textContent = "The backup download could not start. Try opening the game directly in Safari or Chrome.";
    }
  }
  function previewSaveBackup(text, undo = false, heading = null) {
    const { state: incoming, repairs } = readBackupWithRepairs(text);
    const date = new Date(incoming.savedAt).toLocaleDateString("en-GB");
    showModal('<section class="import-preview"><div class="modal-subtitle">' + (heading || (undo ? "RETURN TO YOUR PREVIOUS PATCH" : "BRING YOUR PATCH HOME")) + "</div><h2>Load this patch?</h2><p>Your current progress will be replaced. " + (undo ? "This returns to the patch you had before importing." : "A copy of your current patch will be kept for Undo last import.") + "</p>" + (repairs.length ? '<p class="save-repair-note">Part of this file was damaged. These will start fresh: ' + escapeHtml(repairText(repairs)) + ". Everything else comes back as it was.</p>" : "") + '<div class="backup-summary"><span>Coins<strong>£' + Math.floor(incoming.coins).toLocaleString("en-GB") + "</strong></span><span>Home<strong>" + escapeHtml(houseLevels[incoming.house.level].name) + "</strong></span><span>Collection<strong>" + incoming.house.owned.length + " treasures</strong></span><span>Saved<strong>" + escapeHtml(date) + '</strong></span></div><div class="backup-actions"><button class="secondary" id="cancel-import">Keep current patch</button><button class="primary" id="confirm-import">Load this patch</button></div></section>');
    $("cancel-import").onclick = () => $("settings").click();
    $("confirm-import").onclick = () => {
      const previous = serialize(app2.state);
      lastImportedFrom = previous;
      try {
        localStorage.setItem(beforeImportKey, previous);
      } catch {
      }
      replaceGameState(incoming);
      toast("Welcome home. Your patch has been restored.");
    };
  }
  function refreshSaveDetails() {
    const status = $("backup-save-status");
    const retained = !!app2.persistence.retainedSave;
    if ($("export-retained-save"))
      $("export-retained-save").hidden = !retained;
    if ($("retained-save-note"))
      $("retained-save-note").hidden = !retained;
    if (status)
      status.textContent = app2.saveAvailable ? "✓ Saved in this browser. A backup lets you move it elsewhere." : app2.saveReason;
    const repairs = app2.persistence.repairs;
    if ($("save-repair-note")) {
      $("save-repair-note").hidden = !repairs.length;
      $("save-repair-note").textContent = repairs.length ? "Part of your stored save was damaged, so these started fresh: " + repairText(repairs) + ". The damaged original is kept: use Download saved original." : "";
    }
    if ($("last-backup-note")) {
      const at = app2.persistence.lastBackup;
      $("last-backup-note").textContent = at ? "Last backup downloaded " + describeTime(at) + "." : "No backup downloaded from this device yet.";
    }
  }
  $("save-warning").onclick = () => {
    $("settings").click();
    scrollToSection($("backup-save-status"), "start");
  };
  // A mended save gets one clear notice; an overdue backup gets a gentle dot on Settings.
  setTimeout(() => {
    const p = app2.persistence;
    if (p.repairs.length) {
      if ($("modal").open)
        return;
      showModal('<section class="repair-notice"><div class="modal-subtitle">A LITTLE MENDING</div><h2>We patched up your save.</h2><p class="save-repair-note">Part of your stored save was damaged, so these started fresh: ' + escapeHtml(repairText(p.repairs)) + '.</p><p>Everything else is just as you left it. The damaged original is kept in Settings if you want to download it.</p><div class="backup-actions"><button class="secondary" id="repair-settings">Open Settings</button><button class="primary" id="repair-continue">Keep playing</button></div></section>');
      $("repair-settings").onclick = () => $("settings").click();
      $("repair-continue").onclick = () => app2.closeModal();
      return;
    }
    const last = p.lastBackup;
    if (app2.saveAvailable && app2.state.earned >= 1e3 && (!last || Date.now() - last > 7 * 864e5)) {
      reminder = true;
      app2.save();
    }
  }, 1500);
  return {
    refresh: refreshSaveDetails,
    preview: previewSaveBackup,
    download: downloadSaveBackup,
    get reminder() {
      return reminder;
    }
  };
}

export { initSaveUi };
