// Pinned Three r169 emits allocation IDs in buffer type AND variable names.
// Stage caches key on exact WGSL, although WebGPU binds resources numerically.
// This deliberately narrow lexer recognizes only that generated declaration
// pair. Any ambiguity leaves the whole shader unchanged. It never changes the
// host Binding objects, numeric ABI, layouts, array sizes or field names.
export const VILLAGE_WGSL_CACHE_REVISION = '169';
const STRUCT = /^NodeBuffer_(\d+)Struct$/;
const VARIABLE = /^NodeBuffer_(\d+)$/;
const CANONICAL = index => `VillageNodeBuffer_${index}`;

function tokensOf(source) {
  const tokens = [];
  for (let at = 0; at < source.length;) {
    const ch = source[at], start = at;
    if (ch.charCodeAt(0) > 127) return null;
    if (/\s/.test(ch)) { at++; continue; }
    if (source.startsWith('//', at)) {
      at += 2;
      while (at < source.length && source[at] !== '\n' && source[at] !== '\r') {
        if (['\u0085', '\u2028', '\u2029'].includes(source[at])) return null;
        at++;
      }
      continue;
    }
    if (source.startsWith('/*', at)) {
      let depth = 1; at += 2;
      while (at < source.length && depth) {
        if (source.startsWith('/*', at)) { depth++; at += 2; }
        else if (source.startsWith('*/', at)) { depth--; at += 2; }
        else at++;
      }
      if (depth) return null;
      continue;
    }
    // WGSL has no general string expressions. Treat quoted text as opaque so
    // diagnostic extensions or malformed/untrusted text are never rewritten.
    if (ch === '"' || ch === "'") {
      at++; let closed = false;
      while (at < source.length) {
        if (source[at] === '\\') { at += 2; continue; }
        if (source[at++] === ch) { closed = true; break; }
      }
      if (!closed) return null;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      at++; while (at < source.length && /[A-Za-z_0-9]/.test(source[at])) at++;
      tokens.push({ value: source.slice(start, at), start, end: at, kind: 'identifier' }); continue;
    }
    if (/[0-9]/.test(ch)) {
      const number = source.slice(at).match(/^(?:0[xX][\da-fA-F]+|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)[ifu]?/)[0];
      at += number.length; tokens.push({ value: number, start, end: at, kind: 'number' }); continue;
    }
    at++; tokens.push({ value: ch, start, end: at, kind: 'punctuation' });
  }
  return tokens;
}

function attributeTokens(tokens) {
  const result = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== '@' || tokens[i + 1]?.kind !== 'identifier') continue;
    let end = i + 1;
    if (tokens[i + 2]?.value === '(') {
      let depth = 1; end = i + 3;
      while (end < tokens.length && depth) {
        if (tokens[end].value === '(') depth++;
        if (tokens[end].value === ')') depth--;
        end++;
      }
      if (depth) return null;
      end--;
    }
    for (let j = i; j <= end; j++) result.add(j);
    i = end;
  }
  return result;
}

function declarationPair(tokens, at) {
  const typeIndex = at + 1, match = STRUCT.exec(tokens[typeIndex]?.value ?? '');
  if (!match || tokens[at + 2]?.value !== '{') return null;
  const variable = `NodeBuffer_${match[1]}`, member = tokens[at + 3];
  if (member?.kind !== 'identifier' || tokens[at + 4]?.value !== ':' || tokens[at + 5]?.value !== 'array' || tokens[at + 6]?.value !== '<') return null;
  let cursor = at + 7, angle = 1;
  while (cursor < tokens.length && angle) {
    const value = tokens[cursor].value;
    if (value === '<') angle++;
    else if (value === '>') angle--;
    else if (['{', '}', ';', '@'].includes(value)) return null;
    cursor++;
  }
  if (angle) return null;
  if (tokens[cursor]?.value === ',') cursor++;
  if (tokens[cursor++]?.value !== '}' || tokens[cursor++]?.value !== ';') return null;
  // Exact r169 order: @binding(n) @group(n) var<access> Name : NameStruct;
  for (const attribute of ['binding', 'group']) {
    if (tokens[cursor++]?.value !== '@' || tokens[cursor++]?.value !== attribute || tokens[cursor++]?.value !== '(' || !/^\d+$/.test(tokens[cursor++]?.value ?? '') || tokens[cursor++]?.value !== ')') return null;
  }
  if (tokens[cursor++]?.value !== 'var' || tokens[cursor++]?.value !== '<') return null;
  const access = [];
  while (cursor < tokens.length && tokens[cursor].value !== '>') access.push(tokens[cursor++].value);
  if (!['uniform', 'storage,read', 'storage,read_write'].includes(access.join('')) || tokens[cursor++]?.value !== '>') return null;
  const variableIndex = cursor++, referenceTypeIndex = cursor + 1;
  if (tokens[variableIndex]?.value !== variable || tokens[cursor++]?.value !== ':' || tokens[cursor++]?.value !== tokens[typeIndex].value || tokens[cursor]?.value !== ';') return null;
  return { type: tokens[typeIndex].value, variable, member: member.value, typeIndex, variableIndex, referenceTypeIndex };
}

export function canonicalizeVillageWgsl(source, revision = VILLAGE_WGSL_CACHE_REVISION) {
  if (typeof source !== 'string') throw new TypeError('Village WGSL cache expects shader source text.');
  if (String(revision) !== VILLAGE_WGSL_CACHE_REVISION) return source;
  const tokens = tokensOf(source);
  if (!tokens) return source;
  const attributes = attributeTokens(tokens);
  if (!attributes) return source;
  const pairs = [], byType = new Map(), byVariable = new Map();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value !== 'struct' || !STRUCT.test(tokens[i + 1]?.value ?? '')) continue;
    const pair = declarationPair(tokens, i);
    if (!pair || byType.has(pair.type) || byVariable.has(pair.variable)) return source;
    pair.canonical = CANONICAL(pairs.length); pairs.push(pair); byType.set(pair.type, pair); byVariable.set(pair.variable, pair);
  }
  if (!pairs.length) return source;
  const identifiers = new Set(tokens.filter(token => token.kind === 'identifier').map(token => token.value));
  for (const pair of pairs) if (identifiers.has(pair.canonical) || identifiers.has(`${pair.canonical}Struct`)) return source;
  const edits = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (STRUCT.test(token.value)) {
      const pair = byType.get(token.value);
      if (!pair || attributes.has(i) || i !== pair.typeIndex && i !== pair.referenceTypeIndex) return source;
      edits.push({ ...token, replacement: `${pair.canonical}Struct` });
    } else if (VARIABLE.test(token.value)) {
      const pair = byVariable.get(token.value);
      if (!pair || attributes.has(i)) return source;
      if (i !== pair.variableIndex && (tokens[i - 1]?.value === '.' || tokens[i + 1]?.value !== '.' || tokens[i + 2]?.value !== pair.member)) return source;
      edits.push({ ...token, replacement: pair.canonical });
    }
  }
  const pieces = []; let cursor = 0;
  for (const edit of edits) { pieces.push(source.slice(cursor, edit.start), edit.replacement); cursor = edit.end; }
  pieces.push(source.slice(cursor));
  return pieces.join('');
}
