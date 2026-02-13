// Main Menu — builtin mod
// Implements the full game main menu using the mod UI system.
// Override this mod to completely replace the menu UI.

var PAGE = {
    TITLE:        "title",
    SINGLEPLAYER: "singleplayer",
    CREATE_WORLD: "create-world",
    MULTIPLAYER:  "multiplayer",
    DIRECT:       "direct-connect",
    OPTIONS:      "options",
    HOTKEYS:      "hotkeys",
    CREDITS:      "credits"
};

// Colours
var C = {
    BG:        "#0D0D1A",
    PANEL:     "#16162A",
    BTN:       "#1E1E3A",
    BTN_HOV:   "#2A2A50",
    ACCENT:    "#4466FF",
    DANGER:    "#882222",
    TEXT:      "#FFFFFF",
    MUTED:     "#888899",
    INPUT_BG:  "#1A1A2A",
    TITLE:     "#AABBFF"
};

// ── State ─────────────────────────────────────────────────────────────────────
var currentPage = null;
var pages = {};    // id → panel element ID
var worldList = [];
var selectedWorld = null;
var uiReady = false;

// Event handler roots (prevent GC)
var handlers = {};
var updateHandler;

// ── Entry point ───────────────────────────────────────────────────────────────
function init() {
    if (game.getCurrentScene() !== "Menu" && game.getCurrentScene() !== "MainMenu") {
        return; // Only run in menu scene
    }

    game.createUI("main-menu-ui", "local");
    buildAllPages();
    showPage(PAGE.TITLE);
    uiReady = true;

    mod.setUpdateHandler(updateHandler = function(dt) {
        // Detect scene changes — hide everything if we left the menu
        if (uiReady && game.getCurrentScene() !== "Menu" && game.getCurrentScene() !== "MainMenu") {
            hideAllPages();
            uiReady = false;
        }
    });
}

// ── Layout helpers ────────────────────────────────────────────────────────────
var W = 1920, H = 1080;
var PANEL_W = 480, PANEL_H = 620;
var PANEL_X = -(W/2 - PANEL_W/2 - 80), PANEL_Y = 0;

