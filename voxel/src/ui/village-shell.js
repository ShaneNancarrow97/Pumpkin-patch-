// Explorer controls share one small dock. The world and the rules stay in the
// caller; opening a drawer only reports that movement should give way to it.
import { FOLK, HOSTS } from "../content/village-folk.js";

const PLACE_NAMES = { green: "Hollow Green", tree: "The Moth Tree", bat: "The Velvet Bat", copse: "Moonroot Copse", quarry: "Lantern Quarry", moor: "Carnival Moor", marsh: "Mirror Marsh", valley: "Mothlight Valley" };
export function createVillageShell({ onMeet = () => {}, onOverlayChange = () => {}, portrait = () => null, available = () => true } = {}) {
  const pairs = [["map", "village-map-toggle"], ["neighbours", "village-neighbours-toggle"], ["more", "village-more-toggle"]];
  const listeners = [], controls = pairs.map(([id, toggle]) => ({ id, panel: document.getElementById("village-" + id), toggle: document.getElementById(toggle) }));
  let open = null, place = "green", room = null;
  const listen = (element, event, fn, options) => { element?.addEventListener(event, fn, options); listeners.push(() => element?.removeEventListener(event, fn, options)); };
  function close(restoreFocus = true) {
    if (!open) return;
    const previous = open; open = null;
    for (const control of controls) { control.panel.hidden = true; control.toggle.setAttribute("aria-expanded", "false"); }
    document.body.classList.remove("village-menu-open"); onOverlayChange(false);
    if (restoreFocus) previous.toggle.focus({ preventScroll: true });
  }
  function show(control) {
    if (open === control) { close(); return; }
    close(false); open = control;
    if (control.id === "neighbours") refresh();
    control.panel.hidden = false; control.toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("village-menu-open"); onOverlayChange(true);
    (control.panel.querySelector('[aria-pressed="true"],button:not(.village-close),summary') ?? control.panel.querySelector("button"))?.focus({ preventScroll: true });
  }
  function refresh() {
    const list = document.getElementById("village-neighbours-list"); if (!list) return;
    list.replaceChildren();
    for (const person of [...FOLK, ...HOSTS].filter(person => available(person.id))) {
      const button = document.createElement("button"); button.className = "village-neighbour"; button.type = "button";
      button.dataset.villageMeet = person.id; button.setAttribute("aria-label", "Talk to " + person.name);
      const art = document.createElement("span"); art.className = "village-person-art"; art.setAttribute("aria-hidden", "true");
      const url = portrait(person.id);
      if (url) { const image = document.createElement("img"); image.src = url; image.alt = ""; art.append(image); }
      else art.textContent = person.short?.[0] ?? person.name[0];
      const copy = document.createElement("span"), name = document.createElement("b"), role = document.createElement("small"), arrow = document.createElement("span");
      name.textContent = person.name; role.textContent = person.role; copy.append(name, role); arrow.textContent = "›"; arrow.setAttribute("aria-hidden", "true");
      button.append(art, copy, arrow); button.addEventListener("click", () => { close(false); onMeet(person.id); }); list.append(button);
    }
    if (!list.childElementCount) { const empty = document.createElement("p"); empty.className = "village-panel-note"; empty.textContent = "Your neighbours will be here when the lanterns are lit."; list.append(empty); }
  }
  for (const control of controls) {
    listen(control.toggle, "click", () => show(control));
    for (const button of control.panel?.querySelectorAll("[data-village-close]") ?? []) listen(button, "click", () => close());
  }
  for (const button of document.querySelectorAll("[data-place]")) listen(button, "click", () => { setPlace(button.dataset.place); close(false); });
  for (const id of ["tour", "walk", "who"]) listen(document.getElementById(id), "click", () => close(false));
  for (const id of ["everyone", "restored"]) listen(document.getElementById(id), "click", () => queueMicrotask(() => {
    const button = document.getElementById(id); button.setAttribute("aria-pressed", String(button.classList.contains("on"))); refresh();
  }));
  listen(document, "pointerdown", event => { if (open && !open.panel.contains(event.target) && !open.toggle.contains(event.target)) close(false); }, true);
  listen(document, "keydown", event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopImmediatePropagation(); close(); } }, true);
  const fullscreen = document.getElementById("village-fullscreen");
  listen(fullscreen, "click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await document.documentElement.requestFullscreen?.();
    } catch { /* A browser may keep its own toolbar; the village still fits it. */ }
  });
  function setPlace(id) {
    place = id; updateLocation();
    for (const button of document.querySelectorAll("[data-place]")) { const on = button.dataset.place === id; button.classList.toggle("on", on); button.setAttribute("aria-pressed", String(on)); }
  }
  function updateLocation() {
    const label = document.getElementById("village-location"), text = room ?? PLACE_NAMES[place] ?? "Mothlight Village";
    if (label && label.textContent !== text) label.textContent = text;
  }
  return { close, refresh, setPlace, setRoom(name) { room = name || null; updateLocation(); }, get blocked() { return !!open; }, dispose() { close(false); listeners.forEach(remove => remove()); } };
}
