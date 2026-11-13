import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/ui/village-conversation.css', import.meta.url), 'utf8');
// Guard the CSS contract behind the measured 1280×720 overflow. These checks
// cover finite tracks/responsive coverage; real DOM bounds remain browser QA.
const grid = /@media\(min-width:601px\),\(orientation:landscape\)\{([\s\S]*?)\n@media/.exec(css)?.[1];

test('all conversation grids bound long replies inside a finite shrinkable row', () => {
  assert.ok(grid, 'the grid contract covers desktop, Fold and landscape');
  const host = /^#village-dialogue\{([^}]+)\}/.exec(grid)?.[1];
  assert.ok(host, 'the height constraint also applies without TV mode');
  const cap = /height:min\((\d+)px,calc\(100dvh \/ var\(--dialogue-zoom\) - (\d+)px\)\)/.exec(host);
  assert.ok(cap, 'a zoom-aware viewport limit gives percentage child bounds a definite height');
  assert.match(host, /grid-template-rows:minmax\(0,1fr\) auto/);
  assert.match(grid, /#village-dialogue\[data-dialogue-state=speaking\]\{height:auto;grid-template-rows:minmax\(0,1fr\)\}/);
  assert.match(grid, /#village-dialogue \.village-dialogue-speech,#village-dialogue \.village-dialogue-response\{min-height:0;max-height:100%\}/);
  assert.match(css, /\.village-dialogue-replies\{[^}]*min-height:0;[^}]*overflow-y:auto/);
  for (const [height, zoom] of [[720, 1], [900, 1], [390, 1], [480, 1], [720, .557], [1080, 1.5]]) {
    const limit = Math.min(Number(cap[1]), height / zoom - Number(cap[2])) * zoom;
    assert.ok(limit > 44 && limit < height - 26 * zoom, `${height}px at ${zoom} keeps room for Back and the lower inset`);
  }
});

test('portrait phones retain their shrinkable stack below the former 501px gap', () => {
  assert.match(css, /@media\(max-width:600px\) and \(orientation:portrait\)\{#village-dialogue\{[^}]*display:flex;flex-direction:column/);
  assert.doesNotMatch(css, /@media\(max-width:600px\) and \(min-height:501px\)/);
  assert.match(css, /\.village-dialogue-speech\{order:1;flex:0 1 210px/);
  assert.match(css, /\.village-dialogue-response\{order:2;flex:1 1 auto/);
  assert.match(css, /\.village-dialogue-back\{order:3;align-self:flex-end\}/);
});
