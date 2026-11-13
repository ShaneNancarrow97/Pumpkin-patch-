// Receipts describe events already awarded by the rules. They never grant them.
import { QUEST_BY_ID } from "../content/village-quests.js";
import { MATERIAL_BY_ID } from "../content/village.js";
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { RECIPE_BY_ID } from "../content/cooking.js";
import { decorById } from "../rules/house.js";
import { costumeById } from "../rules/wardrobe.js";
import { villageItemIcon } from "./village-item-markup.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";
import { expansionRewardMarkup } from "./village-expansion-pages.js";

const money = amount => "£" + Math.floor(amount).toLocaleString("en-GB");
const humanise = id => String(id ?? "Reward").replace(/[-_:]+/g, " ");
const lookup = (table, id) => Object.hasOwn(table, id) ? table[id] : null;

// Use the granted rows, rather than replaying a quest's advertised rewards.
export function villageQuestReceiptData(event) {
  if (event?.type !== "quest-done" || !Object.hasOwn(QUEST_BY_ID, event.quest)) return null;
  const rewards = (Array.isArray(event.rewards) ? event.rewards : []).flatMap(reward => {
    if (!reward || typeof reward !== "object") return [];
    if (reward.kind === "coins") return Number.isFinite(reward.amount) && reward.amount > 0 ? [{ label: `+${money(reward.amount)}`, icon: "" }] : [];
    const table = ({ material: MATERIAL_BY_ID, "village-decor": VILLAGE_DECOR_BY_ID, recipe: RECIPE_BY_ID, decor: decorById, costume: costumeById })[reward.kind];
    if (!table) return [];
    const name = lookup(table, reward.id)?.name ?? humanise(reward.id), amount = Number.isFinite(reward.amount) && reward.amount > 1 ? `${Math.floor(reward.amount)} × ` : "";
    const label = reward.duplicate ? `${name} · converted to bonus coins` : `${amount}${name}${reward.kind === "recipe" ? " recipe" : reward.kind === "costume" ? " costume" : ""}`;
    return [{ label, icon: ["material", "village-decor"].includes(reward.kind) && !reward.duplicate ? reward.id : "" }];
  });
  return { id: event.quest, title: QUEST_BY_ID[event.quest].title, rewards };
}

