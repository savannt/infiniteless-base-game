// Pause Menu — builtin mod
// Press Escape in-game to toggle. Override this mod to replace the entire pause menu.

var isOpen = false;
var panelId = null;
var dimId = null;

// Event handler roots (prevent GC)
var handlers = {};
var updateHandler;

var C = {
    DIM:    "#00000088",
    PANEL:  "#16162A",
    BTN:    "#1E1E3A",
    DANGER: "#882222",
    TEXT:   "#FFFFFF",
    TITLE:  "#AABBFF"
};

function init() {
    buildUI();
    mod.setUpdateHandler(updateHandler = function(dt) {
        // Only active during gameplay scene
        var scene = game.getCurrentScene();
        if (scene !== "Game" && scene !== "SampleScene") {
            if (isOpen) closePause();
            return;
        }
        if (game.keyDown("Escape")) togglePause();
    });
}

function buildUI() {
    game.createUI("pause-menu-ui", "local");

    // Dim overlay
    dimId = game.createPanel(null, 0, 0, 1920, 1080);
    game.setElementProperty(dimId, "anchor", "stretch");
    game.setElementProperty(dimId, "backgroundColor", C.DIM);
    game.setElementProperty(dimId, "visible", false);

    // Menu panel
    panelId = game.createPanel(dimId, 0, 0, 320, 360);
    game.setElementProperty(panelId, "anchor", "center");
    game.setElementProperty(panelId, "backgroundColor", C.PANEL);
    game.setElementProperty(panelId, "visible", false);

    // Title
    var title = game.createText(panelId, "PAUSED", 0, -145, 280, 44);
    game.setElementProperty(title, "anchor", "top");
    game.setElementProperty(title, "fontSize", 24);
    game.setElementProperty(title, "color", C.TITLE);
    game.setElementProperty(title, "bold", true);
    game.setElementProperty(title, "alignment", "center");

    // Buttons
    makeBtn("Resume",         -52,  function() { closePause(); });
    makeBtn("Options",          8,  function() { game.showNotification("Options: use F8 to access settings."); });
    makeBtn("Return to Menu", 68, function() { closePause(); game.loadScene("Menu"); });
    makeBtn("Exit Game",      128, function() { game.exitGame(); }, true);
}

function makeBtn(text, y, onClick, danger) {
    var b = game.createButton(panelId, text, 0, y, 260, 44);
    game.setElementProperty(b, "anchor", "top");
    game.setElementProperty(b, "backgroundColor", danger ? C.DANGER : C.BTN);
    game.setElementProperty(b, "fontSize", 15);
    game.setElementProperty(b, "textColor", C.TEXT);
    handlers["pause_btn_" + text] = onClick;
    game.onElementEvent(b, "click", handlers["pause_btn_" + text]);
    return b;
}

function togglePause() {
    if (isOpen) closePause(); else openPause();
}

function openPause() {
    isOpen = true;
    game.setInputBlocked(true);
    game.setElementProperty(dimId, "visible", true);
    game.setElementProperty(panelId, "visible", true);
}

function closePause() {
    isOpen = false;
    game.setInputBlocked(false);
    game.setElementProperty(dimId, "visible", false);
    game.setElementProperty(panelId, "visible", false);
}

// ── Public API exports ────────────────────────────────────────────────────────
// Other mods can import these to integrate with the pause menu:
//   var openPause = mod.import("pausemenu:open");
//   if (openPause) openPause();

handlers["export_open"]   = function() { openPause(); };
handlers["export_close"]  = function() { closePause(); };
handlers["export_toggle"] = function() { togglePause(); };
handlers["export_isOpen"] = function() { return isOpen; };

mod.export("pausemenu:open",   handlers["export_open"]);
mod.export("pausemenu:close",  handlers["export_close"]);
mod.export("pausemenu:toggle", handlers["export_toggle"]);
mod.export("pausemenu:isOpen", handlers["export_isOpen"]);

init();
