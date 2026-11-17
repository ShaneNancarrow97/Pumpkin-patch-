// The village owns travel and input edges; this view only confirms one request.
import { glyphHTML, padFamily } from "./glyphs.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";

export function createVillageReturnPrompt({ mount = document.body, onConfirm = () => {}, onCancel = () => {} } = {}) {
  const host = document.createElement("section"); host.id = "village-return-prompt"; host.hidden = true;
  host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true"); host.setAttribute("aria-labelledby", "village-return-title"); host.setAttribute("aria-describedby", "village-return-copy");
  host.innerHTML = `<div class="village-return-card"><i class="village-return-art" aria-hidden="true">${villageUIIcon("farm", 48)}</i><small class="village-feedback-kicker">The lantern path</small><h2 id="village-return-title">Return to your farm?</h2><p id="village-return-copy">Your village progress is kept. Come back whenever you like.</p><div class="village-return-actions"><button type="button" class="village-return-confirm" data-pad-default data-pad-label="Return to farm"><i class="village-return-confirm-glyph" aria-hidden="true"></i><span>Return to farm</span></button><button type="button" class="village-return-cancel" data-pad-label="Stay in the village"><i class="village-return-cancel-glyph" aria-hidden="true"></i><span>Stay in the village</span></button></div></div>`;
  mount.append(host);
  const confirmButton = host.querySelector(".village-return-confirm"), cancelButton = host.querySelector(".village-return-cancel");
  let session = null, source = "keyboard", family = "", mode = "", disposed = false;
  const available = element => element?.isConnected && !element.disabled && !element.closest?.("[hidden]");
  function setInput(nextSource = source, pad) {
    source = nextSource;
    const nextFamily = typeof pad === "string" ? pad : padFamily(pad); if (nextFamily) family = nextFamily;
    const nextMode = source === "pad" ? /dualsense/i.test(family) ? "dualsense" : "xbox" : ["touch", "pointer"].includes(source) ? source : "keyboard";
    if (nextMode === mode) return;
    mode = nextMode; host.dataset.input = mode;
    host.querySelector(".village-return-confirm-glyph").innerHTML = mode === "keyboard" ? glyphHTML("start", "keyboard") : glyphHTML("confirm", mode);
    host.querySelector(".village-return-cancel-glyph").innerHTML = glyphHTML("back", mode);
  }
  // Closing for scene teardown is silent, unlike the player's explicit Stay.
  function close({ restoreFocus = true } = {}) {
    if (!session) return false;
    const previous = session; session = null; host.hidden = true;
    if (restoreFocus && host.contains(document.activeElement) && available(previous.opener)) previous.opener.focus?.({ preventScroll: true });
    return true;
  }
  function finish(callback) {
    if (!session || disposed) return false;
    const previous = session; close({ restoreFocus: false });
    callback();
    // A callback can open another surface; never steal its new focus.
    if (!session && host.contains(document.activeElement) && available(previous.opener)) previous.opener.focus?.({ preventScroll: true });
    return true;
  }
  const confirm = () => finish(onConfirm), cancel = () => finish(onCancel);
  confirmButton.addEventListener("click", confirm); cancelButton.addEventListener("click", cancel);
  const keydown = event => {
    if (!session) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); cancel(); return; }
    if (event.key !== "Tab") return;
    event.preventDefault(); event.stopImmediatePropagation();
    const choices = [confirmButton, cancelButton], index = choices.indexOf(document.activeElement);
    choices[(index + (event.shiftKey ? -1 : 1) + choices.length) % choices.length].focus({ preventScroll: true });
  };
  const contain = event => event.stopPropagation();
  host.addEventListener("pointerdown", contain); host.addEventListener("click", contain);
  document.addEventListener("keydown", keydown, true); setInput();
  return {
    open(options = {}) {
      if (session || disposed) return false;
      const opener = options.opener ?? document.activeElement;
      session = { opener: host.contains(opener) ? null : opener }; setInput(options.source ?? source, options.pad); host.hidden = false;
      confirmButton.focus({ preventScroll: true }); return true;
    }, close, confirm, cancel, setInput,
    get active() { return !!session; }, get element() { return host; },
    destroy() { close({ restoreFocus: false }); disposed = true; document.removeEventListener("keydown", keydown, true); host.remove(); },
  };
}
