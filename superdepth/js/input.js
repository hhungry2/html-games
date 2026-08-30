// SuperDepth - input. Reproduces GameScreen's key_state word: the low bits are
// "held" flags and the matching high bits are one-shot "triggered" flags that
// clear after the frame that reads them.

SD.Input = (function () {
  const HOLD_U = 1, HOLD_D = 2, HOLD_L = 4, HOLD_R = 8, HOLD_1 = 16, HOLD_2 = 32;
  const HOLD_RST0 = 64, HOLD_RST1 = 128;
  const TRIG_U = 256, TRIG_D = 512, TRIG_L = 1024, TRIG_R = 2048;
  const TRIG_1 = 4096, TRIG_2 = 8192, TRIG_RST0 = 16384, TRIG_RST1 = 32768;
  const TRIG_ANY = 131072;

  const KEYMAP = {
    ArrowUp: HOLD_U, ArrowDown: HOLD_D, ArrowLeft: HOLD_L, ArrowRight: HOLD_R,
    KeyW: HOLD_U, KeyS: HOLD_D, KeyA: HOLD_L, KeyD: HOLD_R,
    KeyZ: HOLD_1, Space: HOLD_1, KeyX: HOLD_2, ShiftLeft: HOLD_2,
    Escape: HOLD_RST0, KeyP: HOLD_RST0, KeyQ: HOLD_RST1,
  };

  let hold = 0, prev = 0, state = 0;
  const listeners = [];

  function onKeyDown(e) {
    const b = KEYMAP[e.code];
    if (b !== undefined) { hold |= b; e.preventDefault(); }
    listeners.forEach((f) => f(e));
  }
  function onKeyUp(e) {
    const b = KEYMAP[e.code];
    if (b !== undefined) { hold &= ~b; e.preventDefault(); }
  }

  function attach(el) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { hold = 0; });
    bindTouch(el);
  }

  // On-screen pad. Each control sets/clears the same hold bits as the keyboard.
  function bindTouch(root) {
    const pads = root.querySelectorAll('[data-btn]');
    pads.forEach((el) => {
      const bit = { up: HOLD_U, down: HOLD_D, left: HOLD_L, right: HOLD_R,
                    a: HOLD_1, b: HOLD_2, pause: HOLD_RST0 }[el.dataset.btn];
      if (bit === undefined) return;
      const on = (e) => { hold |= bit; el.classList.add('on'); e.preventDefault(); };
      const off = (e) => { hold &= ~bit; el.classList.remove('on'); e.preventDefault(); };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    });
  }

  // Called once per game tick: folds the held bits into the trigger bits.
  function poll() {
    const trig = hold & ~prev;
    state = hold | (trig << 8);
    if (trig) state |= TRIG_ANY;
    prev = hold;
    return state;
  }

  function onAnyKey(fn) { listeners.push(fn); }

  return {
    attach, poll, onAnyKey,
    HOLD_U, HOLD_D, HOLD_L, HOLD_R, HOLD_1, HOLD_2, HOLD_RST0, HOLD_RST1,
    TRIG_U, TRIG_D, TRIG_L, TRIG_R, TRIG_1, TRIG_2, TRIG_RST0, TRIG_RST1, TRIG_ANY,
  };
})();
