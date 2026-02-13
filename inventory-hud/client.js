// Inventory HUD — builtin mod
// Displays 1-9 inventory slots at bottom-right of screen
// Uses server-authoritative data sync

var SLOT_COUNT = 9;
var SLOT_WIDTH = 96;
var SLOT_HEIGHT = 56;
var SLOT_SPACING = 8;
var PANEL_PADDING = 8;

// Colors
var C = {
    PANEL:    "#121722BF",
    SLOT:     "#1C1F2BEB",
    SELECTED: "#3B9547F2",
    TEXT:     "#E6F0ECFF"
};

// UI element IDs
var panelId = null;
var slotIds = [];
var slotBgIds = [];
var slotNumIds = [];
var slotLabelIds = [];

// Event handlers (prevent GC)
var updateHandler;
var inventoryCallback;

function init() {
    buildUI();

    // Register callback for inventory data changes from server
    inventoryCallback = function(data) {
        updateInventoryUI(data);
    };

    game.onDataChanged("inventory", inventoryCallback);

    mod.setUpdateHandler(updateHandler = function(dt) { tick(dt); });
    log("Inventory HUD: ready");
}

// ── UI Construction ───────────────────────────────────────────────────────────

function buildUI() {
    game.createUI("inventory-hud", "local");

    // Calculate total width
    var totalWidth = (SLOT_WIDTH * SLOT_COUNT) + (SLOT_SPACING * (SLOT_COUNT - 1)) + (PANEL_PADDING * 2);
    var totalHeight = SLOT_HEIGHT + (PANEL_PADDING * 2);

    // Root panel (bottom-right anchor)
    panelId = game.createPanel(null, -18, 18, totalWidth, totalHeight);
    game.setElementProperty(panelId, "anchor", "bottomright");
    game.setElementProperty(panelId, "backgroundColor", C.PANEL);

    // Create 9 slots
    for (var i = 0; i < SLOT_COUNT; i++) {
        createSlot(i);
    }
}

function createSlot(index) {
    var slotX = PANEL_PADDING + (index * (SLOT_WIDTH + SLOT_SPACING));
    var slotY = PANEL_PADDING;

    // Slot background
    var slotBg = game.createPanel(panelId, slotX, -slotY, SLOT_WIDTH, SLOT_HEIGHT);
    game.setElementProperty(slotBg, "anchor", "topleft");
    game.setElementProperty(slotBg, "backgroundColor", C.SLOT);
    slotBgIds.push(slotBg);

    // Slot number (top-left corner)
    var numLabel = game.createText(slotBg, (index + 1).toString(), 4, -4, 20, 16);
    game.setElementProperty(numLabel, "anchor", "topleft");
    game.setElementProperty(numLabel, "fontSize", 11);
    game.setElementProperty(numLabel, "color", C.TEXT);
    game.setElementProperty(numLabel, "alignment", "topleft");
    slotNumIds.push(numLabel);

    // Item label (centered)
    var itemLabel = game.createText(slotBg, "", 0, 0, SLOT_WIDTH - 8, SLOT_HEIGHT - 20);
    game.setElementProperty(itemLabel, "anchor", "center");
    game.setElementProperty(itemLabel, "fontSize", 10);
    game.setElementProperty(itemLabel, "color", C.TEXT);
    game.setElementProperty(itemLabel, "alignment", "center");
    game.setElementProperty(itemLabel, "wordWrap", true);
    slotLabelIds.push(itemLabel);

    slotIds.push(slotBg);
}

// ── Update loop ───────────────────────────────────────────────────────────────

function tick(dt) {
    // Poll for inventory data (in case callback hasn't fired yet)
    var inv = game.getMyData("inventory");
    if (inv) {
        updateInventoryUI(inv);
    }
}

function updateInventoryUI(inventoryData) {
    if (!inventoryData || !inventoryData.slots) {
        return;
    }

    var selectedSlot = inventoryData.selectedSlot || 1;

    // Update slot backgrounds
    for (var i = 0; i < SLOT_COUNT; i++) {
        var isSelected = (i + 1) === selectedSlot;
        game.setElementProperty(slotBgIds[i], "backgroundColor", isSelected ? C.SELECTED : C.SLOT);

        // Update slot label
        var slotData = inventoryData.slots[i];
        var label = "";

        if (slotData && slotData.items && slotData.items.length > 0) {
            var item = slotData.items[0];
            label = formatItemLabel(item);

            // Show count if more than 1
            if (slotData.items.length > 1) {
                label += " x" + slotData.items.length;
            }
        }

        game.setElementProperty(slotLabelIds[i], "text", label);
    }
}

function formatItemLabel(item) {
    if (!item) return "";

    // Item format: "partNumber:color" or just "partNumber"
    var parts = item.split(":");
    var partNumber = parts[0];

    // Simple formatting: just show part number for now
    // Could be enhanced to show friendly names
    return partNumber;
}

init();
