var ITEM_ID = "builtin.gravity_gun";
var LINE_ID = "builtin.gravity_gun.line";

var holdDistance = 6.0;
var minHoldDistance = 1.5;
var maxHoldDistance = 24.0;
var grabMaxDistance = 18.0;
var isHolding = false;

function clamp(v, minV, maxV) {
  if (v < minV) return minV;
  if (v > maxV) return maxV;
  return v;
}

function setLine(startPoint, endPoint, alpha, width) {
  game.setDottedLine(
    LINE_ID,
    startPoint.x, startPoint.y, startPoint.z,
    endPoint.x, endPoint.y, endPoint.z,
    0.57, 0.87, 1.0, alpha,
    width
  );
  game.setDottedLineVisible(LINE_ID, true);
}

function stopHolding() {
  if (isHolding) {
    game.gravityEnd();
  }
  isHolding = false;
}

function onEnable() {
  log("Builtin Gravity Gun mod enabled");

  mod.setUpdateHandler(function(dt) {
    var equipped = game.isCurrentItemEquipped(ITEM_ID);
    if (!equipped) {
      stopHolding();
      game.setDottedLineVisible(LINE_ID, false);
      return;
    }

    var scroll = game.mouseScrollY();
    if (scroll !== 0) {
      holdDistance = clamp(holdDistance + (scroll * 0.5), minHoldDistance, maxHoldDistance);
    }

    if (game.mouseButtonDown(0)) {
      if (isHolding) {
        stopHolding();
      } else {
        isHolding = game.gravityBeginFromLook(grabMaxDistance, holdDistance);
      }
    }

    if (game.mouseButtonUp(0) && isHolding) {
      stopHolding();
    }

    var handPoint = game.getViewHandPoint();
    if (!handPoint.hit) {
      game.setDottedLineVisible(LINE_ID, false);
      return;
    }

    if (isHolding) {
      game.gravityUpdateFromLook(holdDistance);
      var heldPoint = game.gravityGetHeldPoint();
      if (!heldPoint.hit) {
        stopHolding();
        game.setDottedLineVisible(LINE_ID, false);
        return;
      }

      setLine(handPoint, heldPoint, 1.0, 0.02);
      return;
    }

    var lookPoint = game.getLookPoint(holdDistance);
    if (!lookPoint.hit) {
      game.setDottedLineVisible(LINE_ID, false);
      return;
    }

    setLine(handPoint, lookPoint, 0.65, 0.02);
  });

  mod.registerCommand("/gravitygun", "Builtin gravity gun status/help", function(args) {
    return "Equip Gravity Gun and hold Left Mouse to grab physics objects. Scroll to change hold distance.";
  });
}

function onDisable() {
  mod.setUpdateHandler(undefined);
  stopHolding();
  game.removeDottedLine(LINE_ID);
}
