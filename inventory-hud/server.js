// Inventory HUD — server script
// Server-authoritative inventory management
// NOTE: This is a placeholder - actual inventory logic should be integrated
// with the existing PlayerSlotInventory C# system

var updateHandler;

function init() {
    log("Inventory HUD (Server): ready");

    // Example: Initialize default inventory for testing
    // In production, this would be called when player joins
    // initializePlayerInventory(connectionId);
}

// Initialize inventory data for a player
function initializePlayerInventory(connectionId) {
    var defaultInventory = {
        selectedSlot: 1,
        slots: [
            { items: ["3001:red"] },      // Slot 1: Brick 2x4 Red
            { items: ["3003:blue"] },     // Slot 2: Brick 2x2 Blue
            { items: [] },                 // Slot 3: Empty
            { items: [] },                 // Slot 4: Empty
            { items: [] },                 // Slot 5: Empty
            { items: [] },                 // Slot 6: Empty
            { items: [] },                 // Slot 7: Empty
            { items: [] },                 // Slot 8: Empty
            { items: [] }                  // Slot 9: Empty
        ]
    };

    game.setPlayerData(connectionId, "inventory", defaultInventory);
    log("Initialized inventory for player " + connectionId);
}

// Update selected slot
function setPlayerSelectedSlot(connectionId, slotNumber) {
    var inv = game.getPlayerData(connectionId, "inventory");
    if (!inv) {
        log("No inventory data for player " + connectionId);
        return;
    }

    inv.selectedSlot = slotNumber;
    game.setPlayerData(connectionId, "inventory", inv);
}

// Add item to slot
function addItemToSlot(connectionId, slotIndex, itemId) {
    var inv = game.getPlayerData(connectionId, "inventory");
    if (!inv || !inv.slots[slotIndex]) {
        return false;
    }

    if (!inv.slots[slotIndex].items) {
        inv.slots[slotIndex].items = [];
    }

    inv.slots[slotIndex].items.push(itemId);
    game.setPlayerData(connectionId, "inventory", inv);
    return true;
}

// Remove item from slot
function removeItemFromSlot(connectionId, slotIndex, itemIndex) {
    var inv = game.getPlayerData(connectionId, "inventory");
    if (!inv || !inv.slots[slotIndex] || !inv.slots[slotIndex].items) {
        return null;
    }

    if (itemIndex >= inv.slots[slotIndex].items.length) {
        return null;
    }

    var removedItem = inv.slots[slotIndex].items.splice(itemIndex, 1)[0];
    game.setPlayerData(connectionId, "inventory", inv);
    return removedItem;
}

// Export functions for other mods to use
mod.export("inventory:initialize", function(connId) { initializePlayerInventory(connId); });
mod.export("inventory:setSlot", function(connId, slot) { setPlayerSelectedSlot(connId, slot); });
mod.export("inventory:addItem", function(connId, slot, item) { return addItemToSlot(connId, slot, item); });
mod.export("inventory:removeItem", function(connId, slot, idx) { return removeItemFromSlot(connId, slot, idx); });

init();
