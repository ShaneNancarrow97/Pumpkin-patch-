import { ps5Icon } from "./dualsense-icons.js";
// The same nearby action is named on the touch button, key prompt and pad legend.
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const RESOURCES = {
  logs: ["Softwood logs", "Axe"], stone: ["Stone", "Pickaxe"], herbs: ["Wild herbs", "Hands"],
  fibre: ["Meadow fibre", "Hands"], mushrooms: ["Mushrooms", "Hands"], clay: ["Clay", "Pickaxe"],
};
const ACTIONS = {
  "village-folk": "Talk", "village-node": "Gather", "village-door": "Enter", "village-stall": "Shop",
  "village-noticeboard": "Read", "village-carriage": "Return", "village-page": "Collect",
};
const TARGETS = { "village-noticeboard": "Noticeboard", "village-stall": "Village stall", "village-carriage": "Farm", "village-page": "Letter page" };

// Put a short verb above the complete object name, including older contexts
// which supplied both words as one label. Neither visible nor spoken names lose
// their ending when a story uses a longer title.
function actionWords(context, resource) {
  const label = clean(context?.label), target = clean(context?.target);
  const named = /^(Read|Examine|Inspect|Collect|Gather|Enter|Search|Study|Listen|Light|Open|Solve|Repair|Restore|Visit|Follow|Place|Hang|Mine|Lift|Watch|Join|Secure|Share)\s+(.+)$/i.exec(label);
  if (named) return { action: named[1], target: target || named[2] };
  return { action: label || ACTIONS[context?.type] || "Interact", target: target || resource?.[0] || TARGETS[context?.type] || "" };
}

// A locked game can still use Cross in its menu. A running gather instead names
// its progress and keeps that action unavailable until the tool swing finishes.
export function villageActionPrompt(context, { source = "keyboard", locked = false } = {}) {
  const present = !!context;
  const resource = RESOURCES[context?.material];
  const hasProgress = typeof context?.progress === "number" && Number.isFinite(context.progress);
  const busy = !!context?.gathering || hasProgress;
  const progress = busy ? Math.max(0, Math.min(1, hasProgress ? context.progress : 0)) : null;
  const menu = !busy && (!!context?.menu || locked);
  const words = actionWords(context, resource);
  const action = menu ? "Select" : busy ? "Gathering" : words.action;
  const target = menu ? "" : words.target;
  const tool = menu ? "" : clean(context?.tool ?? resource?.[1]);
  const available = present && context?.available !== false;
  const ready = menu || (available && !busy && !locked);
  const reason = !available && present ? clean(context?.reason) || "Not ready yet" : "";
  const hint = busy ? `${Math.round(progress * 100)}%` : reason || tool;
  return { present, action, target, tool, ready, busy, menu, progress, hint,
    key: source === "pad" ? "cross" : "e",
    accessible: [action, target, hint].filter(Boolean).join(" · "),
  };
}

// Familiar controller silhouettes remain sharp at every TV/UI scale. They are
// decorative; the action's complete accessible name is supplied by its control.
export function villageKeycap(key) {
  const symbols = {cross:"cross",circle:"circle",options:"options",dpad:"dpad",up:"up",ls:"ls",rs:"rs",r2:"r2"};
  if(Object.hasOwn(symbols,key))return `<span class="vg-keycap vg-key-${key}" aria-hidden="true">${ps5Icon(symbols[key],26)}</span>`;
  const label = ({ e: "E", ls: "L", rs: "R", r2: "R2" })[key] ?? "?";
  return `<span class="vg-keycap vg-key-${Object.hasOwn({ e: 1, ls: 1, rs: 1, r2: 1 }, key) ? key : "unknown"}" aria-hidden="true">${label}</span>`;
}
