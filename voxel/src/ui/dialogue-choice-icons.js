// Decorative dialogue art reuses the farm and village's installed atlases.
// Keep meaning explicit: the words in a reply never decide its icon or action.
import { villageUIIcon } from "./village-ui-icon-markup.js";

const KINDS = Object.freeze({
  chat: "chat", talk: "chat", reply: "chat",
  warm: "chat", curious: "chat", playful: "chat",
  quest: "quest", gift: "gift", about: "about", info: "about",
  leave: "leave", exit: "leave", continue: "continue",
});

export function dialogueChoiceKind(kind = "chat") {
  return typeof kind === "string" && Object.hasOwn(KINDS, kind) ? KINDS[kind] : "chat";
}

export function dialogueChoiceIcon(kind = "chat", size = 32) {
  const intent = dialogueChoiceKind(kind);
  const requested = Number(size);
  const pixels = Math.round(Math.min(64, Math.max(24, Number.isFinite(requested) ? requested : 32)));
  let art;
  if (intent === "quest" || intent === "about") {
    art = villageUIIcon(intent === "quest" ? "quests" : "people", pixels);
  } else {
    const icon = { chat: "talk", gift: "store", leave: "enter", continue: "back" }[intent];
    const mirror = intent === "continue" ? ";transform:scaleX(-1)" : "";
    art = `<span class="premium-icon" style="background-image:var(--menu-${icon});width:100%;height:100%;inline-size:100%;block-size:100%;flex-basis:auto${mirror}" aria-hidden="true"></span>`;
  }
  // An i, rather than a direct span, leaves the pill's span selector for copy.
  return `<i class="dialogue-choice-icon" data-dialogue-icon="${intent}" style="--dialogue-icon-size:${pixels}px;inline-size:${pixels}px;block-size:${pixels}px;display:inline-grid;place-items:center;flex:none;pointer-events:none" aria-hidden="true">${art}</i>`;
}
