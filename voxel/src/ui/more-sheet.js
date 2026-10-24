import { premiumIcon } from "./premium-icon-markup.js";
import { claimable, stockCount } from "../model.js";

const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons = {
  wardrobe: icon('<path d="M10 7a2 2 0 1 1 4 0c0 2-2 2-2 4m0 0L3 17v2h18v-2l-9-6Z"/>'),
  journal: icon('<path d="M12 5C8 2 5 3 2 4v16c3-1 6-2 10 1 4-3 7-2 10-1V4c-3-1-6-2-10 1Zm0 0v16"/>'),
  settings: icon('<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="9" cy="5" r="2" fill="var(--panel)"/><circle cx="16" cy="12" r="2" fill="var(--panel)"/><circle cx="7" cy="19" r="2" fill="var(--panel)"/>'),
  patch: icon('<path d="m4 11 8-7 8 7M6 9v11h12V9m-8 11v-6h4v6"/>'),
};

// Less-used systems stay a tap away while the farm remains the main screen.
// The wardrobe has its own place in the dock.
export function moreSheet(ui) {
  return { more: {
    eyebrow: "Make yourself at home", title: "Your patch",
    body() {
      const s = ui.state, ready = claimable(s).length;
      const links = [
        ["journal", "Journal", ready ? `${ready} favour${ready === 1 ? "" : "s"} ready to collect` : "Favours, memories, books & level rewards"],
        ["settings", "Settings", "Sound, graphics, fullscreen & backups"],
        ["patch", "Back to the farm", "Return to the pumpkin patch"],
      ];
      return `<div class="more-summary"><span><b>${stockCount(s).toLocaleString("en-GB")}</b> in stock</span><span><b>${s.sold.toLocaleString("en-GB")}</b> visitors served</span></div><div class="more-links">${links.map(([id, title, detail]) => `<button class="more-link" data-more="${id}"><span class="more-icon">${premiumIcon(id === "patch" ? "farm" : id)}</span><span><b>${title}${id === "journal" && ready ? '<i class="more-dot" aria-label="Rewards ready"></i>' : ""}</b><small>${detail}</small></span><span class="more-chevron" aria-hidden="true">›</span></button>`).join("")}</div><details class="more-help"><summary>Controls & little tips</summary><p>Tap a plot to plant or pick. Tap the glowing pumpkin to help your crops along. Buildings open their own controls.</p><p>Drag to pan the farm. At home, drag to orbit and use two fingers to zoom or pan. Keys: P plant, H harvest, Space boost, Esc close.</p></details>`;
    },
    bind(body) {
      body.querySelectorAll("[data-more]").forEach(button => button.onclick = () => {
        const tab = button.dataset.more;
        if (tab === "patch") { ui.leavePlace(); ui.closeSheet(); ui.scene.fitView(); }
        else ui.openSheet(tab);
      });
    },
  } };
}
