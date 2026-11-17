import { visitorIdentity } from "../content/visitors.js";
import { CHAT_SPOTS } from "../content/festival-meadow.js";
// Overheard: what a group chatting in the meadow is saying (rules/meadow-chat.js).
// Live and non-modal like the guest card: the farm keeps running, new lines
// are read out politely, Escape closes it, and a face opens that guest's card.
export function createChatCard({ state, portrait, onGuest }) {
  const host = document.createElement("aside"); host.className = "chat-card"; host.hidden = true; host.setAttribute("aria-label", "Overheard in the meadow");
  host.innerHTML = `<header><div><b>Overheard</b><small class="chat-where"></small></div><button class="icon-button" aria-label="Close">×</button></header><ul class="chat-faces" aria-label="Who's chatting"></ul><ol class="chat-lines" aria-live="polite"></ol><p class="chat-topics"></p>`;
  document.body.append(host);
  const faces = host.querySelector(".chat-faces"), lines = host.querySelector(".chat-lines"), topics = host.querySelector(".chat-topics"), where = host.querySelector(".chat-where");
  let selected = null, shownFaces = "", shownLines = "", lastAt = -Infinity;
  const clear = () => { selected = null; host.hidden = true; shownFaces = shownLines = ""; };
  host.querySelector("header button").onclick = clear;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && selected) clear(); });
  faces.addEventListener("click", (e) => { const id = Number(e.target.closest("button")?.dataset.guest); if (Number.isInteger(id)) onGuest?.(id); });
  const name = (kind) => visitorIdentity(kind).name;
  return {
    clear, get spot() { return selected; },
    open(spot) { selected = spot; shownFaces = shownLines = ""; host.hidden = false; },
    tick(blocked) {
      if (!selected || blocked) { host.hidden = true; return; }
      host.hidden = false;
      const s = state(), spot = CHAT_SPOTS.find((p) => p.id === selected), group = s.social?.groups?.[selected];
      const members = s.visitors.filter((v) => v.social && !v.social.gone && v.social.spot === selected && v.social.phase !== "leaving").sort((a, b) => a.id - b.id);
      where.textContent = members.length ? `${members.length} chatting ${spot.name}` : `Nobody ${spot.name} now`;
      const faceKey = members.map((v) => v.id + ":" + v.kind + ":" + v.social.phase).join(",");
      if (faceKey !== shownFaces) {
        shownFaces = faceKey;
        faces.innerHTML = members.map((v) => { const face = portrait("visitor-" + visitorIdentity(v.kind).id), away = v.social.phase !== "chatting";
          return `<li><button type="button" data-guest="${v.id}" aria-label="${name(v.kind)}${away ? ", away" : ""}: visitor details" class="${away ? "away" : ""}">${face ? `<img src="${face}" alt="">` : ""}<span>${name(v.kind)}</span></button></li>`; }).join("");
      }
      // New lines are appended, so a screen reader reads each once as it's said.
      const said = group?.lines ?? [], state_ = said.length ? "talk:" + group.id : !members.length ? "gone" : members.length < 2 ? "alone" : "hello";
      const line = (l) => { const li = document.createElement("li"), who = document.createElement("b"); who.textContent = name(l.kind) + ":"; li.append(who, " " + l.text); return li; };
      if (state_ !== shownLines) {
        shownLines = state_; lastAt = said.at(-1)?.at ?? -Infinity;
        if (said.length) lines.replaceChildren(...said.map(line));
        else { const li = document.createElement("li"); li.className = "quiet"; li.textContent = { gone: "They’ve all gone home.", alone: "Waiting for someone to talk to…", hello: "Just saying hello…" }[state_]; lines.replaceChildren(li); }
      } else if (said.length && said.at(-1).at > lastAt) {
        for (const l of said.filter((x) => x.at > lastAt)) lines.append(line(l));
        while (lines.children.length > said.length) lines.firstElementChild.remove();
        lastAt = said.at(-1).at;
      } else return;
      lines.scrollTop = lines.scrollHeight;
      topics.innerHTML = [...new Set(said.map((l) => l.chip).filter(Boolean))].slice(-4).map((chip) => `<span>${chip}</span>`).join("");
    },
  };
}
