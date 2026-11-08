// A small, reusable conversation view. The caller owns friendship, quests and
// saving; a reply is accepted once and every line is ordinary readable text.
import { TONES } from "../content/village-folk.js";

export function conversationPages(lines = [], choices = []) {
  const pages = (Array.isArray(lines) ? lines : [lines]).flatMap(line => {
    if (typeof line === "string") return [{ text: line }];
    if (!line || typeof line !== "object") return [];
    if (Array.isArray(line.choices)) return [{ text: typeof line.text === "string" ? line.text : "How will you answer?", choices: line.choices }];
    return typeof line.text === "string" ? [{ text: line.text, who: line.who }] : [];
  });
  if (Array.isArray(choices) && choices.length) pages.push({ text: "How will you answer?", choices });
  return pages.length ? pages : [{ text: "Good evening. It is lovely to see you." }];
}

export function createVillageConversation({ mount = document.body, onChoice = () => {}, onContinue = () => {}, onClose = () => {}, portrait = () => null } = {}) {
  const panel = document.createElement("section"); panel.id = "village-dialogue"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "false"); panel.setAttribute("aria-labelledby", "village-dialogue-name"); panel.tabIndex = -1;
  panel.innerHTML = '<header class="village-dialogue-head"><span class="village-person-art" aria-hidden="true"></span><div class="village-dialogue-person"><h2 id="village-dialogue-name"></h2><p class="village-dialogue-role"></p></div><button class="village-close" data-village-dialogue-close aria-label="Close conversation">×</button></header><div class="village-dialogue-body"><p class="village-dialogue-heading" hidden></p><p class="village-dialogue-line" aria-live="polite"></p><div class="village-dialogue-replies" role="group" aria-label="Your reply"></div><div class="village-dialogue-bond" hidden></div></div><footer class="village-dialogue-footer"><span class="village-dialogue-page"></span><button class="village-dialogue-next" data-village-dialogue-next>Continue</button></footer>';
  mount.append(panel);
  const query = selector => panel.querySelector(selector), next = query("[data-village-dialogue-next]");
  let session = null, pages = [], page = 0, answered = false, showingReply = false, previousFocus = null;
  function close(restoreFocus = true) {
    if (!session) return;
    const id = session.id; session = null; panel.hidden = true;
    document.body.classList.remove("village-conversation-open"); onClose(id);
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
  }
  function updatePerson() {
    const art = query(".village-person-art"), url = portrait(session.id); art.replaceChildren();
    if (url) { const image = document.createElement("img"); image.src = url; image.alt = ""; art.append(image); }
    else art.textContent = session.name?.[0] ?? "M";
    query("h2").textContent = session.name ?? "A neighbour"; query(".village-dialogue-role").textContent = session.role ?? "Mothlight Village";
    const heading = query(".village-dialogue-heading"); heading.hidden = !session.heading; heading.textContent = session.heading ?? "";
    const bond = query(".village-dialogue-bond"), friend = session.friendship; bond.replaceChildren(); bond.hidden = !friend;
    if (friend) { const label = document.createElement("span"), meter = document.createElement("meter"); label.textContent = `Level ${friend.level ?? 0} · ${friend.title ?? "Neighbour"}`; meter.min = 0; meter.max = 1; meter.value = Math.max(0, Math.min(1, Number(friend.progress) || 0)); meter.setAttribute("aria-label", "Friendship progress"); bond.append(label, meter); }
  }
  function render() {
    if (!session) return;
    const current = pages[page], replies = query(".village-dialogue-replies"); replies.replaceChildren();
    query(".village-dialogue-line").textContent = current.text;
    for (const [index, choice] of (current.choices ?? []).entries()) {
      const button = document.createElement("button"); button.className = "village-reply"; button.type = "button"; button.dataset.villageChoice = String(index);
      const tone = document.createElement("small"), words = document.createElement("span"); tone.textContent = TONES[choice.tone] ?? "Reply"; words.textContent = choice.text ?? "Continue"; button.append(tone, words);
      button.addEventListener("click", () => {
        if (!session || answered) return;
        answered = true; const currentSession = session;
        const result = onChoice(index, { id: session.id, page, choice });
        if (result === false) { answered = false; return; }
        if (session !== currentSession || showingReply) return;
        reply(typeof result === "string" ? result : result?.reply ?? choice.reply ?? "Thank you.");
      }); replies.append(button);
    }
    replies.hidden = !current.choices?.length || showingReply;
    next.hidden = !!current.choices?.length && !showingReply;
    next.textContent = page === pages.length - 1 ? "Done" : "Continue";
    query(".village-dialogue-page").textContent = pages.length > 1 ? `${page + 1} / ${pages.length}` : "";
    query(".village-dialogue-body").scrollTop = 0;
  }
  function reply(text) {
    if (!session) return;
    showingReply = true; answered = true;
    query(".village-dialogue-line").textContent = String(text ?? "");
    query(".village-dialogue-replies").hidden = true; next.hidden = false; next.textContent = page === pages.length - 1 ? "Done" : "Continue"; next.focus({ preventScroll: true });
  }
  function advance() {
    if (!session || next.hidden) return;
    if (page < pages.length - 1) { page++; answered = false; showingReply = false; render(); (query(".village-reply") ?? next).focus({ preventScroll: true }); return; }
    const current = session; onContinue({ id: session.id, finished: true });
    if (session === current) close();
  }
  const escape = event => { if (event.key === "Escape" && session) { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
  query("[data-village-dialogue-close]").addEventListener("click", () => close()); next.addEventListener("click", advance); document.addEventListener("keydown", escape, true);
  return {
    open(options) {
      previousFocus = document.activeElement; session = { ...options }; pages = conversationPages(options.lines, options.choices); page = 0; answered = false; showingReply = false;
      updatePerson(); render(); panel.hidden = false; document.body.classList.add("village-conversation-open"); panel.focus({ preventScroll: true });
    },
    reply, close,
    get active() { return !!session; },
    dispose() { close(false); document.removeEventListener("keydown", escape, true); panel.remove(); },
  };
}
