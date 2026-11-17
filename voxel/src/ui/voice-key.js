// Match packaged recordings across harmless whitespace and Unicode composition.
// Visible stage directions remain in the key; only the synthesis text omits them.
export const normalizeVoiceText = text => String(text ?? "").normalize("NFC").replace(/\s+/gu, " ").trim();

// FNV-1a over UTF-16 code units is identical in Node and every game browser.
export function voiceKey(speaker, text) {
  const who = normalizeVoiceText(speaker).toLowerCase();
  const value = `${who}\n${normalizeVoiceText(text)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return `${who}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
