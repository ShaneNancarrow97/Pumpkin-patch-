import { OUTFIT_PRESET_NAMES,outfitPresetsOpen,saveOutfitPreset,wearOutfitPreset } from '../rules/village-outfit-presets.js';
import { costumeById } from '../rules/wardrobe.js';
export function renderOutfitPresets(s){
 if(!outfitPresetsOpen(s))return '';
 return `<details class="service-disclosure"><summary>Mabel’s saved looks <span>Three outfits for two</span></summary><p class="small">Save what you both wear now, then change together in one tap.</p>${OUTFIT_PRESET_NAMES.map((name,i)=>{const pair=s.village.expansion.outfits?.[i];return `<article class="service-upgrade-block"><h3>${name}</h3><p>${pair?`${costumeById[pair.shane].name} · ${costumeById[pair.natalie].name}`:'An empty page in Mabel’s pattern book.'}</p><button class="button" data-save-look-pair="${i}" ${s.paused?'disabled':''}>${pair?'Replace with current looks':'Save current looks'}</button>${pair?`<button class="button gold" data-wear-look-pair="${i}" ${s.paused?'disabled':''}>Wear these looks</button>`:''}</article>`;}).join('')}</details>`;
}
export function bindOutfitPresets(body,ui){
 body.querySelectorAll('[data-save-look-pair]').forEach(b=>b.onclick=()=>{if(saveOutfitPreset(ui.state,Number(b.dataset.saveLookPair))){ui.save();ui.notice('Both looks saved in Mabel’s pattern book.');ui.draw();}});
 body.querySelectorAll('[data-wear-look-pair]').forEach(b=>b.onclick=()=>{if(wearOutfitPreset(ui.state,Number(b.dataset.wearLookPair))){ui.save();ui.scene.refreshLooks();ui.notice('Ready to head out together.');ui.draw();}});
}