export function createVillageQuestReceipt({ mount = document.body, onOpenQuests, now = () => performance.now(), duration = 5000 } = {}) {
  const host = document.createElement("aside"); host.id = "village-quest-receipt"; host.hidden = true;
  host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite"); host.setAttribute("aria-atomic", "true");
  host.innerHTML = `<div class="village-receipt-heading"><i class="village-receipt-seal" aria-hidden="true">${villageUIIcon("quests", 36)}<b>✓</b></i><div><small class="village-feedback-kicker">Quest complete</small><h2 class="village-receipt-title"></h2></div><button type="button" class="village-receipt-dismiss" aria-label="Dismiss notification">×</button></div><div class="village-receipt-rewards" aria-label="Rewards received"></div><div class="village-receipt-chapter-rewards" hidden></div><p class="village-receipt-note">Rewards added to your collection.</p><p class="village-receipt-next" hidden><small></small><b></b><span></span></p><button type="button" class="village-receipt-journal" hidden>Open quests</button>`;
  mount.append(host);
  const title = host.querySelector(".village-receipt-title"), rewards = host.querySelector(".village-receipt-rewards"), note = host.querySelector(".village-receipt-note"), journal = host.querySelector(".village-receipt-journal");
  const kicker = host.querySelector(".village-feedback-kicker"), chapterRewards = host.querySelector(".village-receipt-chapter-rewards"), next = host.querySelector(".village-receipt-next");
  const seen = new Set(), queue = []; let current = null, remaining = 0, last = now(), fadeAt = null, blocked = false, disposed = false;
  const life = Math.min(8000, Math.max(3000, Number(duration) || 5000));
  function hide() { host.hidden = true; host.classList.remove("is-leaving"); current = null; fadeAt = null; }
  function show(data) {
    current = data; remaining = data.duration ?? life; fadeAt = null; last = now();
    host.classList.remove("is-leaving"); host.dataset.quest = data.id; host.dataset.kind = data.kind ?? "quest"; title.textContent = data.title; rewards.replaceChildren();
    kicker.textContent = data.kind === "chapter" ? "Chapter complete" : data.kind === "message" ? "Village news" : data.kind === "milestone" ? "Back at the farm" : "Quest complete";
    for (const reward of data.rewards) {
      const chip = document.createElement("span"); chip.className = "village-receipt-chip";
      if (reward.icon) { const art = document.createElement("i"); art.setAttribute("aria-hidden", "true"); art.innerHTML = villageItemIcon(reward.icon); chip.append(art); }
      const label = document.createElement("span"); label.textContent = reward.label; chip.append(label); rewards.append(chip);
    }
    rewards.hidden = !data.rewards.length; rewards.scrollTop = 0;
    chapterRewards.hidden = !data.rewardMarkup; chapterRewards.innerHTML = data.rewardMarkup ?? "";
    note.textContent = data.detail ?? (data.rewards.length ? "Rewards added to your collection." : "Your story journal is up to date."); note.hidden = ["message", "milestone"].includes(data.kind);
    next.hidden = !data.next;
    next.querySelector("small").textContent = data.next?.open ? "Next chapter" : "Coming next";
    next.querySelector("b").textContent = data.next?.title ?? "";
    next.querySelector("span").textContent = data.next?.open ? "" : data.next?.reason ?? "";
    journal.hidden = ["message", "milestone"].includes(data.kind) || typeof onOpenQuests !== "function"; host.hidden = blocked;
  }
  function enqueue(data, key) {
    if (disposed || !data || seen.has(key)) return false;
    const important = data.kind !== "message";
    if (queue.length + (current ? 1 : 0) >= 4) {
      // A friendship update must not consume the chapter's only receipt slot.
      const routine = important ? queue.findLastIndex(row => row.kind === "message") : -1;
      if (routine >= 0) queue.splice(routine, 1);
      else if (important && current?.kind === "message") hide();
      else return false;
    }
    seen.add(key);
    const routine = important ? queue.findIndex(row => row.kind === "message") : -1;
    if (routine >= 0) queue.splice(routine, 0, data); else queue.push(data);
    return true;
  }
  host.querySelector(".village-receipt-dismiss").addEventListener("click", hide);
  journal.addEventListener("click", () => { if (!current || blocked || disposed) return; const id = current.id; hide(); onOpenQuests?.(id); });
  return {
    notify(event) {
      const data = villageQuestReceiptData(event);
      return enqueue(data, `quest:${data?.id}`);
    },
    // Snapshot presentation only: the rule transaction has already settled.
    // Both kinds share one queue and keep their full visible reading time.
    notifyChapter(data) {
      if (!data?.id || !data.title) return false;
      return enqueue({ id: String(data.id), kind: "chapter", title: String(data.title), rewards: [], duration: 9000,
        detail: String(data.change ?? "The village remembers what you did."), rewardMarkup: expansionRewardMarkup(data.rewards ?? []),
        next: data.next ? { title: String(data.next.title ?? ""), open: !!data.next.open, reason: String(data.next.reason ?? "") } : null }, `chapter:${data.id}`);
    },
    notifyMessage(data) {
      if (!data?.id || !data.title) return false;
      return enqueue({ id: String(data.id), kind: data.important ? "milestone" : "message", title: String(data.title), rewards: [], duration: life }, `message:${data.id}`);
    },
    tick({ blocked: suspended = false } = {}) {
      if (disposed) return;
      const at = now(), elapsed = Math.max(0, Math.min(1000, at - last)); last = at; blocked = !!suspended;
      if (blocked) { host.hidden = true; return; }
      if (!current) { if (queue.length) show(queue.shift()); return; }
      host.hidden = false;
      // Do not remove a card while a reader is using its optional controls.
      if (host.matches(":hover") || host.contains(document.activeElement)) { if (fadeAt !== null) { fadeAt = null; host.classList.remove("is-leaving"); } return; }
      if (fadeAt !== null) { if (at - fadeAt >= 220) hide(); return; }
      remaining -= elapsed;
      if (remaining <= 0) { fadeAt = at; host.classList.add("is-leaving"); }
    },
    clear() { queue.length = 0; hide(); last = now(); },
    get active() { return !!current && !blocked; }, get element() { return host; },
    destroy() { queue.length = 0; hide(); disposed = true; host.remove(); },
  };
}
