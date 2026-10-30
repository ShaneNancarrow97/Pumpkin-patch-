// Coverage is an inventory of reviewed source art, not of rendered fallbacks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { costumeCatalog } from '../src/rules/wardrobe.js';
import { PLAYER_DIRECTION_META } from '../src/player-direction-meta.js';
import { DIRECTION_DEGREES, DIRECTIONAL_ACTIONS, compileDirectionalManifest, createDirectionalManifest } from '../src/content/directional-atlas.js';

export function buildDirectionalProductionReport(bank = { looks: {} }) {
  const actionNames = Object.keys(DIRECTIONAL_ACTIONS);
  const looks = costumeCatalog.map(item => {
    const source = bank.looks?.[item.id];
    const compiled = compileDirectionalManifest(source ?? createDirectionalManifest({
      look: item.id, owner: item.character,
      mobility: item.id === 'natalie-wheelchair' ? 'wheelchair' : 'walking',
      sourceSeed: 'not-yet-authored',
    }));
    const actions = Object.fromEntries(actionNames.map(action => {
      const clips = Object.values(compiled.actions[action].directions);
      const degrees = mode => clips.filter(c => (c.mode ?? 'animation') === mode).map(c => c.degree).sort((a, b) => a - b);
      const full = degrees('animation'), pose = degrees('pose'), reduced = degrees('reduced');
      const available = new Set([...full, ...pose, ...reduced]);
      return [action, {
        requiredFramesPerBearing: DIRECTIONAL_ACTIONS[action].frames,
        full, pose, reduced,
        absent: DIRECTION_DEGREES.filter(d => !available.has(d)),
        incomplete: DIRECTION_DEGREES.filter(d => !full.includes(d)),
        authoredFrames: clips.reduce((sum, c) => sum + c.frames.length, 0),
      }];
    }));
    const pages = source?.pages ?? [];
    return {
      id: item.id, owner: item.character, name: item.name,
      mobility: item.id === 'natalie-wheelchair' ? 'wheelchair' : 'walking',
      legacyPlayable: Object.hasOwn(PLAYER_DIRECTION_META, item.id),
      reviewedManifestPresent: !!source,
      validation: compiled.validation,
      ...compiled.coverage,
      encodedBytes: pages.reduce((sum, p) => sum + (Number(p.encodedBytes) || 0), 0),
      pageRGBABytes: pages.reduce((sum, p) => sum + p.width * p.height * 4, 0),
      actions,
    };
  });
  const sum = key => looks.reduce((n, look) => n + look[key], 0);
  const uniquePages = new Map(looks.flatMap(look => (bank.looks?.[look.id]?.pages ?? []).map(p => [p.url, p])));
  return {
    schema: 1,
    convention: '0 front, 90 screen-right, 180 back, 270 screen-left; manually assigned nominal painted bearings, not a measured 3D rig',
    scope: 'Reviewed new art only. Legacy frames, nearest-view fallback, recolours, repeated pixels and mirrored views do not establish new authored coverage.',
    directions: DIRECTION_DEGREES,
    actions: DIRECTIONAL_ACTIONS,
    summary: {
      looks: looks.length,
      owners: Object.fromEntries(['shane', 'natalie'].map(owner => [owner, looks.filter(l => l.owner === owner).length])),
      expectedClips: sum('expectedClips'), expectedFrames: sum('expectedFrames'),
      authoredClips: sum('authoredClips'), authoredPoses: sum('authoredPoses'),
      authoredReducedCycles: sum('authoredReducedCycles'), authoredReducedFrames: sum('authoredReducedFrames'),
      authoredFrames: sum('authoredFrames'),
      incompleteClips: looks.reduce((n, l) => n + l.missing.length, 0),
      completeLooks: looks.filter(l => l.complete).length,
      pageCount: uniquePages.size,
      encodedBytes: [...uniquePages.values()].reduce((n, p) => n + (Number(p.encodedBytes) || 0), 0),
      pageRGBABytes: [...uniquePages.values()].reduce((n, p) => n + p.width * p.height * 4, 0),
      unknownManifestLooks: Object.keys(bank.looks ?? {}).filter(id => !costumeCatalog.some(c => c.id === id)),
    },
    looks,
  };
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const args = process.argv.slice(2), value = flag => { const at = args.indexOf(flag); return at < 0 ? null : args[at + 1]; };
  const defaultManifest = new URL('../assets/directional/manifest.json', import.meta.url);
  const report = buildDirectionalProductionReport(JSON.parse(fs.readFileSync(value('--manifest') ?? defaultManifest, 'utf8')));
  const json = JSON.stringify(report, null, 2) + '\n', out = value('--out');
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, json); }
  if (args.includes('--json')) process.stdout.write(json);
  else {
    console.log('New reviewed directional art — full animation / static pose / reduced four-phase cycle');
    for (const look of report.looks) console.log(`${look.id.padEnd(23)} ${String(look.authoredClips).padStart(3)} full, ${String(look.authoredPoses).padStart(2)} poses, ${String(look.authoredReducedCycles).padStart(2)} reduced; ${look.authoredFrames}/${look.expectedFrames} frames`);
    console.log(`${report.summary.authoredFrames}/${report.summary.expectedFrames} authored frames; ${report.summary.completeLooks}/${report.summary.looks} complete looks.`);
    console.log('A pose or reduced cycle is useful partial art; neither completes its full animation requirement.');
  }
}
