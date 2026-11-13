import { fidelityIcon } from './village-fidelity-icon-markup.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PANEL_ART = Object.freeze({map:'map',people:'people',resident:'bond',journal:'journal',materials:'satchel',upgrades:'workshop',stall:'workshop',homes:'build',almanac:'journal','farm-gifts':'satchel',expansion:'compass',navigation:'moth'});

// The frame identifies the current page without adding another navigation row.
export function villagePanelArt(kind) { return fidelityIcon(PANEL_ART[kind] ?? 'moth'); }

// These are the same observed residents and canonical meet action as before.
// A distant portrait guides the player; it never grants a remote conversation.
export function villageNeighbourCards(residents) {
  const met = residents.filter(r => r.bond?.met).length;
  return `<div class="vc-people"><div class="vc-page-intro"><div><p>A village worth knowing.</p></div><span class="vc-count-seal"><b>${met}<small> / ${residents.length}</small></b><span>met</span></span></div><p class="vc-page-note">Talk beside a neighbour, or follow the lanterns to find them.</p><div class="vc-neighbour-list">${residents.map(r => {
    const {id,nearby,distance,person:f,bond,image,offers=[]}=r;
    const label=`${nearby?'Talk to':'Find'} ${f.short??f.name}`;
    const context=[f.role,bond?.met?`Friendship ${bond.level} · ${bond.title}`:"Not yet introduced",r.location,distance!=null?`${Math.round(distance)} metres away`:null].filter(Boolean).join(" · ");
    const progress=Math.max(0,Math.min(1,Number(bond?.progress)||0));
    const status=!r.available?r.reason:offers.length?`${offers.length} new ${offers.length===1?'story':'stories'}`:null;
    return `<button class="vg-neighbour vc-neighbour" data-vg-meet="${esc(id)}" data-pad-label="${esc(label)}" aria-label="${esc(label)} · ${esc(context)}${status?` · ${esc(status)}`:''}"><span class="vc-neighbour-portrait" aria-hidden="true">${image?`<img src="${esc(image)}" alt="">`:fidelityIcon('people')}</span><span class="vc-neighbour-copy"><b>${esc(f.name)}</b><small class="vc-neighbour-role">${esc(f.role)}</small><span class="vc-neighbour-bond">${bond?.met?`Friendship ${bond.level} · ${esc(bond.title)}`:'Not yet introduced'}</span>${bond?.met?`<span class="vc-bond-line" aria-hidden="true"><i style="width:${Math.round(progress*100)}%"></i></span>`:''}<span class="vg-neighbour-place">${esc(r.location)}${distance!=null?` · ${Math.round(distance)} m`:''}</span>${status?`<span class="vc-neighbour-status${r.available&&offers.length?' has-story':''}">${esc(status)}</span>`:''}</span><em>${nearby?'Talk':'Find'}<span aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13 13 3M4 3h9v9"/></svg></span></em></button>`;
  }).join('')}</div></div>`;
}
