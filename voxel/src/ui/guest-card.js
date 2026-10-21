import { visitorIdentity } from "../content/visitors.js";
import { guestHeading } from "../rules/guest-needs.js";
// A live, non-modal inspector; the farm keeps running and the visitor keeps walking.
export function createGuestCard({ state, portrait }) {
  const host = document.createElement("aside"); host.className = "guest-card"; host.hidden = true; host.setAttribute("aria-label", "Visitor details"); document.body.append(host);
  host.innerHTML = `<header><span class="guest-face"></span><div><b class="guest-name"></b><small class="guest-heading"></small></div><button class="icon-button" aria-label="Close visitor details">×</button></header><div class="guest-needs">${[["thirst", "Thirst"], ["hunger", "Hunger"], ["happiness", "Happiness"]].map(([id, name]) => `<label>${name}<meter data-need="${id}" min="0" max="100"></meter><b data-value="${id}"></b></label>`).join("")}</div><footer><span>Money left <b class="guest-money"></b></span><span class="guest-spent"></span></footer>`;
  let selected = null, lastFace = "";
  const clear = () => { selected = null; host.hidden = true; };
  host.querySelector("button").onclick = clear;
  return { clear, open(id, indoor = false) { selected = { id, indoor }; host.hidden = false; }, tick(blocked) {
    if (!selected || blocked) { host.hidden = true; return; }
    const s = state(), guest = (selected.indoor ? s.shop.customers : s.visitors).find(v => v.id === selected.id);
    if (!guest) { selected = null; host.hidden = true; return; }
    host.hidden = false;
    host.querySelector(".guest-name").textContent = visitorIdentity(guest.kind).name + " · " + (guest.id + 1);
    const mood = guest.needs?.happiness ?? 70;
    host.querySelector(".guest-heading").textContent = (mood >= 80 ? "Delighted" : mood >= 60 ? "Content" : mood >= 40 ? "Restless" : "Unhappy") + " · " + guestHeading(guest, selected.indoor);
    const face = portrait("visitor-" + visitorIdentity(guest.kind).id);
    if (face !== lastFace) { lastFace = face; host.querySelector(".guest-face").innerHTML = face ? `<img src="${face}" alt="">` : ""; }
    for (const key of ["thirst", "hunger", "happiness"]) { const n = Math.round(guest.needs?.[key] ?? 70); host.querySelector(`[data-need="${key}"]`).value = n; host.querySelector(`[data-value="${key}"]`).textContent = n + "%"; }
    host.querySelector(".guest-money").textContent = "£" + Math.floor(guest.budget);
    const spent = (guest.originalBudget ?? guest.budget) - guest.budget;
    host.querySelector(".guest-spent").textContent = spent > 0 ? "Spent £" + Math.floor(spent) : "Just arrived";
  } };
}