function makePage(id) {
    var p = game.createPanel(null, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    game.setElementProperty(p, "anchor", "center");
    game.setElementProperty(p, "backgroundColor", C.PANEL);
    game.setElementProperty(p, "visible", false);
    pages[id] = p;
    return p;
}

function makeTitle(parent, text, yOffset) {
    var t = game.createText(parent, text, 0, yOffset, PANEL_W - 40, 50);
    game.setElementProperty(t, "anchor", "top");
    game.setElementProperty(t, "fontSize", 28);
    game.setElementProperty(t, "color", C.TITLE);
    game.setElementProperty(t, "bold", true);
    game.setElementProperty(t, "alignment", "center");
    return t;
}

function makeBtn(parent, text, y, onClick, danger) {
    var b = game.createButton(parent, text, 0, y, PANEL_W - 60, 44);
    game.setElementProperty(b, "anchor", "top");
    game.setElementProperty(b, "backgroundColor", danger ? C.DANGER : C.BTN);
    game.setElementProperty(b, "fontSize", 15);
    game.setElementProperty(b, "textColor", C.TEXT);
    if (onClick) {
        handlers["btn_" + text + y] = onClick;
        game.onElementEvent(b, "click", handlers["btn_" + text + y]);
    }
    return b;
}

function makeInput(parent, placeholder, y, width) {
    var inp = game.createInput(parent, placeholder, 0, y, width || PANEL_W - 60, 38);
    game.setElementProperty(inp, "anchor", "top");
    game.setElementProperty(inp, "backgroundColor", C.INPUT_BG);
    game.setElementProperty(inp, "textColor", C.TEXT);
    return inp;
}

function makeMuted(parent, text, y) {
    var t = game.createText(parent, text, 0, y, PANEL_W - 60, 22);
    game.setElementProperty(t, "anchor", "top");
    game.setElementProperty(t, "fontSize", 11);
    game.setElementProperty(t, "color", C.MUTED);
    game.setElementProperty(t, "alignment", "center");
    return t;
}

// ── Page: Title ───────────────────────────────────────────────────────────────
function buildTitlePage() {
    var p = makePage(PAGE.TITLE);
    makeTitle(p, "INFINITELESS", -260);
    makeMuted(p, "A Voxel Building Game", -210);

    var btns = [
        ["Play",        function() { refreshWorldList(); showPage(PAGE.SINGLEPLAYER); }],
        ["Multiplayer", function() { showPage(PAGE.MULTIPLAYER); }],
        ["Options",     function() { showPage(PAGE.OPTIONS); }],
        ["Credits",     function() { showPage(PAGE.CREDITS); }],
        ["Exit",        function() { game.exitGame(); }, true]
    ];
    var startY = -100;
    for (var i = 0; i < btns.length; i++) {
        makeBtn(p, btns[i][0], startY + i * 54, btns[i][1], btns[i][2]);
    }
}

// ── Page: Singleplayer ────────────────────────────────────────────────────────
var worldScrollId = null;
var worldStatusLabel = null;

function buildSingleplayerPage() {
    var p = makePage(PAGE.SINGLEPLAYER);
    makeTitle(p, "YOUR WORLDS", -260);

    worldScrollId = game.createElement("scrollview", p);
    game.setElementProperty(worldScrollId, "anchor", "top");
    game.setElementProperty(worldScrollId, "x", 0);
    game.setElementProperty(worldScrollId, "y", -180);
    game.setElementProperty(worldScrollId, "width", PANEL_W - 60);
    game.setElementProperty(worldScrollId, "height", 240);

    worldStatusLabel = game.createText(p, "", 0, -180, PANEL_W - 60, 240);
    game.setElementProperty(worldStatusLabel, "anchor", "top");
    game.setElementProperty(worldStatusLabel, "color", C.MUTED);
    game.setElementProperty(worldStatusLabel, "alignment", "center");
    game.setElementProperty(worldStatusLabel, "fontSize", 13);

    makeBtn(p, "Create New World", 90, function() { showPage(PAGE.CREATE_WORLD); });
    makeBtn(p, "← Back",          150, function() { showPage(PAGE.TITLE); });
}

function refreshWorldList() {
    if (!worldScrollId) return;
    game.clearScrollView(worldScrollId);
    worldList = game.getSavedWorlds() || [];

    if (worldList.length === 0) {
        game.setElementProperty(worldStatusLabel, "text", "No saved worlds.\nCreate one to begin!");
        game.setElementProperty(worldStatusLabel, "visible", true);
        return;
    }
    game.setElementProperty(worldStatusLabel, "visible", false);

    for (var i = 0; i < worldList.length; i++) {
        (function(worldName) {
            var row = game.createPanel(null, 0, 0, PANEL_W - 80, 36);
            game.setElementProperty(row, "backgroundColor", C.BTN);

            var lbl = game.createText(row, worldName, -80, 0, 200, 36);
            game.setElementProperty(lbl, "anchor", "left");
            game.setElementProperty(lbl, "fontSize", 13);
            game.setElementProperty(lbl, "color", C.TEXT);
            game.setElementProperty(lbl, "alignment", "left");

            var loadBtn = game.createButton(row, "Play", 70, 0, 60, 28);
            game.setElementProperty(loadBtn, "anchor", "right");
            game.setElementProperty(loadBtn, "backgroundColor", C.ACCENT);
            game.setElementProperty(loadBtn, "fontSize", 12);
            handlers["load_" + worldName] = function() { game.loadWorld(worldName); };
            game.onElementEvent(loadBtn, "click", handlers["load_" + worldName]);

            var delBtn = game.createButton(row, "✕", 10, 0, 28, 28);
            game.setElementProperty(delBtn, "anchor", "right");
            game.setElementProperty(delBtn, "backgroundColor", C.DANGER);
            game.setElementProperty(delBtn, "fontSize", 12);
            handlers["del_" + worldName] = function() {
                game.deleteWorld(worldName);
                refreshWorldList();
            };
            game.onElementEvent(delBtn, "click", handlers["del_" + worldName]);

            game.appendToScrollView(worldScrollId, row, 42);
        })(worldList[i]);
    }
}

// ── Page: Create World ────────────────────────────────────────────────────────
var createNameInput = null;
var createSeedInput = null;

function buildCreateWorldPage() {
    var p = makePage(PAGE.CREATE_WORLD);
    makeTitle(p, "CREATE WORLD", -260);
    makeMuted(p, "Configure your new world", -215);

    game.createText(p, "World Name", 0, -165, PANEL_W - 60, 22);
    createNameInput = makeInput(p, "My World", -130);

    game.createText(p, "Seed (0 = random)", 0, -82, PANEL_W - 60, 22);
    createSeedInput = makeInput(p, "0", -47, 200);

    makeBtn(p, "Create & Play", 20, function() {
        var name = game.getElementProperty(createNameInput, "text") || "My World";
        var seedStr = game.getElementProperty(createSeedInput, "text") || "0";
        var seed = parseInt(seedStr) || Math.floor(Math.random() * 999999);
        game.createWorld(name, seed);
    });
    makeBtn(p, "← Back", 82, function() { showPage(PAGE.SINGLEPLAYER); });
}

// ── Page: Multiplayer ─────────────────────────────────────────────────────────
function buildMultiplayerPage() {
    var p = makePage(PAGE.MULTIPLAYER);
    makeTitle(p, "MULTIPLAYER", -260);

    makeBtn(p, "Direct Connect", -100, function() { showPage(PAGE.DIRECT); });
    makeBtn(p, "Host a Game",     -40, function() {
        game.startHost();
        game.loadScene("Game");
    });
    makeMuted(p, "Server Browser coming soon", 20);
    makeBtn(p, "← Back", 90, function() { showPage(PAGE.TITLE); });
}

// ── Page: Direct Connect ──────────────────────────────────────────────────────
var directAddrInput = null;
var directPassInput = null;

function buildDirectConnectPage() {
    var p = makePage(PAGE.DIRECT);
    makeTitle(p, "DIRECT CONNECT", -260);

    game.createText(p, "Server Address", 0, -175, PANEL_W - 60, 22);
    directAddrInput = makeInput(p, "127.0.0.1:7777", -140);

    game.createText(p, "Password (optional)", 0, -92, PANEL_W - 60, 22);
    directPassInput = makeInput(p, "Leave blank if none", -57);

    makeBtn(p, "Connect", 20, function() {
        var addr = game.getElementProperty(directAddrInput, "text") || "127.0.0.1:7777";
        var pass = game.getElementProperty(directPassInput, "text") || "";
        game.connectToServer(addr, pass);
    });
    makeBtn(p, "← Back", 82, function() { showPage(PAGE.MULTIPLAYER); });
}

// ── Page: Options ─────────────────────────────────────────────────────────────
function buildOptionsPage() {
    var p = makePage(PAGE.OPTIONS);
    makeTitle(p, "OPTIONS", -260);

    makeBtn(p, "🎮  Hotkeys & Controls", -160, function() { buildHotkeysPageIfNeeded(); showPage(PAGE.HOTKEYS); });
    makeBtn(p, "← Back",                 -96,  function() { showPage(PAGE.TITLE); });
}

// ── Page: Hotkeys ─────────────────────────────────────────────────────────────
var hotkeyPageBuilt = false;
var captureAction = null;     // action name being rebound
var captureDimId = null;
var captureLabel = null;
var captureHandler = null;

function buildHotkeysPageIfNeeded() {
    if (hotkeyPageBuilt) return;
    hotkeyPageBuilt = true;
    buildHotkeysPage();
}

function buildHotkeysPage() {
    var HPANEL_W = 720;
    var HPANEL_H = 700;
    var p = game.createPanel(null, 0, 0, HPANEL_W, HPANEL_H);
    game.setElementProperty(p, "anchor", "center");
    game.setElementProperty(p, "backgroundColor", C.PANEL);
    game.setElementProperty(p, "visible", false);
    pages[PAGE.HOTKEYS] = p;

    makeTitle(p, "HOTKEYS & CONTROLS", -320);

    // Category tabs
    var CATEGORIES = ["UI", "Gameplay", "Inventory"];
    var tabY = -272;
    var tabW = (HPANEL_W - 80) / CATEGORIES.length;
    var activeCategory = CATEGORIES[0];
    var tabBtns = {};
    var scrollViews = {};

    for (var ci = 0; ci < CATEGORIES.length; ci++) {
        (function(cat, catX) {
            var tb = game.createButton(p, cat, catX, tabY, tabW - 4, 32);
            game.setElementProperty(tb, "anchor", "top");
            game.setElementProperty(tb, "backgroundColor", cat === activeCategory ? C.ACCENT : C.BTN);
            game.setElementProperty(tb, "fontSize", 13);
            game.setElementProperty(tb, "textColor", C.TEXT);
            tabBtns[cat] = tb;

            // Create scroll view for this category
            var sv = game.createElement("scrollview", p);
            game.setElementProperty(sv, "anchor", "top");
            game.setElementProperty(sv, "x", 0);
            game.setElementProperty(sv, "y", -232);
            game.setElementProperty(sv, "width", HPANEL_W - 60);
            game.setElementProperty(sv, "height", 440);
            game.setElementProperty(sv, "visible", cat === activeCategory);
            scrollViews[cat] = sv;

            handlers["tab_" + cat] = function() {
                activeCategory = cat;
                for (var k in tabBtns) {
                    game.setElementProperty(tabBtns[k], "backgroundColor", k === cat ? C.ACCENT : C.BTN);
                }
                for (var k2 in scrollViews) {
                    game.setElementProperty(scrollViews[k2], "visible", k2 === cat);
                }
            };
            game.onElementEvent(tb, "click", handlers["tab_" + cat]);

            // Populate hotkey rows for this category
            var hotkeys = game.getHotkeys(cat);
            if (hotkeys) {
                for (var hi = 0; hi < hotkeys.length; hi++) {
                    buildHotkeyRow(scrollViews[cat], hotkeys[hi]);
                }
            }
        })(CATEGORIES[ci], -((HPANEL_W - 80) / 2) + ci * tabW + tabW / 2);
    }

    makeBtn(p, "← Back", 308, function() { showPage(PAGE.OPTIONS); });

    // Capture overlay (fullscreen, over menu)
    captureDimId = game.createPanel(null, 0, 0, 1920, 1080);
    game.setElementProperty(captureDimId, "anchor", "stretch");
    game.setElementProperty(captureDimId, "backgroundColor", "#00000099");
    game.setElementProperty(captureDimId, "visible", false);

    var captureBox = game.createPanel(captureDimId, 0, 0, 420, 160);
    game.setElementProperty(captureBox, "anchor", "center");
    game.setElementProperty(captureBox, "backgroundColor", C.PANEL);

    captureLabel = game.createText(captureBox, "Press any key...", 0, -20, 380, 60);
    game.setElementProperty(captureLabel, "anchor", "center");
    game.setElementProperty(captureLabel, "fontSize", 20);
    game.setElementProperty(captureLabel, "color", C.TITLE);
    game.setElementProperty(captureLabel, "alignment", "center");

    var cancelBtn = game.createButton(captureBox, "Cancel", 0, 36, 120, 34);
    game.setElementProperty(cancelBtn, "anchor", "center");
    game.setElementProperty(cancelBtn, "backgroundColor", C.DANGER);
    game.setElementProperty(cancelBtn, "fontSize", 13);
    handlers["capture_cancel"] = function() { endCapture(); };
    game.onElementEvent(cancelBtn, "click", handlers["capture_cancel"]);
}

var hotkeyDisplayLabels = {}; // action → { keyLabel, gpLabel, keyIconId, gpIconId }

function buildHotkeyRow(scrollViewId, hk) {
    var ROW_W = 640;
    var row = game.createPanel(null, 0, 0, ROW_W, 52);
    game.setElementProperty(row, "backgroundColor", "#1A1A2A");

    // Action name label
    var nameLbl = game.createText(row, hk.displayName, -ROW_W / 2 + 12, 0, 200, 52);
    game.setElementProperty(nameLbl, "anchor", "left");
    game.setElementProperty(nameLbl, "fontSize", 12);
    game.setElementProperty(nameLbl, "color", C.TEXT);
    game.setElementProperty(nameLbl, "alignment", "left");

    // Keyboard icon
    var keyIcon = game.createElement("image", row);
    game.setElementProperty(keyIcon, "anchor", "center");
    game.setElementProperty(keyIcon, "x", 80);
    game.setElementProperty(keyIcon, "y", 0);
    game.setElementProperty(keyIcon, "width", 32);
    game.setElementProperty(keyIcon, "height", 32);
    var iconPath = game.getHotkeyIcon(hk.action);
    if (iconPath) game.setElementProperty(keyIcon, "sprite", iconPath);

    // Key name label
    var keyLbl = game.createText(row, hk.keyDisplay, 120, 0, 100, 52);
    game.setElementProperty(keyLbl, "anchor", "center");
    game.setElementProperty(keyLbl, "fontSize", 11);
    game.setElementProperty(keyLbl, "color", C.MUTED);
    game.setElementProperty(keyLbl, "alignment", "center");

    // Gamepad icon (if available)
    if (hk.hasGamepad) {
        var gpIcon = game.createElement("image", row);
        game.setElementProperty(gpIcon, "anchor", "center");
        game.setElementProperty(gpIcon, "x", 220);
        game.setElementProperty(gpIcon, "y", 0);
        game.setElementProperty(gpIcon, "width", 32);
        game.setElementProperty(gpIcon, "height", 32);
        var gpPath = game.getHotkeyIcon(hk.action);
        if (gpPath) game.setElementProperty(gpIcon, "sprite", gpPath);

        var gpLbl = game.createText(row, hk.gamepadDisplay, 260, 0, 120, 52);
        game.setElementProperty(gpLbl, "anchor", "center");
        game.setElementProperty(gpLbl, "fontSize", 10);
        game.setElementProperty(gpLbl, "color", C.MUTED);
        game.setElementProperty(gpLbl, "alignment", "center");

        hotkeyDisplayLabels[hk.action] = { keyLabel: keyLbl, gpLabel: gpLbl, keyIcon: keyIcon, gpIcon: gpIcon };
    } else {
        hotkeyDisplayLabels[hk.action] = { keyLabel: keyLbl, keyIcon: keyIcon };
    }

    // Rebind button
    var rebindBtn = game.createButton(row, "Rebind", ROW_W / 2 - 60, 0, 80, 32);
    game.setElementProperty(rebindBtn, "anchor", "right");
    game.setElementProperty(rebindBtn, "backgroundColor", C.BTN);
    game.setElementProperty(rebindBtn, "fontSize", 11);
    handlers["rebind_" + hk.action] = (function(action) {
        return function() { startCapture(action); };
    })(hk.action);
    game.onElementEvent(rebindBtn, "click", handlers["rebind_" + hk.action]);

    game.appendToScrollView(scrollViewId, row, 56);
}

function startCapture(action) {
    captureAction = action;
    game.setElementProperty(captureLabel, "text", "Press any key for:\n" + action);
    game.setElementProperty(captureDimId, "visible", true);

    // Set up key capture in update
    var prevUpdate = null;
    captureHandler = function(dt) {
        // This relies on game.keyDown polling for all keys — not ideal but functional
        // A proper capture would need game.getLastKeyPressed() API
        // For now we just wait for user to click cancel or use the direct key APIs
    };
}

function endCapture() {
    captureAction = null;
    game.setElementProperty(captureDimId, "visible", false);
}

function updateHotkeyRow(action) {
    var info = hotkeyDisplayLabels[action];
    if (!info) return;
    var keyDisplay = game.getHotkeyDisplay(action);
    if (info.keyLabel) game.setElementProperty(info.keyLabel, "text", keyDisplay);
    var iconPath = game.getHotkeyIcon(action);
    if (info.keyIcon && iconPath) game.setElementProperty(info.keyIcon, "sprite", iconPath);
}

// ── Page: Credits ─────────────────────────────────────────────────────────────
function buildCreditsPage() {
    var p = makePage(PAGE.CREDITS);
    makeTitle(p, "CREDITS", -260);

    var scroll = game.createElement("scrollview", p);
    game.setElementProperty(scroll, "anchor", "top");
    game.setElementProperty(scroll, "x", 0);
    game.setElementProperty(scroll, "y", -195);
    game.setElementProperty(scroll, "width", PANEL_W - 60);
    game.setElementProperty(scroll, "height", 320);

    var creditLines = [
        "INFINITELESS",
        "A Voxel Building Game",
        "",
        "— Development —",
        "Built with Unity 6 and Mirror Networking",
        "LDraw part library support",
        "",
        "— Mod System —",
        "JavaScript modding via Jint",
        "Open API for complete customization",
        "",
        "— Open Source —",
        "LDraw part definitions: ldraw.org",
        "",
        "Thank you for playing!"
    ];
    for (var i = 0; i < creditLines.length; i++) {
        (function(line) {
            var lbl = game.createText(null, line, 0, 0, PANEL_W - 80, 28);
            game.setElementProperty(lbl, "anchor", "top");
            game.setElementProperty(lbl, "fontSize", line === "INFINITELESS" ? 18 : 13);
            game.setElementProperty(lbl, "color", line === "" ? C.MUTED : (line.indexOf("—") >= 0 ? C.ACCENT : C.TEXT));
            game.setElementProperty(lbl, "alignment", "center");
            game.appendToScrollView(scroll, lbl, 30);
        })(creditLines[i]);
    }

    makeBtn(p, "← Back", 155, function() { showPage(PAGE.TITLE); });
}

// ── Page navigation ───────────────────────────────────────────────────────────
function buildAllPages() {
    // Background
    var bg = game.createPanel(null, 0, 0, W, H);
    game.setElementProperty(bg, "anchor", "stretch");
    game.setElementProperty(bg, "backgroundColor", C.BG);

    buildTitlePage();
    buildSingleplayerPage();
    buildCreateWorldPage();
    buildMultiplayerPage();
    buildDirectConnectPage();
    buildOptionsPage();
    // Hotkeys page built lazily on first open
    buildCreditsPage();
}

function showPage(id) {
    for (var k in pages) {
        game.setElementProperty(pages[k], "visible", k === id);
    }
    currentPage = id;
}

function hideAllPages() {
    for (var k in pages) {
        game.setElementProperty(pages[k], "visible", false);
    }
}

// ── Public API exports ────────────────────────────────────────────────────────
// Other mods can import these to integrate with or extend the main menu.
//
// Usage in another mod:
//   var openSettings = mod.import("menu:openSettings");
//   if (openSettings) openSettings();
//
// Or import the hotkey icon helper without the full menu:
//   var getIcon = mod.import("hotkeys:getIcon");
//   var iconPath = getIcon ? getIcon("PauseMenu") : null;

handlers["export_showPage"]       = function(id) { showPage(id); };
handlers["export_openSettings"]   = function() { showPage(PAGE.OPTIONS); };
handlers["export_openHotkeys"]    = function() { buildHotkeysPageIfNeeded(); showPage(PAGE.HOTKEYS); };
handlers["export_getHotkeyIcon"]  = function(action) { return game.getHotkeyIcon(action); };
handlers["export_getHotkeyDisplay"] = function(action) { return game.getHotkeyDisplay(action); };
handlers["export_getHotkeys"]     = function(cat) { return game.getHotkeys(cat); };
handlers["export_getInputIcon"]   = function(key) { return game.getInputIcon(key); };
handlers["export_getActiveDevice"]= function() { return game.getActiveInputDevice(); };

mod.export("menu:showPage",           handlers["export_showPage"]);
mod.export("menu:openSettings",       handlers["export_openSettings"]);
mod.export("menu:openHotkeys",        handlers["export_openHotkeys"]);
mod.export("hotkeys:getIcon",         handlers["export_getHotkeyIcon"]);
mod.export("hotkeys:getDisplay",      handlers["export_getHotkeyDisplay"]);
mod.export("hotkeys:getAll",          handlers["export_getHotkeys"]);
mod.export("input:getIcon",           handlers["export_getInputIcon"]);
mod.export("input:getActiveDevice",   handlers["export_getActiveDevice"]);

init();
