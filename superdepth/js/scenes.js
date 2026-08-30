// SuperDepth - the framing scenes: the Bio_100% logo, the title screen, the
// score table, the result screen and the ending. Mirrors GameBiologo,
// GameOpening, GameRecord, GameEnding and GameEndCast.

SD.Scenes = (function () {
  const C = SD.C, S = SD.S, SCN = SD.SCN;
  const G = SD.Game.G;

  // ------------------------------------------------------------- Bio_100%
  function biologo() {
    const st = { pausable: false };
    let t = 0;
    st.init = function () { t = 0; SD.Audio.playBGM(SD.BGM.BIO100); };
    st.tick = function () {
      t++;
      if (t > 100 || (SD.Game.key() & SD.Input.TRIG_ANY)) SD.Game.fadeScene(SCN.OPENING);
    };
    st.draw = function (cx) {
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      const a = Math.min(1, t / 25);
      cx.globalAlpha = a;
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 170, 'BIO_100%', 15);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 210, 'PRESENTS', 12);
      cx.globalAlpha = 1;
    };
    return st;
  }

  // ------------------------------------------------------------ title menu
  function opening() {
    const st = { pausable: false };
    let t = 0, sel = 0, demoShips = [];
    const ITEMS = ['GAME START', 'SCORE RANKING', 'SOUND ON/OFF'];
    const MENU_Y = 156, SEA_Y = 306;

    st.init = function () {
      t = 0; sel = 0;
      SD.Audio.playBGM(SD.BGM.OPENNING);
      demoShips = [];
      for (let i = 0; i < 3; i++) {
        demoShips.push({
          x: Math.random() * C.SCREEN_W,
          y: [314, 344, 360][i],
          v: 0.5 + Math.random() * 1.2,
          spr: i === 0 ? S.Yamaboku_DEEP : S.Tiddler,
        });
      }
    };

    st.tick = function () {
      t++;
      const k = SD.Game.key();
      for (const d of demoShips) {
        d.x += d.v;
        if (d.x > C.SCREEN_W + 64) d.x = -64;
      }
      if (k & SD.Input.TRIG_U) { sel = (sel + ITEMS.length - 1) % ITEMS.length; }
      if (k & SD.Input.TRIG_D) { sel = (sel + 1) % ITEMS.length; }
      if (k & (SD.Input.TRIG_1 | SD.Input.TRIG_2)) {
        if (sel === 0) { SD.Game.initGlobal(); SD.Game.gameScene('init'); }
        else if (sel === 1) SD.Game.fadeScene(SCN.RECORD);
        else SD.Audio.setMuted(!SD.Audio.isMuted());
      }
    };

    st.draw = function (cx) {
      cx.fillStyle = '#02060f';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);

      // Sea fills the lower third, with the demo craft drifting through it.
      const g = cx.createLinearGradient(0, SEA_Y, 0, C.SCREEN_H);
      g.addColorStop(0, '#06305a');
      g.addColorStop(1, '#01101f');
      cx.fillStyle = g;
      cx.fillRect(0, SEA_Y, C.SCREEN_W, C.SCREEN_H - SEA_Y);
      SD.Gfx.drawStrip(cx, S.Horizon, 0, SEA_Y - 4, C.SCREEN_W, 6, G.Anim);
      for (const d of demoShips) SD.Gfx.draw(cx, d.spr, d.x, d.y, G.Anim);
      SD.Gfx.drawStrip(cx, S.Bottom1, 0, C.SCREEN_H - 30, C.SCREEN_W, 30, G.Anim);

      // "Super" sits above and left of the "Depth" logo, as in the original.
      const logo = SD.Gfx.images.logo, sup = SD.Gfx.images.super;
      const lx = (C.SCREEN_W - logo.width) / 2, ly = 18;
      cx.drawImage(logo, lx, ly);
      cx.drawImage(sup, lx - 26, ly + 26);

      for (let i = 0; i < ITEMS.length; i++) {
        const on = i === sel;
        const y = MENU_Y + i * 24;
        SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, y, ITEMS[i], on ? 15 : 12);
        if (on && (G.Anim & 4)) {
          // Code 28 is the font's own right-pointing arrow.
          const w = SD.Gfx.textWidth(ITEMS[i]);
          SD.Gfx.drawText(cx, C.SCREEN_W / 2 - w / 2 - 20, y, '\x1c', 2);
        }
      }
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, MENU_Y + 3 * 24,
        SD.Audio.isMuted() ? '[OFF]' : '[ON]', 5);

      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, MENU_Y + 4 * 24 + 4,
        'ARROWS MOVE  Z SHOT  X BOMB', 12);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, MENU_Y + 5 * 24 + 4,
        'ORIGINAL GAME BY BIO_100%', 12);
    };
    return st;
  }

  // ----------------------------------------------------------- score table
  const RANK_KEY = 'superdepth.ranking.v1';

  function loadRanking() {
    try {
      const j = JSON.parse(localStorage.getItem(RANK_KEY) || '[]');
      if (Array.isArray(j)) return j;
    } catch (e) { /* storage may be unavailable */ }
    return [];
  }
  function saveRanking(list) {
    try { localStorage.setItem(RANK_KEY, JSON.stringify(list.slice(0, 10))); }
    catch (e) { /* ignore */ }
  }
  function defaultRanking() {
    const d = [];
    for (let i = 0; i < 10; i++) d.push({ name: 'BIO', score: 50000 - i * 4000, stage: 12 - i });
    return d;
  }
  function ranking() {
    const r = loadRanking();
    return r.length ? r : defaultRanking();
  }
  function submit(score, stage) {
    const r = ranking().slice();
    r.push({ name: 'YOU', score: score, stage: stage });
    r.sort((a, b) => b.score - a.score);
    saveRanking(r);
    return r.findIndex((e) => e.score === score && e.name === 'YOU');
  }

  function record() {
    const st = { pausable: false };
    let t = 0, list = [];
    st.init = function () { t = 0; list = ranking(); SD.Audio.playBGM(SD.BGM.NAMEINN); };
    st.tick = function () {
      t++;
      if (t > 20 && (SD.Game.key() & (SD.Input.TRIG_1 | SD.Input.TRIG_2 | SD.Input.TRIG_RST0))) {
        SD.Game.fadeScene(SCN.OPENING);
      }
    };
    st.draw = function (cx) {
      cx.fillStyle = '#01040c';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 30, 'SUPER DEPTH', 5);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 56, 'TOP SCORE RANKING', 12);
      SD.Gfx.drawText(cx, 40, 86, 'RANK', 6);
      SD.Gfx.drawText(cx, 160, 86, 'SCORE', 6);
      SD.Gfx.drawText(cx, 336, 86, '\x17\x18\x19\x1a', 6);
      SD.Gfx.drawText(cx, 448, 86, 'NAME', 6);
      for (let i = 0; i < Math.min(10, list.length); i++) {
        const e = list[i];
        const y = 112 + i * 22;
        const col = i === 0 ? 15 : (i < 3 ? 14 : 12);
        SD.Gfx.drawText(cx, 40, y, String(i + 1).padStart(2, ' ') + ordinal(i + 1), col);
        SD.Gfx.drawText(cx, 160, y, SD.Game.pad(e.score, 8), col);
        SD.Gfx.drawText(cx, 352, y, SD.Game.pad(e.stage, 2), col);
        SD.Gfx.drawText(cx, 448, y, e.name.slice(0, 3), col);
      }
      if (G.Anim & 8) SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 356, 'PUSH Z', 4);
    };
    return st;
  }

  // Ordinal suffixes use the font's own glyphs (codes 16..19 = st/nd/rd/th).
  function ordinal(n) {
    if (n === 1) return '\x10';
    if (n === 2) return '\x11';
    if (n === 3) return '\x12';
    return '\x13';
  }

  // ------------------------------------------------------------- result
  function result() {
    const st = { pausable: false };
    let t = 0, place = -1;
    st.init = function () {
      t = 0;
      place = submit(G.Score, G.Stage);
      if (G.Score > G.hiscore) G.hiscore = G.Score;
      SD.Audio.playBGM(SD.BGM.GAMEOVER);
    };
    st.tick = function () {
      t++;
      if (t > 60 && (SD.Game.key() & (SD.Input.TRIG_1 | SD.Input.TRIG_2))) SD.Game.fadeScene(SCN.RECORD);
      if (t > 400) SD.Game.fadeScene(SCN.RECORD);
    };
    st.draw = function (cx) {
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 110, 'GAME OVER', 2);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 170, 'SCORE ' + SD.Game.pad(G.Score, 8), 15);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 200, '\x17\x18\x19\x1a' + SD.Game.pad(G.Stage, 2), 6);
      if (place >= 0 && place < 10) {
        SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 240,
          'RANKED ' + (place + 1) + ordinal(place + 1), 4);
      }
      if (t > 60 && (G.Anim & 8)) SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 320, 'PUSH Z', 12);
    };
    return st;
  }

  // -------------------------------------------------------------- ending
  function ending() {
    const st = { pausable: false };
    let t = 0;
    st.init = function () { t = 0; SD.Audio.playBGM(SD.BGM.ENDING); };
    st.tick = function () {
      t++;
      if (t > 520 || (SD.Game.key() & SD.Input.TRIG_1)) SD.Game.fadeScene(SCN.ENDCAST);
    };
    st.draw = function (cx) {
      cx.fillStyle = '#00030a';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      for (let i = 0; i < 70; i++) {
        const x = (i * 97 + 13) % C.SCREEN_W, y = (i * 53 + 29) % C.SCREEN_H;
        cx.fillStyle = (i + G.Myu8) % 5 ? '#334' : '#99a';
        cx.fillRect(x, y, 1, 1);
      }
      // The ship sails away past the Earth.
      const ey = 150 + Math.sin(t * 0.01) * 6;
      SD.Gfx.draw(cx, S.Earth, C.SCREEN_W / 2, ey, G.Anim);
      const sx = 80 + t * 0.8;
      SD.Gfx.draw(cx, S.Yamaboku_DEEP, sx, 300, G.Anim);
      if (t > 60) SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 40, 'MISSION COMPLETE', 4);
      if (t > 140) SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 344, 'THE EARTH IS SAVED', 12);
    };
    return st;
  }

  function endcast() {
    const st = { pausable: false };
    let t = 0;
    const LINES = [
      'SUPER DEPTH', '', 'ORIGINAL GAME BY', 'BIO_100%', '',
      'HTML5 / CANVAS PORT', 'REBUILT FROM THE ORIGINAL', 'FLASH RESOURCES', '',
      'THANK YOU FOR PLAYING',
    ];
    st.init = function () { t = 0; SD.Audio.playBGM(SD.BGM.ENDING); };
    st.tick = function () {
      t++;
      if (t > 60 * 14 || (SD.Game.key() & SD.Input.TRIG_1)) {
        SD.Game.initGlobal();
        SD.Game.fadeScene(SCN.OPENING);
      }
    };
    st.draw = function (cx) {
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      const top = C.SCREEN_H - t * 0.55;
      for (let i = 0; i < LINES.length; i++) {
        const y = top + i * 30;
        if (y < -30 || y > C.SCREEN_H) continue;
        SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, y, LINES[i], i === 0 ? 15 : 12);
      }
    };
    return st;
  }

  function blackout() {
    const st = { pausable: false };
    let t = 0;
    st.init = function () { t = 0; };
    st.tick = function () { if (++t > 30) SD.Game.changeScene(SCN.OPENING); };
    st.draw = function (cx) { cx.fillStyle = '#000'; cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H); };
    return st;
  }

  function registerAll(register) {
    register(SCN.BIOLOGO, biologo());
    register(SCN.OPENING, opening());
    register(SCN.RECORD, record());
    register(SCN.RESULT, result());
    register(SCN.NAMEIN, result());
    register(SCN.ENDING, ending());
    register(SCN.ENDCAST, endcast());
    register(SCN.BLACKOUT, blackout());
  }

  return { registerAll };
})();
