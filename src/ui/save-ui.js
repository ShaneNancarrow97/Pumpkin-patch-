import { houseLevels } from "../core/house-model.mjs";
import { escapeHtml } from "./html.js";
import { SAVE_KEY, serialize } from "../core/model.mjs";
import { makeBackup, readBackup } from "../core/save-model.mjs";

function initSaveUi(app2) {
  const { $, showModal, replaceGameState, toast, addSettingsSection, scrollToSection } = app2;
  const beforeImportKey = SAVE_KEY + "-before-import";
  let lastImportedFrom = null;
  addSettingsSection(() => {
    const panel = document.createElement("section");
    panel.className = "backup-panel";
    panel.innerHTML = '<div class="modal-subtitle">KEEP WHAT WE GREW</div><h3>Your patch, safely tucked away.</h3><p id="backup-save-status" role="status"></p><p>Download a backup before moving to another browser or replacing the game file. You can bring your house, outfits and harvest with you.</p><div class="backup-actions"><button class="secondary" id="export-save">Download backup</button><button class="secondary" id="choose-save">Load a backup</button></div><input id="import-save" type="file" accept=".json,application/json" hidden><button class="secondary" id="export-retained-save" hidden>Download saved original</button><p id="retained-save-note" hidden>The original browser save is kept separately. Download it before clearing browser data.</p><p id="backup-message" role="status"></p><button class="secondary" id="undo-import" hidden>Undo last import</button>';
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
    refreshSaveDetails();
  });
  function downloadSaveBackup() {
    try {
      const data = makeBackup(app2.state);
      downloadBackupText(data, "pumpkin-patch-backup-");
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
  function previewSaveBackup(text, undo = false) {
    const incoming = readBackup(text);
    const date = new Date(incoming.savedAt).toLocaleDateString("en-GB");
    showModal('<section class="import-preview"><div class="modal-subtitle">' + (undo ? "RETURN TO YOUR PREVIOUS PATCH" : "BRING YOUR PATCH HOME") + "</div><h2>Load this patch?</h2><p>Your current progress will be replaced. " + (undo ? "This returns to the patch you had before importing." : "A copy of your current patch will be kept for Undo last import.") + '</p><div class="backup-summary"><span>Coins<strong>£' + Math.floor(incoming.coins).toLocaleString("en-GB") + "</strong></span><span>Home<strong>" + escapeHtml(houseLevels[incoming.house.level].name) + "</strong></span><span>Collection<strong>" + incoming.house.owned.length + " treasures</strong></span><span>Saved<strong>" + escapeHtml(date) + '</strong></span></div><div class="backup-actions"><button class="secondary" id="cancel-import">Keep current patch</button><button class="primary" id="confirm-import">Load this patch</button></div></section>');
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
  }
  $("save-warning").onclick = () => {
    $("settings").click();
    scrollToSection($("backup-save-status"), "start");
  };
  return { refresh: refreshSaveDetails, preview: previewSaveBackup, download: downloadSaveBackup };
}

export { initSaveUi };
