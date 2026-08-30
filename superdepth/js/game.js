// SuperDepth - engine core: global state, the scene state machine, the fixed
// 30fps clock and the shared HUD. Mirrors jp.bio100.flash.superdepth.GameScreen
// and GameInstance.

SD.Game = (function () {
  const C = SD.C, SCN = SD.SCN;

  // ------------------------------------------------------------- global state
  // The GameInstance statics that the port actually reads. X/Y/Vmax stay as
  // 16-slot arrays because the original indexes entities that way, with slot 0
  // being the player; the stages keep their own pools for everything else.
  const G = {
    Anim: 0, Myu2: 0, Myu3: 0, Myu4: 0, Myu8: 0,

    Score: 0, Ship: 3, Init_ship: 3, Disp_ship: 2,
    Stage: 1, Past_stage: 1, Init_stage: 1, Stage_mode: 1,

    Mypower: 0, My3way: 0, Mybomb: C.INIT_BOMB,
    Boss_dead: 0, paused: false,

    X: [], Y: [], Vmax: [],

    Info_type: -1, Info_lefttime: 0,
    hiscore: 50000,
  };

  function resetPools() {
    for (let i = 0; i < C.N_ENEMY; i++) { G.X[i] = 0; G.Y[i] = 0; G.Vmax[i] = 0; }
  }

  // GameInstance.init_global
  function initGlobal() {
    resetPools();
    G.Stage = G.Init_stage = G.Past_stage = 1;
    G.Ship = G.Init_ship = 3;
    G.Disp_ship = G.Ship - 1;
    G.Vmax[0] = C.INIT_SPEED;
    G.Mybomb = C.INIT_BOMB;
    G.Mypower = 0; G.My3way = 0;
    G.Boss_dead = 0;
    G.Score = 0;
  }

  // GameInstance.game_scene - advances Stage and picks the scene for it.
  // Stage_mode cycles 1..4 = DEEP, SKY, SPACE, BOSS; Stage runs 1..12.
  function gameScene(mode) {
    if (mode === 'init') {
      // A fresh game starts *on* Init_stage. Only the SWF's debug branch
      // rewrote the stage here and fell through to the increment below.
      G.Ship = G.Init_ship;
      G.Disp_ship = G.Ship - 1;
      G.Stage = G.Past_stage = G.Init_stage;
      G.Score = 0;
    } else {
      G.Past_stage = G.Stage;
      if (mode === 'next') {
        G.Stage++;
        if (G.Stage > 12) { changeScene(SCN.ENDING); return; }
      }
    }
    G.Stage_mode = ((G.Stage - 1) % 4) + 1;

    if (mode === 'dead' && G.Ship === 0) { fadeScene(SCN.RESULT); return; }

    fadeScene([0, SCN.DEEP, SCN.SKY, SCN.SPACE, SCN.BOSS][G.Stage_mode]);
  }

  // ---------------------------------------------------------- scene machine
  const scenes = {};           // scene id -> {init, tick, draw}
  let current = -1, currentObj = null;
  let fadeTo = -1, fadeCount = 0;
  const FADE_LEN = 16;

  function register(id, obj) { scenes[id] = obj; }

  function changeScene(id) {
    current = id;
    currentObj = scenes[id] || null;
    fadeTo = -1;
    fadeCount = FADE_LEN;          // fade in
    if (currentObj && currentObj.init) currentObj.init();
  }

  function fadeScene(id) {
    if (fadeTo >= 0) return;
    fadeTo = id;
    fadeCount = 0;
  }

  function sceneId() { return current; }

  // ------------------------------------------------------------ presentation
  let canvas, cx;
  let keyState = 0;

  function key() { return keyState; }

  function pad(n, w) {
    let s = String(Math.max(0, Math.floor(n)));
    while (s.length < w) s = '0' + s;
    return s;
  }

  // Centred banner used for READY / CLEAR / GAME OVER etc.
  function drawInfo(text, colIdx) {
    SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, C.SCREEN_H / 2 - 8, text, colIdx === undefined ? 15 : colIdx);
  }

  // ----------------------------------------------------------------- ticking
  function tick() {
    keyState = SD.Input.poll();

    // Global pause (Esc / P), only while a stage is running.
    if ((keyState & SD.Input.TRIG_RST0) && currentObj && currentObj.pausable) {
      G.paused = !G.paused;
      if (G.paused) SD.Audio.pauseBGM(); else SD.Audio.resumeBGM();
    }
    if (G.paused) return;

    if (fadeTo >= 0) {
      fadeCount++;
      if (fadeCount >= FADE_LEN) { const t = fadeTo; fadeTo = -1; changeScene(t); }
      return;
    }
    if (fadeCount > 0) fadeCount--;

    if (currentObj && currentObj.tick) currentObj.tick();

    // GameInstance.tickframe animation counters.
    G.Anim++;
    G.Myu2 ^= 1;
    if (++G.Myu3 > 2) G.Myu3 = 0;
    if (++G.Myu4 > 3) G.Myu4 = 0;
    if (++G.Myu8 > 7) G.Myu8 = 0;
    SD.Gfx.tickPalette(G.Myu2, G.Myu4, G.Myu8);
  }

  function draw() {
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
    if (currentObj && currentObj.draw) currentObj.draw(cx);

    // Fade to / from black between scenes.
    let a = 0;
    if (fadeTo >= 0) a = fadeCount / FADE_LEN;
    else if (fadeCount > 0) a = fadeCount / FADE_LEN;
    if (a > 0) {
      cx.fillStyle = 'rgba(0,0,0,' + Math.min(1, a) + ')';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
    }

    if (G.paused) {
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, C.SCREEN_H / 2 - 8, 'PAUSE', 15);
    }
  }

  // -------------------------------------------------------------- main clock
  const STEP = 1000 / C.FPS;
  let acc = 0, last = 0;

  function frame(t) {
    if (!last) last = t;
    acc += t - last;
    last = t;
    if (acc > STEP * 5) acc = STEP * 5;     // don't spiral after a stall
    let ran = false;
    while (acc >= STEP) { tick(); acc -= STEP; ran = true; }
    if (ran) draw();
    requestAnimationFrame(frame);
  }

  async function boot() {
    canvas = document.getElementById('screen');
    canvas.width = C.SCREEN_W; canvas.height = C.SCREEN_H;
    cx = canvas.getContext('2d');
    cx.imageSmoothingEnabled = false;

    const status = document.getElementById('status');
    status.textContent = 'LOADING GRAPHICS...';
    await SD.Gfx.load();
    SD.Audio.init();
    SD.Input.attach(document.body);
    SD.Input.onAnyKey(() => SD.Audio.unlock());
    document.body.addEventListener('pointerdown', () => SD.Audio.unlock());

    SD.Scenes.registerAll(register);
    SD.Stages.registerAll(register);

    status.remove();
    initGlobal();
    changeScene(SCN.BIOLOGO);
    requestAnimationFrame(frame);
  }

  return {
    G, boot, register, changeScene, fadeScene, gameScene, sceneId,
    initGlobal, resetPools, drawInfo, pad, key,
    get cx() { return cx; },
  };
})();
