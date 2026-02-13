// Builtin block placement policy mod
// Exports placement hooks consumed by BlockBrickPlacer.

var DEFAULT_COLOR_CODE = 1;

function getSelectedPart() {
  var slot = game.getSelectedSlot();
  if (slot < 0) return null;

  var partNumber = game.getSlotPart(slot);
  if (!partNumber || partNumber.length === 0) return null;

  return String(partNumber);
}

function getSelectedColorCode() {
  return DEFAULT_COLOR_CODE;
}

function canPlace(partNumber, colorCode, x, y, z, rotY) {
  if (!partNumber || String(partNumber).length === 0) {
    return false;
  }

  // Default policy is permissive as long as a part is selected.
  // Override this export from another mod to enforce gameplay rules.
  return true;
}

function onPlaced(partNumber, colorCode, x, y, z, rotY) {
  // Placeholder hook for inventory consumption/cooldowns.
}

function onEnable() {
  mod.export("blockPlacement:getSelectedPart", getSelectedPart);
  mod.export("blockPlacement:getSelectedColorCode", getSelectedColorCode);
  mod.export("blockPlacement:canPlace", canPlace);
  mod.export("blockPlacement:onPlaced", onPlaced);

  log("builtin-block-placement hooks exported");
}

function onDisable() {
  // Exports are removed automatically by mod loader on unload.
}
