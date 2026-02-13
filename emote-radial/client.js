// Emote Radial Wheel — builtin mod
// Hold Tab to open the wheel. Move mouse to select a segment, release Tab to play.

var OPEN_KEY = "Tab";
var RADIUS   = 160;     // px from center to option midpoint
var DEADZONE = 50;      // px - center area with no selection
var BLEND_IN  = 0.14;
var BLEND_OUT = 0.14;

// State
var isOpen = false;
var selectedIndex = -1;
var currentHandle = 0;
var overlay = null;
var optionPanels = [];
var centerX = 0, centerY = 0;
var emotes = [];

// UI element IDs
var overlayId = null;
var dimId = null;
var labelIds = [];

// Event handlers (must be stored globally to prevent GC)
var updateHandler;

function init() {
    emotes = game.listAnimations();
    if (!emotes || emotes.length === 0) {
        log("Emote Radial: no animations found.");
        return;
    }

    buildUI();
    mod.setUpdateHandler(updateHandler = function(dt) { tick(dt); });
    log("Emote Radial: ready (" + emotes.length + " emotes).");
}

// ── UI Construction ───────────────────────────────────────────────────────────

function buildUI() {
    game.createUI("emote-radial-ui", "local");

    // Full-screen dim overlay
    dimId = game.createPanel(null, 0, 0, 1920, 1080);
    game.setElementProperty(dimId, "anchor", "stretch");
    game.setElementProperty(dimId, "backgroundColor", "#00000088");
    game.setElementProperty(dimId, "visible", false);

    // Root container (centered)
    overlayId = game.createPanel(dimId, 0, 0, 1, 1);
    game.setElementProperty(overlayId, "anchor", "center");
    game.setElementProperty(overlayId, "visible", false);

    // Instruction label
    var instId = game.createText(dimId, "Move mouse to select · Release Tab to play · Esc to cancel", 0, -220, 500, 28);
    game.setElementProperty(instId, "anchor", "center");
    game.setElementProperty(instId, "fontSize", 13);
    game.setElementProperty(instId, "color", "#AAAAAA");
    game.setElementProperty(instId, "visible", false);
    labelIds.push(instId);

    // Build radial option segments
    var count = Math.min(emotes.length, 12); // cap at 12 segments
    var screen = game.getScreenSize();
    centerX = screen.x * 0.5;
    centerY = screen.y * 0.5;

    for (var i = 0; i < count; i++) {
        (function(idx) {
            var angle = (idx / count) * Math.PI * 2 - Math.PI * 0.5;
            var bx = Math.round(Math.cos(angle) * RADIUS);
            var by = Math.round(Math.sin(angle) * RADIUS);

            var panel = game.createPanel(dimId, bx, -by, 130, 36);
            game.setElementProperty(panel, "anchor", "center");
            game.setElementProperty(panel, "backgroundColor", "#1A1A2E");
            game.setElementProperty(panel, "visible", false);
            optionPanels.push(panel);

            var lbl = game.createText(panel, shortName(emotes[idx]), 0, 0, 130, 36);
            game.setElementProperty(lbl, "anchor", "center");
            game.setElementProperty(lbl, "fontSize", 12);
            game.setElementProperty(lbl, "color", "#FFFFFF");
            game.setElementProperty(lbl, "visible", false);
            labelIds.push(lbl);
        })(i);
    }

    // Stop emote button at bottom
    var stopPanel = game.createPanel(dimId, 0, -RADIUS - 50, 130, 36);
    game.setElementProperty(stopPanel, "anchor", "center");
    game.setElementProperty(stopPanel, "backgroundColor", "#3D0000");
    game.setElementProperty(stopPanel, "visible", false);
    optionPanels.push(stopPanel); // index = count → "stop"

    var stopLbl = game.createText(stopPanel, "[ Stop Emote ]", 0, 0, 130, 36);
    game.setElementProperty(stopLbl, "anchor", "center");
    game.setElementProperty(stopLbl, "fontSize", 12);
    game.setElementProperty(stopLbl, "color", "#FF6666");
    game.setElementProperty(stopLbl, "visible", false);
    labelIds.push(stopLbl);
}

function shortName(anim) {
    var parts = anim.split(/[_\-\/]/);
    return parts[parts.length - 1].substring(0, 14);
}

// ── Update loop ───────────────────────────────────────────────────────────────

function tick(dt) {
    var held = game.keyHeld(OPEN_KEY);

    if (held && !isOpen) openWheel();
    if (!held && isOpen) closeWheel(false);

    if (!isOpen) return;

    // Cancel on Escape
    if (game.keyDown("Escape")) { closeWheel(true); return; }

    updateSelection();
}

function openWheel() {
    isOpen = true;
    selectedIndex = -1;
    game.setInputBlocked(true);

    game.setElementProperty(dimId, "visible", true);
    game.setElementProperty(overlayId, "visible", true);
    for (var i = 0; i < optionPanels.length; i++) game.setElementProperty(optionPanels[i], "visible", true);
    for (var i = 0; i < labelIds.length; i++) game.setElementProperty(labelIds[i], "visible", true);
}

function closeWheel(cancel) {
    isOpen = false;
    game.setInputBlocked(false);

    game.setElementProperty(dimId, "visible", false);
    game.setElementProperty(overlayId, "visible", false);
    for (var i = 0; i < optionPanels.length; i++) game.setElementProperty(optionPanels[i], "visible", false);
    for (var i = 0; i < labelIds.length; i++) game.setElementProperty(labelIds[i], "visible", false);

    if (!cancel && selectedIndex >= 0) {
        playSelected();
    }
}

function updateSelection() {
    var mouse = game.getMousePosition();
    var dx = mouse.x - centerX;
    var dy = mouse.y - centerY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    var count = optionPanels.length - 1; // -1 for stop button
    var prev = selectedIndex;

    if (dist < DEADZONE) {
        selectedIndex = -1;
    } else {
        var angle = Math.atan2(-dy, dx);
        if (angle < -Math.PI * 0.5) angle += Math.PI * 2;
        var raw = (angle + Math.PI * 0.5) / (Math.PI * 2) * count;
        selectedIndex = Math.round(raw) % count;
    }

    // Update highlight
    for (var i = 0; i < optionPanels.length; i++) {
        var isStop = i === count;
        var selected = (isStop && selectedIndex === -2) || (!isStop && i === selectedIndex);
        game.setElementProperty(optionPanels[i], "backgroundColor",
            selected ? (isStop ? "#880000" : "#3A4080") : (isStop ? "#3D0000" : "#1A1A2E"));
    }
}

function playSelected() {
    var count = optionPanels.length - 1;
    if (selectedIndex === -2) {
        // Stop current emote
        if (currentHandle) { game.stopLocalAnimation(currentHandle, BLEND_OUT); currentHandle = 0; }
        return;
    }
    if (selectedIndex < 0 || selectedIndex >= emotes.length) return;

    if (currentHandle) game.stopLocalAnimation(currentHandle, BLEND_OUT);
    currentHandle = game.playLocalAnimation(emotes[selectedIndex], BLEND_IN, 1.0, true, false);
}

// ── Public API exports ────────────────────────────────────────────────────────
// Other mods can import the emote wheel API:
//   var openEmotes = mod.import("emote:open");
//   if (openEmotes) openEmotes();

var _exportHandlers = {};
_exportHandlers["open"]  = function() { openWheel(); };
_exportHandlers["close"] = function() { closeWheel(); };

mod.export("emote:open",  _exportHandlers["open"]);
mod.export("emote:close", _exportHandlers["close"]);

init();
