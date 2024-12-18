import Vector from "../vector-library/vector";
import { onGamepadButton } from "./main";

export var gamepads = [];
export var gamepadConnected = false;
export var gamepad = {
  leftStick: Vector.zero,
  rightStick: Vector.zero,
  leftPause: false,
  rightPause: false,
  leftStickPressed: false,
  rightStickPressed: false,
  leftTrigger: false,
  rightTrigger: false,
  leftBumper: false,
  rightBumper: false,
  top: false,
  bottom: false,
  left: false,
  right: false,
  dpadUp: false,
  dpadDown: false,
  dppadLeft: false,
  dpadRight: false
};
var lastGamepad = { ...gamepad };
export const gamepadControls = {
  leftPause: 8,
  rightPause: 9,
  leftStickPressed: 10,
  rightStickPressed: 11,
  leftTrigger: 6,
  rightTrigger: 7,
  leftBumper: 4,
  rightBumper: 5,
  top: 3,
  bottom: 0,
  left: 2,
  right: 1,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
}
export const gamepadSticks = {
  left: (g) => new Vector(g.axes[0], g.axes[1]),
  right: (g) => new Vector(g.axes[2], g.axes[3])
}

export function updateGamepad() {
  try {
    if (gamepadConnected) {
      lastGamepad = { ...gamepad };
      gamepads = navigator.getGamepads();

      gamepad.leftStick = getStick("left");
      gamepad.rightStick = getStick("right");

      gamepad.leftPause = getControl("leftPause");
      gamepad.rightPause = getControl("rightPause");

      gamepad.leftStickPressed = getControl("leftStickPressed");
      gamepad.rightStickPressed = getControl("rightStickPressed");

      gamepad.leftTrigger = getControl("leftTrigger");
      gamepad.rightTrigger = getControl("rightTrigger");

      gamepad.leftBumper = getControl("leftBumper");
      gamepad.rightBumper = getControl("rightBumper");

      gamepad.top = getControl("top");
      gamepad.bottom = getControl("bottom");
      gamepad.left = getControl("left");
      gamepad.right = getControl("right");

      gamepad.dpadUp = getControl("dpadUp");
      gamepad.dpadDown = getControl("dpadDown");
      gamepad.dpadLeft = getControl("dpadLeft");
      gamepad.dpadRight = getControl("dpadRight");

      for (let control in gamepad) {
        if (gamepad[control] && !lastGamepad[control]) {
          onGamepadButton(control, gamepad[control]);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  requestAnimationFrame(updateGamepad);
}

addEventListener("gamepadconnected", (e) => {
  console.log("connect");
  gamepadConnected = true;
});
addEventListener("gamepaddisconnected", (e) => {
  console.log("disconnect");
  gamepadConnected = false;
});


export function getControl(control) {
  if (!gamepadConnected) return;
  return gamepads[0].buttons[gamepadControls[control]].pressed;
}

export function getStick(stick) {
  if (!gamepadConnected) return;
  let res = gamepadSticks[stick](gamepads[0]);
  if (res.mag < 0.1) return Vector.zero;
  return res;
}

export function rumble(duration, strength) {
  if (!gamepadConnected) return;
  if ("hapticActuators" in gamepads[0] && gamepads[0].hapticActuators.length > 0) {
    gamepads[0].hapticActuators[0].pulse(strength, duration * 1000);
  } else if ("vibrationActuator" in gamepads[0]) {
    gamepads[0].vibrationActuator.playEffect("dual-rumble", {
      startDelay: 0,
      duration: duration * 1000,
      weakMagnitude: strength,
      strongMagnitude: strength
    });
  }
}