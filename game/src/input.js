// Keyboard + mouse state, pointer-lock look, wheel weapon cycling.
export function createInput(canvas) {
  const keys = {};
  const input = {
    keys, yaw: Math.PI, pitch: -0.08, aiming: false, firing: false,
    locked: false, wheel: 0, mouseDX: 0,
    down(code) { return !!keys[code]; },
    pressed: {},
  };
  let prev = {};
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; input.firing = false; input.aiming = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (!input.locked) return;
    if (e.button === 2) input.aiming = true;
    if (e.button === 0) input.firing = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) input.aiming = false;
    if (e.button === 0) input.firing = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    if (!input.locked) return;
    input.yaw -= e.movementX * 0.0026;
    input.pitch -= e.movementY * 0.0022;
    input.pitch = Math.max(-1.1, Math.min(1.1, input.pitch));
    input.mouseDX = e.movementX;
  });
  window.addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
  // Edge-triggered presses, refreshed once per frame by main.
  input.pollEdges = () => {
    input.pressed = {};
    for (const k of Object.keys(keys)) if (keys[k] && !prev[k]) input.pressed[k] = true;
    prev = { ...keys };
  };
  return input;
}
