import "./platform/polyfills.js";
import { initRoomUi } from "./ui/room-ui.js";
import { createGame } from "./app/game.js";
import { initAudioUi } from "./ui/audio-ui.js";
import { initHouseUi } from "./ui/house-ui.js";
import { initCostumeUi } from "./ui/costume-ui.js";
import { initMenuUi } from "./ui/menu-ui.js";
import { initSaveUi } from "./ui/save-ui.js";
import { initFestivalUi } from "./ui/festival-ui.js";
import { initShopUi } from "./ui/shop-ui.js";
import { initLibraryUi } from "./ui/library-ui.js";
import { initPlotUi } from "./ui/plot-ui.js";

var app = createGame();
app.features.audio = initAudioUi(app);
app.features.home = initHouseUi(app);
app.features.outfits = initCostumeUi(app);
app.features.menus = initMenuUi(app);
app.features.backups = initSaveUi(app);
app.features.festivals = initFestivalUi(app);
app.features.library = initLibraryUi(app);
app.features.shop = initShopUi(app);
app.features.plots = initPlotUi(app);
app.features.rooms = initRoomUi(app);
app.start();

export { app };
