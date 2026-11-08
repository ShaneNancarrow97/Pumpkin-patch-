import { ps5Icon } from "./dualsense-icons.js";
// The same nearby action is named on the touch button, key prompt and pad legend.
const clean = (value, limit = 64) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
const RESOURCES = {
  logs: ["Softwood logs", "Axe"], stone: ["Stone", "Pickaxe"], herbs: ["Wild herbs", "Hands"],
  fibre: ["Meadow fibre", "Hands"], mushrooms: ["Mushrooms", "Hands"], clay: ["Clay", "Pickaxe"],
};
const ACTIONS = {
  "village-folk": "Talk", "village-node": "Gather", "village-door": "Enter", "village-stall": "Shop",
  "village-noticeboard": "Quests", "village-carriage": "Return", "village-page": "Collect",
};

// A locked game can still use Cross in its menu. A running gather instead names
// its progress and keeps that action unavailable until the tool swing finishes.
export function villageActionPrompt(context, { source = "keyboard", locked = false } = {}) {
  const present = !!context;
  const resource = RESOURCES[context?.material];
  const hasProgress = typeof context?.progress === "number" && Number.isFinite(context.progress);
  const busy = !!context?.gathering || hasProgress;
  const progress = busy ? Math.max(0, Math.min(1, hasProgress ? context.progress : 0)) : null;
  const menu = !busy && (!!context?.menu || locked);
  const action = menu ? "Select" : busy ? "Gathering" : clean(context?.label, 28) || ACTIONS[context?.type] || "Interact";
  const target = menu ? "" : clean(context?.target ?? resource?.[0]);
  const tool = menu ? "" : clean(context?.tool ?? resource?.[1], 28);
  const available = present && context?.available !== false;
  const ready = menu || (available && !busy && !locked);
  const reason = !available && present ? clean(context?.reason, 100) || "Not ready yet" : "";
  const hint = busy ? `${Math.round(progress * 100)}%` : reason || tool;
  return { present, action, target, tool, ready, busy, menu, progress, hint,
    key: source === "pad" ? "cross" : "e",
    accessible: [action, target, hint].filter(Boolean).join(" · "),
  };
}

// Familiar controller silhouettes remain sharp at every TV/UI scale. They are
// decorative; the action's complete accessible name is supplied by its control.
export function villageKeycap(key) {
  const symbols = {cross:"cross",circle:"circle",options:"options",up:"up",ls:"ls",rs:"rs",r2:"r2"};
  if(Object.hasOwn(symbols,key))return `<span class="vg-keycap vg-key-${key}" aria-hidden="true">${ps5Icon(symbols[key],26)}</span>`;
  const label = ({ e: "E", ls: "L", rs: "R", r2: "R2" })[key] ?? "?";
  return `<span class="vg-keycap vg-key-${Object.hasOwn({ e: 1, ls: 1, rs: 1, r2: 1 }, key) ? key : "unknown"}" aria-hidden="true">${label}</span>`;
}
