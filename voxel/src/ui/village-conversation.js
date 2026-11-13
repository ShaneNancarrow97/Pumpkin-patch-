// A small, reusable conversation view. The caller owns friendship, quests and
// saving; a reply is accepted once and every line is ordinary readable text.
import { TONES, FOLK_BY_ID, HOST_BY_ID } from "../content/village-folk.js";
import { createNarrationControls } from "./narration-controls.js";
import { dialogueChoiceIcon, dialogueChoiceKind } from "./dialogue-choice-icons.js";
import { glyphHTML, padFamily } from "./glyphs.js";

export function conversationPages(lines = [], choices = []) {
  const pages = (Array.isArray(lines) ? lines : [lines]).flatMap(line => {
    if (typeof line === "string") return [{ text: line }];
    if (!line || typeof line !== "object") return [];
    if (Array.isArray(line.choices)) return [{ text: typeof line.text === "string" ? line.text : "How will you answer?", who: line.who, choices: line.choices }];
    return typeof line.text === "string" ? [{ text: line.text, who: line.who }] : [];
  });
  if (Array.isArray(choices) && choices.length) pages.push({ text: "How will you answer?", choices });
  return pages.length ? pages : [{ text: "Good evening. It is lovely to see you." }];
}

export function createVillageConversation({ mount = document.body, onChoice = () => {}, onContinue = () => {}, onClose = () => {}, portrait = () => null, narration, savePrefs = () => {} } = {}) {
  const panel = document.createElement("section"); panel.id = "village-dialogue"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "village-dialogue-name"); panel.setAttribute("aria-describedby", "village-dialogue-line"); panel.tabIndex = -1;
  panel.innerHTML = '<button class="village-close village-dialogue-back" data-village-dialogue-close aria-label="Close conversation"><i class="village-dialogue-back-glyph" aria-hidden="true"></i><span>Back</span></button><div class="village-dialogue-speech"><header class="village-dialogue-head"><span class="village-person-art" aria-hidden="true"></span><div class="village-dialogue-person"><h2 id="village-dialogue-name"></h2><p class="village-dialogue-role"></p></div></header><div class="village-dialogue-body"><p class="village-dialogue-heading" hidden></p><p id="village-dialogue-line" class="village-dialogue-line" aria-live="polite" aria-atomic="true"></p><div class="village-dialogue-bond" hidden></div></div><footer class="village-dialogue-footer"><span class="village-dialogue-page" aria-label="Conversation progress"></span><button class="village-dialogue-next" data-village-dialogue-next data-pad-default><i class="village-dialogue-confirm" aria-hidden="true"></i><span class="village-dialogue-next-label">Continue</span></button></footer></div><div class="village-dialogue-response"><p class="village-dialogue-choice-heading"></p><div class="village-dialogue-replies" role="group" aria-label="Your reply"></div></div>';
  mount.append(panel);
  const query = selector => panel.querySelector(selector), next = query("[data-village-dialogue-next]");
  let session = null, pages = [], page = 0, answered = false, showingReply = false, previousFocus = null, closingOpener = null, speaker = null, currentVoice = null, inputSource = "keyboard", inputMode = "", inputFamily = "";
  const voices = createNarrationControls({ mount: query(".village-dialogue-footer"), narration, savePrefs, line: () => session ? currentVoice : null });
  query(".village-dialogue-footer").append(next);
  // A page change should land on the answer, not leave focus on hidden voice
  // controls. The village controller still owns pad navigation and activation.
  const available = element => {
    if (!element || element.disabled) return false;
    for (let node = element; node; node = node.parentElement) if (node.hidden || node.inert) return false;
    return !element.getClientRects || !!element.getClientRects().length;
  };
  function focusAction() { ([...panel.querySelectorAll(".village-reply")].find(available) ?? (available(next) ? next : query("[data-village-dialogue-close]")))?.focus({ preventScroll: true }); }
  // Village input supplies its current pad, so connecting a controller during
  // a chat does not leave a stale keyboard or another controller's symbols.
  function setInput(source = inputSource, pad) {
    inputSource = source;
    const family = typeof pad === "string" ? pad : padFamily(pad);
    if (family) inputFamily = family;
    const mode = source === "pad" ? /dualsense/i.test(inputFamily) ? "dualsense" : "xbox" : ["touch", "pointer"].includes(source) ? source : "keyboard";
    if (mode === inputMode) return;
    inputMode = mode; panel.dataset.input = mode; drawHints();
  }
  function drawHints() {
    const confirm = inputMode === "keyboard" ? glyphHTML("start", "keyboard") : glyphHTML("confirm", inputMode);
    for (const hint of panel.querySelectorAll(".village-dialogue-confirm")) hint.innerHTML = confirm;
    query(".village-dialogue-back-glyph").innerHTML = glyphHTML("back", inputMode);
  }
  function updateProgress() {
    query(".village-dialogue-next-label").textContent = page === pages.length - 1 ? "Finish chat" : "Continue";
    next.setAttribute("aria-label", page === pages.length - 1 ? "Finish conversation" : "Continue conversation");
    query(".village-dialogue-page").textContent = pages[page].choices?.length && !showingReply ? "Your reply" : pages.length > 1 ? `${page + 1} of ${pages.length}` : "";
  }
  function speak(text) {
    narration?.stop();
    currentVoice = text && text !== "How will you answer?" ? { speaker, text } : null;
    if (currentVoice) narration?.play(speaker, text);
    voices.refresh();
  }
  function close(restoreFocus = true) {
    if (!session) return;
    narration?.stop(); currentVoice = null;
    const id = session.id, opener = previousFocus; session = null; panel.hidden = true;
    document.body.classList.remove("village-conversation-open"); closingOpener = opener;
    try { onClose(id); } finally { closingOpener = null; }
    // A completion callback may already have opened the next conversation.
    if (!session && restoreFocus && opener?.isConnected && available(opener)) opener.focus?.({ preventScroll: true });
  }
  function updatePerson() {
    const narrating = speaker === "narrator"; panel.dataset.dialogueVoice = narrating ? "narrator" : "person";
    const person = narrating ? { name: session.heading ?? "Mothlight", role: "What happens" } : speaker === session.id ? session : FOLK_BY_ID[speaker] ?? HOST_BY_ID[speaker] ?? { name: speaker };
    const art = query(".village-person-art"), url = portrait(speaker); art.replaceChildren();
    if (url) { const image = document.createElement("img"); image.src = url; image.alt = ""; art.append(image); }
    else art.textContent = narrating ? "✦" : person.name?.[0] ?? "M";
    query("h2").textContent = person.name ?? "A neighbour"; query(".village-dialogue-role").textContent = person.role ?? "Mothlight Village";
    const heading = query(".village-dialogue-heading"); heading.hidden = !session.heading; heading.textContent = session.heading ?? "";
    const bond = query(".village-dialogue-bond"), friend = speaker === session.id ? session.friendship : null; bond.replaceChildren(); bond.hidden = !friend;
    if (friend) { const label = document.createElement("span"), meter = document.createElement("meter"); label.textContent = `Level ${friend.level ?? 0} · ${friend.title ?? "Neighbour"}`; meter.min = 0; meter.max = 1; meter.value = Math.max(0, Math.min(1, Number(friend.progress) || 0)); meter.setAttribute("aria-label", "Friendship progress"); bond.append(label, meter); }
  }
  function render() {
    if (!session) return;
    const current = pages[page], replies = query(".village-dialogue-replies"), renderedSession = session, renderedPage = page; replies.replaceChildren();
    panel.dataset.dialogueState = current.choices?.length ? "choice" : "speaking";
    panel.dataset.dialogueIntent = session.intent ?? (session.heading ? "quest" : "chat");
    speaker = current.who ?? speaker ?? session.id; updatePerson();
    query(".village-dialogue-line").textContent = current.text;
    speak(current.text);
    let preferred = false;
    for (const [index, choice] of (current.choices ?? []).entries()) {
      const button = document.createElement("button"); button.className = "village-reply"; button.type = "button"; button.dataset.villageChoice = String(index);
      button.disabled = !!choice.disabled; button.dataset.villageIntent = dialogueChoiceKind(choice.intent ?? choice.tone);
      if (choice.id != null) button.dataset.villageChoiceId = String(choice.id);
      button.dataset.villageTone = Object.hasOwn(TONES, choice.tone) ? choice.tone : "neutral";
      if (!preferred && !button.disabled) { button.setAttribute("data-pad-default", ""); preferred = true; }
      const art = document.createElement("i"), words = document.createElement("span"), label = document.createElement("b"), confirm = document.createElement("i");
      art.className = "village-reply-art"; art.setAttribute("aria-hidden", "true"); art.innerHTML = dialogueChoiceIcon(choice.intent ?? choice.tone, 32);
      words.className = "village-reply-copy"; label.className = "village-reply-label"; label.textContent = choice.text ?? choice.label ?? "Continue"; words.append(label);
      if (Object.hasOwn(TONES, choice.tone)) { const tone = document.createElement("small"); tone.className = "village-reply-tone"; tone.textContent = TONES[choice.tone]; words.append(tone); }
      const hint = choice.description ?? choice.hint ?? choice.requires;
      if (hint) { const note = document.createElement("small"); note.className = "village-reply-note"; note.textContent = String(hint); words.append(note); }
      confirm.className = "village-dialogue-confirm"; confirm.setAttribute("aria-hidden", "true"); button.append(art, words, confirm);
      button.addEventListener("click", () => {
        if (session !== renderedSession || page !== renderedPage || pages[page]?.choices?.[index] !== choice || !button.isConnected || answered || button.disabled) return;
        narration?.stop();
        answered = true; const currentSession = session;
        const result = onChoice(index, { id: session.id, page, choice });
        if (result === false) { answered = false; return; }
        if (session !== currentSession || showingReply || result?.handled) return;
        reply(typeof result === "string" ? result : result?.reply ?? choice.reply ?? "Thank you.", choice.who);
      }); replies.append(button);
    }
    replies.hidden = !current.choices?.length || showingReply;
    query(".village-dialogue-response").hidden = replies.hidden;
    query(".village-dialogue-choice-heading").textContent = session.intent === "greeting" ? "What would you like to do?" : "Choose a reply";
    next.hidden = !!current.choices?.length && !showingReply;
    updateProgress(); drawHints(); replies.scrollTop = 0;
    query(".village-dialogue-body").scrollTop = 0;
  }
  function reply(text, who) {
    if (!session) return;
    speaker = who ?? speaker ?? session.id; updatePerson();
    showingReply = true; answered = true;
    panel.dataset.dialogueState = "speaking";
    query(".village-dialogue-line").textContent = String(text ?? "");
    speak(String(text ?? ""));
    query(".village-dialogue-replies").hidden = true; query(".village-dialogue-response").hidden = true; next.hidden = false; updateProgress(); query(".village-dialogue-body").scrollTop = 0; focusAction();
  }
  function advance() {
    if (!session || next.hidden) return;
    narration?.stop();
    if (page < pages.length - 1) { page++; answered = false; showingReply = false; render(); focusAction(); return; }
    const current = session; onContinue({ id: session.id, finished: true });
    if (session === current) close();
  }
  const escape = event => { if (event.key === "Escape" && session) { event.preventDefault(); event.stopImmediatePropagation(); close(); } };
  // Tab stays in the conversation while its village movement is suspended;
  // Enter/Space retain native button behaviour and never trigger an extra reply.
  const tab = event => {
    if (event.key !== "Tab" || !session) return;
    const choices = [...panel.querySelectorAll("button")].filter(available), first = choices[0], last = choices.at(-1), current = document.activeElement;
    if (!choices.length) { event.preventDefault(); panel.focus({ preventScroll: true }); return; }
    if (!choices.includes(current)) { event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true }); }
    else if (event.shiftKey && current === first) { event.preventDefault(); last.focus({ preventScroll: true }); }
    else if (!event.shiftKey && current === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
  };
  query("[data-village-dialogue-close]").addEventListener("click", () => close()); next.addEventListener("click", advance); document.addEventListener("keydown", escape, true);
  document.addEventListener("keydown", tab, true);
  return {
    open(options) {
      narration?.stop();
      if (closingOpener) previousFocus = closingOpener;
      else if (!session || !panel.contains(document.activeElement)) previousFocus = document.activeElement;
      session = { ...options }; pages = conversationPages(options.lines, options.choices); page = 0; answered = false; showingReply = false;
      speaker = options.id; currentVoice = null; setInput(document.getElementById("village-game")?.dataset.input ?? inputSource, inputFamily || document.body.dataset?.pad); render(); panel.hidden = false; document.body.classList.add("village-conversation-open"); focusAction();
    },
    reply, close, setInput,
    get active() { return !!session; },
    dispose() { close(false); voices.dispose(); document.removeEventListener("keydown", escape, true); document.removeEventListener("keydown", tab, true); panel.remove(); },
  };
}
