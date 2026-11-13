// One read-only view of both story engines. Commands and saved progress stay
// with their original rules; following a story never accepts or completes it.
import * as M from "./model.js";
import { QUESTS, QUEST_BY_ID } from "./content/village-quests.js";
import { FOLK_BY_ID } from "./content/village-folk.js";

const short = id => FOLK_BY_ID[id]?.short ?? id;
const open = record => record.status === "active" || record.status === "available";
const legacyQuest = id => typeof id === "string" && Object.hasOwn(QUEST_BY_ID, id) ? QUEST_BY_ID[id] : null;
function legacyReason(state, quest) {
  if (!state.village.invited) return "Follow the invitation to Mothlight first.";
  if (quest.level && M.patchLevel(state).level < quest.level) return `Reach farm level ${quest.level}.`;
  const previous = quest.needs.find(id => !state.village.quests[id]?.done);
  if (previous) return `Finish “${legacyQuest(previous)?.title ?? previous}”.`;
  return `Get to know ${short(quest.giver)} · friendship ${quest.friendship ?? 1}.`;
}
function legacyObjective(state, quest) {
    const saved = state.village.quests[quest.id], status = M.questStatus(state, quest.id), active = status === "active";
    const completed = status === "done" ? quest.steps.length : Math.max(0, Math.min(quest.steps.length, saved?.step ?? 0));
    const reason = status === "locked" ? legacyReason(state, quest) : null;
    return { source: "legacy", id: quest.id, title: quest.title, giver: quest.giver, area: "green", areaName: "Hollow Green", optional: quest.kind === "friendship", status: status === "offered" ? "available" : status,
      description: quest.blurb, task: active ? M.questStepText(state, quest.id) : reason ?? `Talk to ${short(quest.giver)} to begin`, hint: active ? M.questStepHint(state, quest.id) : reason, reason,
      requirements: active ? M.questRequirementRows(state, quest.id) : [], completed, need: quest.steps.length,
      steps: quest.steps.map((step, index) => ({ id: `${quest.id}:${index}`, name: step.text, type: step.kind, area: step.district ?? "green", done: index < completed, current: active && index === completed })), legacy: quest, chapter: null };
}
function chapterObjective(chapter) {
  return { source: "expansion", id: chapter.id, title: chapter.title, giver: chapter.giver ?? chapter.who, area: chapter.area, areaName: chapter.areaName, optional: !!chapter.optional, status: chapter.status,
    description: chapter.description ?? chapter.blurb, task: chapter.next?.name ?? chapter.nextText ?? chapter.reason ?? "Story complete", hint: chapter.next?.reason && chapter.next.reason !== "Ready" ? chapter.next.reason : chapter.next?.look ?? chapter.reason, reason: chapter.reason,
    requirements: (chapter.next?.costRows ?? []).map(row => ({ key: row.id, label: row.name ?? row.id.replaceAll("-", " "), have: row.have, need: row.need, complete: row.have >= row.need })),
    completed: chapter.completed ?? 0, need: chapter.need ?? 1, steps: chapter.steps ?? [], legacy: null, chapter };
}
export function villageObjectives(state, chapters = M.expansionJournal(state)) {
  return [...QUESTS.map(quest => legacyObjective(state, quest)), ...chapters.map(chapterObjective)];
}
// HUD updates resolve only their selected record; the catalogue is for menus.
export function villageObjective(state, id, chapters) {
  const quest = legacyQuest(id);
  if (quest) return legacyObjective(state, quest);
  const chapter = (chapters ?? M.expansionJournal(state)).find(record => record.id === id);
  return chapter ? chapterObjective(chapter) : null;
}
export function selectVillageObjective(records, { preferredId, savedExpansionId, fallbackLegacyId } = {}) {
  const find = id => id && records.find(record => record.id === id && record.status !== "done");
  return find(preferredId) || find(savedExpansionId) || find(fallbackLegacyId) || null;
}
export function residentObjectivePriority(records, who, { preferredId, readyDeliveryId } = {}) {
  const rank = record => record.id === readyDeliveryId ? 0 : record.id === preferredId ? 1 : record.status === "active" ? 2 : 3;
  return records.filter(record => record.giver === who && open(record)).sort((a, b) => rank(a) - rank(b));
}
