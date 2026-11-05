// Contracts: the neighbours' orders for batches of pumpkins, in a menu of
// their own. Each contract shows who asked, what for, what it pays over the
// stall, how long is left and whether the barn can send it now. Below them,
// the contract board's next tier and how well each neighbour knows the farm.
import * as M from "../model.js";
import { money, plural } from "./kit.js";
import { visitorIdentity } from "../content/visitors.js";

const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function contractsSheet(ui) {
  function card(s, o) {
    const v = M.VARIETIES[o.variety], have = M.available(s, o.variety), ok = M.canFillOrder(s, o), left = M.orderSecondsLeft(s, o), board = M.contractBoard(s);
    const who = M.orderFrom(o), face = ui.portrait("visitor-" + visitorIdentity(o.kind).id), trust = M.orderTrust(s, o.kind);
    const over = Math.round((o.pay / Math.max(1, o.count * v.price) - 1) * 100), urgent = left < 60;
    return `<article class="contract${ok ? " ready" : ""}${urgent ? " urgent" : ""}">
      <span class="contract-face" aria-hidden="true">${face ? `<img src="${face}" alt="">` : ""}</span>
      <div class="contract-main"><h3>${who} <small>${trust.name}</small></h3>
        <p class="contract-ask">${ui.thumb(o.variety)}<b>${o.count} ${v.name}</b><span>${money(o.pay)}${over > 0 ? ` · +${over}% over the stall` : ""}</span></p>
        <div class="contract-time" style="--left:${Math.max(0, Math.min(1, left / board.time))}" aria-hidden="true"><i></i></div>
        <p class="contract-meta"><span>${clock(left)} left</span><span>${ok ? "Ready to send" : `${have} of ${o.count} in the barn`}</span></p></div>
      <button class="button${ok ? " gold" : ""}" data-contract="${o.id}" ${ok ? "" : "disabled"} aria-label="${ok ? `Send ${o.count} ${v.name} to ${who} for ${money(o.pay)}` : `Need ${o.count - have} more ${v.name}`}">${ok ? "Send" : `Need ${o.count - have}`}</button></article>`;
  }

  function board(s) {
    const now = M.contractBoard(s), next = M.nextContractBoard(s), level = M.patchLevel(s).level, tier = s.orders.board ?? 0;
    const pips = M.CONTRACT_BOARD.map((_, i) => `<i class="${i <= tier ? "on" : ""}"></i>`).join("");
    const what = (b) => `${plural(b.open, "contract")} at once · a new one every ${clock(b.gap)} · ${clock(b.time)} to fill${b.pay > 1 ? ` · +${Math.round((b.pay - 1) * 100)}% pay` : ""}`;
    const button = !next ? `<span class="seed-gate done">Every tier</span>` : level < next.level ? `<span class="seed-gate">Level ${next.level}</span>` : `<button class="button purchase-button" data-board ${s.coins < next.cost || s.paused ? "disabled" : ""}>${money(next.cost)}</button>`;
    return `<article class="contract-board"><div><p class="seed-kicker">Your contract board</p><h3>${now.name}</h3><p>${what(now)}</p><div class="tiers contract-pips" aria-label="Tier ${tier + 1} of ${M.CONTRACT_BOARD.length}">${pips}</div>${next ? `<p class="contract-next"><b>Next: ${next.name}</b> · ${what(next)}</p>` : ""}</div>${button}</article>`;
  }

  function neighbours(s) {
    const known = Object.entries(s.orders.trust).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!known.length) return "";
    return `<h3 class="section">Neighbours you supply</h3><div class="contract-friends">${known.map(([k, n]) => {
      const t = M.orderTrust(s, +k), next = M.ORDER_TRUST.find((x) => x.filled > n);
      return `<span><b>${visitorIdentity(+k).name}</b><small>${t.name} · pays ×${t.pay}${next ? ` · ${next.filled - n} more to ${next.name}` : ""}</small></span>`;
    }).join("")}</div>`;
  }

  return {
    contracts: {
      eyebrow: "Neighbours’ orders", title: "Contracts",
      body() {
        const s = ui.state, o = s.orders, level = M.patchLevel(s).level, b = M.contractBoard(s);
        const stats = `<div class="stats contract-stats"><div><b>${o.list.length}/${b.open}</b><span>open now</span></div><div><b>${o.filled}</b><span>sent</span></div><div><b>${money(o.income)}</b><span>earned</span></div><div><b>${o.missed}</b><span>missed</span></div></div>`;
        if (level < M.ORDERS.from) return `<p class="contract-empty">Neighbours start sending contracts at patch level ${M.ORDERS.from}: batches of one variety, paid better than the stall.</p>` + board(s);
        const wait = Math.max(0, Math.ceil(o.next - s.time)), full = o.list.length >= b.open;
        const list = o.list.length ? o.list.map((x) => card(s, x)).join("") : "";
        const coming = full ? `<p class="contract-coming">Every slot is taken. Send one to make room.</p>` : `<p class="contract-coming">${o.list.length ? "Another" : "The next"} contract arrives in <b>${clock(wait)}</b>.</p>`;
        return stats + `<div class="contracts">${list}</div>` + coming + board(s) + neighbours(s) + `<p class="small">Contracts take the oldest pumpkins in the barn first, so they clear what’s about to spoil. A neighbour you supply pays more and asks for more; one you let down asks for less.</p>`;
      },
      bind(body) {
        const s = ui.state;
        body.querySelectorAll("[data-contract]").forEach((b) => (b.onclick = () => ui.sendContract(+b.dataset.contract)));
        body.querySelector("[data-board]")?.addEventListener("click", () => {
          if (!M.upgradeContractBoard(s)) return;
          ui.tone(820); ui.notice(`${M.contractBoard(s).name}: ${plural(M.contractBoard(s).open, "contract")} at once.`); ui.save(); ui.draw();
        });
      },
    },
  };
}
