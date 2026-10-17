import { decodeSave, serialize } from "./model.mjs";

function makeBackup(state) {
  return JSON.stringify({ format: "pumpkin-patch-backup", revision: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), state: JSON.parse(serialize(state)) });
}
function readBackup(text) {
  if (typeof text !== "string" || text.length > 8e6)
    throw new Error("Choose a Pumpkin Patch backup smaller than 8 MB.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not a readable Pumpkin Patch backup.");
  }
  if (data?.format !== void 0) {
    if (data.format !== "pumpkin-patch-backup" || data.revision !== 1)
      throw new Error("This backup comes from an unsupported version.");
    data = data.state;
  }
  const restored = decodeSave(JSON.stringify(data));
  if (!restored)
    throw new Error("This backup is incomplete. Your current patch has been kept.");
  return restored;
}

export { makeBackup, readBackup };
