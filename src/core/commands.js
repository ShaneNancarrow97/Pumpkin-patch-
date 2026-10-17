import { applyRoomStyle, buyDecor, buyRoomStyle, moveDecor, placeDecor, rememberBookPage, removeDecor, selectHouseRoom, shelfBook, transferDecor, unshelfBook, upgradeHouse } from "./house-model.mjs";
import { assignDisplay, upgradeShop } from "./shop.js";
import { buyCostume, wearCostume } from "./costume-model.mjs";
import { claimFavour, rewardHarvestStreak } from "./festival-model.mjs";
import { choosePlotCrop, upgradePlot } from "./plot-model.mjs";
import { buy, click, harvest, plant } from "./model.mjs";

function dispatchCommand(state, command) {
  if (!command || typeof command !== "object")
    return { ok: false, value: false };
  let value = false;
  switch (command.type) {
    case "select-house-room":
      value = selectHouseRoom(state, command.id);
      break;
    case "buy-room-style":
      value = buyRoomStyle(state, command.id);
      break;
    case "apply-room-style":
      value = applyRoomStyle(state, command.id);
      break;
    case "transfer-decor":
      value = transferDecor(state, command.instance, command.roomId);
      break;
    case "choose-plot-crop":
      value = choosePlotCrop(state, command.plot, command.productId);
      break;
    case "shop-upgrade":
      value = upgradeShop(state, command.id);
      break;
    case "shop-display":
      value = assignDisplay(state, command.slot, command.productId);
      break;
    case "read-book-page":
      value = rememberBookPage(state, command.id, command.page);
      break;
    case "plant":
      value = plant(state, command.plot);
      break;
    case "harvest": {
      const count3 = harvest(state, command.plot);
      return { ok: count3 > 0, value: count3, ...count3 > 0 ? { streak: rewardHarvestStreak(state) } : {} };
    }
    case "boost":
      value = click(state);
      return { ok: !state.paused, value };
    case "buy-upgrade":
      value = buy(state, command.id);
      break;
    case "upgrade-plot":
      value = upgradePlot(state, command.plot);
      break;
    case "buy-decor":
      value = buyDecor(state, command.id);
      break;
    case "place-decor":
      value = placeDecor(state, command.id);
      break;
    case "move-decor":
      value = moveDecor(state, command.instance, command.x, command.y);
      break;
    case "pack-decor":
      value = removeDecor(state, command.instance);
      break;
    case "shelf-book":
      value = shelfBook(state, command.instance, command.id);
      break;
    case "unshelf-book":
      value = unshelfBook(state, command.instance, command.id);
      break;
    case "upgrade-house":
      value = upgradeHouse(state);
      break;
    case "buy-costume":
      value = buyCostume(state, command.id);
      break;
    case "wear-costume":
      value = wearCostume(state, command.id);
      break;
    case "claim-favour":
      value = claimFavour(state, command.id);
      break;
    case "flip-decor": {
      const piece = state.house.placed.find((item) => item.instance === command.instance);
      if (!state.paused && piece) {
        piece.flip = !piece.flip;
        value = true;
      }
      break;
    }
    case "clear-wallpaper":
      if (!state.paused) {
        state.house.wallpaper = null;
        value = true;
      }
      break;
    case "pause":
      if (typeof command.paused === "boolean") {
        state.paused = command.paused;
        value = true;
      }
      break;
    case "preference":
      if (command.key === "musicVolume" && typeof command.value === "number" && Number.isFinite(command.value) && command.value >= 0 && command.value <= 1) {
        state.musicVolume = command.value;
        value = true;
      } else if ((command.key === "music" || command.key === "sound") && typeof command.value === "boolean") {
        state[command.key] = command.value;
        value = true;
      }
      break;
    default:
      return rejectUnhandled(command);
  }
  return { ok: value !== false && value !== 0, value };
}
function rejectUnhandled(command) {
  return { ok: false, value: false };
}
function createActions(getState) {
  const execute = (command) => dispatchCommand(getState(), command);
  return {
    execute,
    selectHouseRoom: (id) => execute({ type: "select-house-room", id }).ok,
    buyRoomStyle: (id) => execute({ type: "buy-room-style", id }).ok,
    applyRoomStyle: (id) => execute({ type: "apply-room-style", id }).ok,
    transferDecor: (instance, roomId) => execute({ type: "transfer-decor", instance, roomId }).ok,
    choosePlotCrop: (plot, productId) => execute({ type: "choose-plot-crop", plot, productId }).ok,
    upgradeShop: (id) => execute({ type: "shop-upgrade", id }).ok,
    assignDisplay: (slot, productId) => execute({ type: "shop-display", slot, productId }).ok,
    rememberBookPage: (id, page) => execute({ type: "read-book-page", id, page }).value,
    plant: (_state, plot) => execute({ type: "plant", plot }).value,
    harvest: (_state, plot) => execute({ type: "harvest", plot }),
    click: (_state) => execute({ type: "boost" }).value,
    buy: (_state, id) => execute({ type: "buy-upgrade", id }).value,
    upgradePlot: (_state, plot) => execute({ type: "upgrade-plot", plot }).value,
    buyDecor: (_state, id) => execute({ type: "buy-decor", id }).value,
    placeDecor: (_state, id) => execute({ type: "place-decor", id }).value,
    moveDecor: (_state, instance, x, y) => execute({ type: "move-decor", instance, x, y }).value,
    removeDecor: (_state, instance) => execute({ type: "pack-decor", instance }).value,
    shelfBook: (_state, instance, id) => execute({ type: "shelf-book", instance, id }).value,
    unshelfBook: (_state, instance, id) => execute({ type: "unshelf-book", instance, id }).value,
    upgradeHouse: (_state) => execute({ type: "upgrade-house" }).value,
    buyCostume: (_state, id) => execute({ type: "buy-costume", id }).value,
    wearCostume: (_state, id) => execute({ type: "wear-costume", id }).value,
    claimFavour: (_state, id) => execute({ type: "claim-favour", id }).value,
    flipDecor: (instance) => execute({ type: "flip-decor", instance }).value,
    clearWallpaper: () => execute({ type: "clear-wallpaper" }).value,
    pause: (paused) => execute({ type: "pause", paused }).value,
    preference: (key, value) => execute({ type: "preference", key, value }).value
  };
}

export { createActions };
