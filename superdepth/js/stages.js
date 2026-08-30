// SuperDepth - the playable stages.
//
// One parameterised implementation covers DEEP, SKY and SPACE: they differ in
// which way the player fires, which enemies show up and what the backdrop is.
// The pool sizes, playfield bounds, speeds, the item roulette and the stage
// clear quota are the values recovered from the bytecode (see data.js).

SD.Stages = (function () {
  const C = SD.C, S = SD.S, SCN = SD.SCN;
  const G = SD.Game.G;

  // Screen bands: a 16px border row, the playfield, another border row, then a
  // two-line status strip. The font is 16x16 pixel art, so text is only ever
  // drawn at scale 1 or 0.5 - anything else lands between pixels and smears.
  const FIELD_TOP = 16;
  const FIELD_BOTTOM = 336;
  const HUD_Y1 = 348;
  const HUD_Y2 = 372;

  // The sea only fills the lower part of the DEEP field; above the water line
  // is open sky, with the destroyer riding the surface between them.
  const SKY_H = 48;
  const WATER_Y = FIELD_TOP + SKY_H;
  const DEEP_SHIP_Y = WATER_Y - 16;

  // The magazine: at most AMMO_MAX charges may be in the water at once and a
  // slot only frees up once its charge has left the screen (or hit something).
  const AMMO_CAP = 8;

  // Release points: half a hull ahead of / behind the ship's centre.
  const BOW = 22;
  // A charge sinks slowly enough to watch it fall past a target.
  const SHOT_V = 3.6;

  // Radar panel: rader.png is the bezel, 160x48, and the blips are plotted
  // inside its 2px frame.
  const RADAR_X = 240, RADAR_Y = 346, RADAR_W = 160, RADAR_H = 48;
  const RADAR_PAD = 3;

  // --------------------------------------------------------------- entities
  // Fixed-size pools: 16 enemy slots, one shot slot per magazine round and
  // 8 enemy missiles.
  const shots = [];      // {on,x,y,vx,vy,pow}
  const emis = [];       // {on,x,y,vx,vy}
  const enemies = [];    // {on,kind,x,y,vx,vy,hp,type,t,fire}
  const blasts = [];     // {on,x,y,t,big}
  let item = null;       // {mode,x,y,vx,vy,t}

  function initPools() {
    shots.length = 0; emis.length = 0;
    enemies.length = 0; blasts.length = 0;
    for (let i = 0; i < AMMO_CAP; i++) shots.push({ on: 0 });
    for (let i = 0; i < C.N_MISSILE; i++) emis.push({ on: 0 });
    for (let i = 0; i < C.N_ENEMY; i++) enemies.push({ on: 0 });
    for (let i = 0; i < 24; i++) blasts.push({ on: 0 });
    item = null;
  }

  function free(pool) { for (let i = 0; i < pool.length; i++) if (!pool[i].on) return pool[i]; return null; }

  // Charges in the magazine. The stock is not spent-and-refilled on a timer:
  // a charge occupies its slot until it leaves the screen or blows up, which
  // is what makes holding fire pointless and spacing the shots matter.
  function ammoLeft() {
    let n = 0;
    for (const s of shots) if (s.on) n++;
    return Math.max(0, G.Mybomb - n);
  }

  // Border rows plus the two-line status strip, shared by every stage.
  // `rest` is the remaining stage quota, or -1 to show a boss bar instead.
  function drawChromeCommon(cx, rest, bossFrac, live) {
    // Top rail: the frame tiles, the remaining-charge icons in the middle and
    // the stage / quota readout tucked into the corners at half size.
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, C.SCREEN_W, FIELD_TOP);
    for (let x = 0; x < C.SCREEN_W; x += 16) {
      SD.Gfx.drawAt(cx, S.WakuUM, x, 0, G.Anim);
      SD.Gfx.drawAt(cx, S.WakuBM, x, FIELD_BOTTOM, G.Anim);
    }
    SD.Gfx.drawText(cx, 8, 4, '' + SD.Game.pad(G.Stage, 2), 6, 0.5);
    if (bossFrac === undefined) {
      SD.Gfx.drawText(cx, 568, 4, 'REST' + SD.Game.pad(rest, 3), rest > 0 ? 15 : 4, 0.5);
    }
    drawAmmo(cx);

    // Status strip: SCORE on the left, the radar in the middle, ships left on
    // the right - the arrangement of the arcade original.
    cx.fillStyle = '#a8a8a8';
    cx.fillRect(0, FIELD_BOTTOM + 16, C.SCREEN_W, C.SCREEN_H - FIELD_BOTTOM - 16);

    SD.Gfx.drawText(cx, 24, HUD_Y1, 'Score', 2);
    SD.Gfx.drawText(cx, 16, HUD_Y2, SD.Game.pad(G.Score, 6), 15);

    if (bossFrac !== undefined) {
      SD.Gfx.drawText(cx, 464, HUD_Y1, 'Boss', 2);
      cx.fillStyle = '#300';
      cx.fillRect(464, HUD_Y2 + 4, 152, 10);
      cx.fillStyle = SD.Gfx.palCss(2);
      cx.fillRect(464, HUD_Y2 + 4, 152 * Math.max(0, bossFrac), 10);
    } else {
      SD.Gfx.drawText(cx, 496, HUD_Y1, 'Left', 2);
      SD.Gfx.drawText(cx, 504, HUD_Y2, SD.Game.pad(G.Disp_ship, 2), 15);
    }

    drawRadar(cx, live);
  }

  // Remaining charges, drawn with the charge sprite itself; spent slots stay in
  // place as ghosts so the magazine reads at a glance.
  function drawAmmo(cx) {
    const max = Math.max(1, G.Mybomb);
    const spr = G.Mypower ? S.Bomb_Red_M : S.Bomb_Blu_M;
    const x0 = C.SCREEN_W / 2 - (max - 1) * 9;
    for (let i = 0; i < max; i++) {
      const lit = i < ammoLeft();
      SD.Gfx.draw(cx, spr, x0 + i * 18, 8, 0, lit ? 1 : 0.22);
    }
  }

  // Mini map of the playfield: player white, enemies amber, charges red.
  // The bezel is the SWF's own rader.png, laid over a black screen.
  function drawRadar(cx, live) {
    cx.fillStyle = '#000';
    cx.fillRect(RADAR_X, RADAR_Y, RADAR_W, RADAR_H);
    if (live) plotBlips(cx, live);
    SD.Gfx.drawAt(cx, S.Rader, RADAR_X, RADAR_Y, G.Anim);
  }

  function plotBlips(cx, live) {
    const iw = RADAR_W - RADAR_PAD * 2, ih = RADAR_H - RADAR_PAD * 2;
    const sx = iw / C.SCREEN_W, sy = ih / (FIELD_BOTTOM - FIELD_TOP);
    const blip = (x, y, col, w) => {
      const px = RADAR_X + RADAR_PAD + x * sx, py = RADAR_Y + RADAR_PAD + (y - FIELD_TOP) * sy;
      if (px < RADAR_X + RADAR_PAD || px > RADAR_X + RADAR_W - RADAR_PAD) return;
      cx.fillStyle = col;
      cx.fillRect(px - w / 2, py - w / 2, w, w);
    };
    for (const e of live.enemies) if (e.on) blip(e.x, e.y, '#ffcc00', 5);
    for (const s of live.shots) if (s.on) blip(s.x, s.y, '#ff4040', 3);
    for (const m of live.emis) if (m.on) blip(m.x, m.y, '#ff4040', 3);
    blip(G.X[0], G.Y[0], '#ffffff', 5);
  }

  // ------------------------------------------------------------ stage tables
  // Enemy rosters, taken from the sprite constants each stage class references.
  // pts indexes SD.SCORE_PTS[Stage_mode].
  const ROSTER = {
    deep: [
      { spr: S.Tiddler,   hp: 1, pts: 1, sp: 1.4, pat: 'straight', fire: 90 },
      { spr: S.Asthmatic, hp: 2, pts: 2, sp: 1.0, pat: 'wave',     fire: 70 },
      { spr: S.Coypu,     hp: 1, pts: 3, sp: 2.0, pat: 'wave',     fire: 110 },
      { spr: S.Mine,      hp: 1, pts: 1, sp: 0,   pat: 'rise',     fire: 0, life: 420 },
    ],
    sky: [
      { spr: S.Eyewash_M,  hp: 1, pts: 1, sp: 1.8, pat: 'straight', fire: 85 },
      { spr: S.Spooky,     hp: 2, pts: 2, sp: 1.2, pat: 'wave',     fire: 70 },
      { spr: S.Fratricide, hp: 2, pts: 3, sp: 1.5, pat: 'seek',     fire: 60 },
      { spr: S.Scourge,    hp: 3, pts: 4, sp: 1.0, pat: 'wave',     fire: 50 },
    ],
    space: [
      { spr: S.Poppy,    hp: 1, pts: 1, sp: 2.2, pat: 'straight', fire: 95 },
      { spr: S.Mean,     hp: 2, pts: 2, sp: 1.6, pat: 'wave',     fire: 65 },
      { spr: S.Chirstie, hp: 2, pts: 3, sp: 1.3, pat: 'seek',     fire: 55 },
      { spr: S.Rob,      hp: 4, pts: 4, sp: 1.0, pat: 'wave',     fire: 45 },
    ],
  };

  // The item carrier - Hoot, the same pod on every stage. It bobs up and down
  // across the field from stage 1 on and always leaves an item behind, so it
  // is the only source of power-ups.
  const CARRIER = { spr: S.Hoot, hp: 3, pts: 4, sp: 0.9, pat: 'wave', fire: 65, carry: 1 };
  const CARRIER_ODDS = 0.16;

  // Each stage hands off to its interlude on clear (GameDeep -> GameDeep2Sky
  // -> GameSky, and so on).
  const INTERLUDE = { deep: SCN.DEEP2SKY, sky: SCN.SKY2SPACE, space: SCN.SPACE2BOSS };

  // --------------------------------------------------------------- the stage
  // kind: 'deep' (fire downward from the top) | 'sky' | 'space' (fire upward)
  function makeStage(kind, sceneId, bgmId) {
    const down = (kind === 'deep');
    const playerSpr = down ? S.Yamaboku_DEEP : (kind === 'sky' ? S.Yamaboku_SKY : S.Yamaboku_SPACE);
    const roster = ROSTER[kind];
    // DEEP and SKY are steered left / right only. SPACE flips it: the ship
    // holds station in the middle of the screen and climbs or dives, while
    // left / right pans the whole field past it.
    const panning = (kind === 'space');
    // The sprite Z used to fire is now the enemy's round; SKY drops the small
    // 8px charge instead.
    const ENEMY_SHOT = (kind === 'sky') ? S.Bomb : S.Bullet1;

    const st = {
      pausable: true,
      phase: 0,          // 0 ready, 1 playing, 2 clear, 3 dying, 4 over
      timer: 0,
      kills: 0,
      norma: 20,
      spawnT: 0,
      fireCool: 0,
      altCool: 0,
      flash: 0,
      invuln: 0,
      scroll: 0,
      pan: 0,
      stars: [],
    };

    st.init = function () {
      // Speed upgrades carry across stages; only losing a ship resets them.
      const spd = G.Vmax[0] || C.INIT_SPEED;
      initPools();
      SD.Game.resetPools();
      G.X[0] = C.SCREEN_W / 2;
      G.Y[0] = down ? DEEP_SHIP_Y : C.SHIP_SKY_Y;
      G.Vmax[0] = spd;
      G.Disp_ship = G.Ship - 1;
      G.Boss_dead = 0;

      // GameDeep.init: clear_norma = 15 + floor(Stage/4)*5 + (Mypower & My3way)*10
      st.norma = 15 + Math.floor(G.Stage / 4) * 5 + (G.Mypower & G.My3way) * 10;
      st.kills = 0;
      st.phase = 0;
      st.timer = 0;
      st.spawnT = 30;
      st.invuln = 60;
      st.flash = 0;
      st.scroll = 0;

      st.stars = [];
      if (kind === 'space') {
        for (let i = 0; i < 60; i++) {
          st.stars.push({
            x: Math.random() * C.SCREEN_W,
            y: FIELD_TOP + Math.random() * (FIELD_BOTTOM - FIELD_TOP),
            v: 0.4 + Math.random() * 1.8,
            c: 9 + ((Math.random() * 7) | 0),
          });
        }
      }
      SD.Audio.playBGM(bgmId);
    };

    // ------------------------------------------------------------- updating
    st.tick = function () {
      const k = SD.Game.key();
      st.timer++;
      st.scroll += down ? 1 : -1;

      for (const s of st.stars) {
        s.y += down ? s.v : -s.v;
        if (s.y > FIELD_BOTTOM) s.y = FIELD_TOP;
        if (s.y < FIELD_TOP) s.y = FIELD_BOTTOM;
      }

      if (st.phase === 0) {                       // READY - already steerable
        movePlayer(k);
        panWorld(st.pan);
        firing(k);
        updateShots();
        if (st.timer > 45) { st.phase = 1; st.timer = 0; }
        return;
      }
      if (st.phase === 2) {                       // STAGE CLEAR
        updateBlasts();
        // Hand off to the interlude, which advances the stage counter.
        if (st.timer > 90) SD.Game.changeScene(INTERLUDE[kind]);
        return;
      }
      if (st.phase === 3) {                       // player destroyed
        updateBlasts(); updateEnemies(); updateShots(); updateMissiles();
        if (st.timer > 70) {
          if (G.Ship <= 0) { st.phase = 4; st.timer = 0; SD.Audio.playBGM(SD.BGM.GAMEOVER); }
          else { respawn(); }
        }
        return;
      }
      if (st.phase === 4) {                       // GAME OVER
        updateBlasts();
        if (st.timer > 150 || (k & SD.Input.TRIG_1)) SD.Game.fadeScene(SCN.RESULT);
        return;
      }

      movePlayer(k);
      panWorld(st.pan);
      firing(k);
      updateShots();
      updateMissiles();
      updateEnemies();
      updateItem();
      updateBlasts();
      spawning();
      collisions();

      if (st.kills >= st.norma && st.phase === 1) {
        st.phase = 2; st.timer = 0;
        SD.Audio.playSE(SD.SE.ITEM);
      }
      if (st.invuln > 0) st.invuln--;
      if (st.flash > 0) st.flash--;
    };

    function respawn() {
      st.phase = 1; st.timer = 0;
      st.invuln = 90;
      G.X[0] = C.SCREEN_W / 2;
      G.Y[0] = down ? DEEP_SHIP_Y : C.SHIP_SKY_Y;
      // Losing a ship costs the upgrades, as in the original.
      G.Mypower = 0; G.My3way = 0;
      G.Vmax[0] = C.INIT_SPEED;
      G.Mybomb = C.INIT_BOMB;
      for (const e of emis) e.on = 0;
    }

    function movePlayer(k) {
      const v = G.Vmax[0];
      let dx = 0;
      if (k & SD.Input.HOLD_L) dx -= v;
      if (k & SD.Input.HOLD_R) dx += v;

      if (panning) {
        // SPACE: the ship is pinned horizontally and only climbs or dives.
        // Left / right scrolls the field the other way instead.
        G.X[0] = C.SCREEN_W / 2;
        st.pan = -dx;
        let dy = 0;
        if (k & SD.Input.HOLD_U) dy -= v;
        if (k & SD.Input.HOLD_D) dy += v;
        G.Y[0] = Math.max(FIELD_TOP + 24, Math.min(FIELD_BOTTOM - 24, G.Y[0] + dy));
        return;
      }

      // DEEP / SKY: left and right only, no vertical give at all.
      st.pan = 0;
      G.X[0] += dx;
      const half = 32;
      if (G.X[0] < C.WX_MIN + half) G.X[0] = C.WX_MIN + half;
      if (G.X[0] > C.WX_MAX - half) G.X[0] = C.WX_MAX - half;
    }

    // Slides everything that lives in the world - not the ship - by `dx`.
    // The starfield gets half the throw so it reads as distance.
    function panWorld(dx) {
      if (!dx) return;
      for (const e of enemies) if (e.on) e.x += dx;
      for (const m of emis) if (m.on) m.x += dx;
      for (const sh of shots) if (sh.on) sh.x += dx;
      if (item) item.x += dx;
      const W = C.SCREEN_W;
      for (const s of st.stars) s.x = ((s.x + dx * 0.5) % W + W) % W;
    }

    function firing(k) {
      if (st.fireCool > 0) st.fireCool--;
      if (st.altCool > 0) st.altCool--;

      // Z drops from the stern, X from the bow. Same charge, same magazine -
      // only the release point differs, which is how you straddle a target.
      if ((k & SD.Input.HOLD_1) && st.fireCool === 0 && volley(-BOW)) {
        st.fireCool = G.Mypower ? 4 : 6;
      }
      if ((k & SD.Input.HOLD_2) && st.altCool === 0 && volley(BOW)) {
        st.altCool = G.Mypower ? 4 : 6;
      }
    }

    // Releases one charge (three with 3-WAY) if the magazine can pay for it.
    function volley(off) {
      const need = G.My3way ? 3 : 1;
      if (ammoLeft() < need) return false;
      const dir = down ? 1 : -1;
      const sx = G.X[0] + off, sy = G.Y[0] + dir * 18;
      shoot(sx, sy, 0, dir * SHOT_V);
      if (G.My3way) {
        shoot(sx, sy, -1.2, dir * SHOT_V * 0.93);
        shoot(sx, sy, 1.2, dir * SHOT_V * 0.93);
      }
      SD.Audio.playSE(SD.SE.FIRE);
      return true;
    }

    function shoot(x, y, vx, vy) {
      const s = free(shots);
      if (!s) return;
      s.on = 1; s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.pow = G.Mypower ? 2 : 1;
    }

    function updateShots() {
      for (const s of shots) {
        if (!s.on) continue;
        s.x += s.vx; s.y += s.vy;
        if (s.y < FIELD_TOP - 8 || s.y > FIELD_BOTTOM + 8 || s.x < 0 || s.x > C.SCREEN_W) s.on = 0;
      }
    }

    function updateMissiles() {
      for (const m of emis) {
        if (!m.on) continue;
        m.x += m.vx; m.y += m.vy;
        if (m.y < FIELD_TOP - 16 || m.y > FIELD_BOTTOM + 16) m.on = 0;
      }
    }

    // ------------------------------------------------------------- spawning
    function spawning() {
      if (st.kills >= st.norma) return;
      if (--st.spawnT > 0) return;
      // Later stages send them faster and in greater numbers.
      const heat = Math.min(1.6, 0.6 + G.Stage * 0.09);
      st.spawnT = Math.max(14, Math.floor(52 / heat));

      const e = free(enemies);
      if (!e) return;
      const maxType = Math.min(roster.length - 1, 1 + Math.floor(G.Stage / 2));
      const carrier = Math.random() < CARRIER_ODDS;
      const t = carrier ? -1 : (Math.random() * (maxType + 1)) | 0;
      const def = carrier ? CARRIER : roster[t];
      const sz = SD.Gfx.sizeOf(def.spr);

      e.on = 1;
      e.def = def;
      e.spr = def.spr;
      e.hp = def.hp + Math.floor(G.Stage / 5);
      e.type = t;
      e.w = sz.w; e.h = sz.h;
      e.t = 0;
      e.phase = Math.random() * Math.PI * 2;
      e.fire = def.fire ? (def.fire + (Math.random() * 40 | 0)) : 0;

      // Enemies enter from the far end of the field and work toward the player.
      if (def.pat === 'rise') {
        // Mines are released inside the field and climb; they never cross it.
        e.x = C.WX_MIN + 32 + Math.random() * (C.WX_MAX - C.WX_MIN - 64);
        e.vx = 0;
        e.y = FIELD_BOTTOM - 24;
        e.vy = -1;                // ~8s to surface, then it sits there

        e.life = def.life;
        e.baseY = e.y;
        return;
      }

      const fromLeft = Math.random() < 0.5;
      e.x = fromLeft ? C.WX_MIN - sz.w : C.WX_MAX + sz.w;
      e.vx = (fromLeft ? 1 : -1) * def.sp * (0.8 + Math.random() * 0.6);
      const band = FIELD_BOTTOM - FIELD_TOP - 96;
      // In DEEP everything stays under the water line.
      e.y = down
        ? WATER_Y + 32 + Math.random() * (FIELD_BOTTOM - WATER_Y - 64)
        : FIELD_TOP + 24 + Math.random() * band * 0.8;
      e.vy = 0;
      e.life = undefined;
      e.baseY = e.y;
    }

    function updateEnemies() {
      for (const e of enemies) {
        if (!e.on) continue;
        e.t++;
        // Anything with a life span retires on its own timer.
        if (e.life !== undefined && --e.life <= 0) { e.on = 0; continue; }
        switch (e.def.pat) {
          case 'wave':
            e.y = e.baseY + Math.sin(e.t * 0.06 + e.phase) * 26;
            break;
          case 'seek': {
            const d = G.X[0] - e.x;
            e.vx += Math.sign(d) * 0.035;
            e.vx = Math.max(-3.2, Math.min(3.2, e.vx));
            e.y = e.baseY + Math.sin(e.t * 0.04 + e.phase) * 14;
            break;
          }
          case 'rise': {
            // Climbs slowly, then sits just under the surface until it expires.
            const ceiling = (down ? WATER_Y : FIELD_TOP) + 14;
            e.y = Math.max(ceiling, e.y + e.vy);
            break;
          }
          default:
            break;
        }
        e.x += e.vx;

        // Wrap out of the field.
        if (e.x < C.WX_MIN - e.w - 40 || e.x > C.WX_MAX + e.w + 40) { e.on = 0; continue; }

        if (e.fire > 0 && --e.fire <= 0) {
          enemyFire(e);
          e.fire = e.def.fire + (Math.random() * 60 | 0);
        }
      }
    }

    function enemyFire(e) {
      if (st.phase !== 1) return;
      const m = free(emis);
      if (!m) return;
      const dir = down ? -1 : 1;                 // fired back toward the player
      // Mis_pt biases the lateral drift toward straight-on.
      const drift = SD.MIS_PT[(Math.random() * SD.MIS_PT.length) | 0] * 0.5;
      m.on = 1;
      m.x = e.x; m.y = e.y + dir * (e.h / 2);
      m.vx = drift;
      m.vy = dir * (2.4 + Math.min(2.2, G.Stage * 0.15));
      m.spr = ENEMY_SHOT;
    }

    // ----------------------------------------------------------- collisions
    function hit(ax, ay, aw, ah, bx, by, bw, bh) {
      return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
    }

    function collisions() {
      // shots -> enemies
      for (const s of shots) {
        if (!s.on) continue;
        for (const e of enemies) {
          if (!e.on) continue;
          if (hit(s.x, s.y, 8, 8, e.x, e.y, e.w * 0.8, e.h * 0.8)) {
            s.on = 0;
            damage(e, s.pow);
            break;
          }
        }
      }
      if (st.invuln > 0 || st.phase !== 1) return;

      const px = G.X[0], py = G.Y[0];
      for (const m of emis) {
        if (m.on && hit(m.x, m.y, 10, 10, px, py, 44, 20)) { m.on = 0; playerHit(); return; }
      }
      for (const e of enemies) {
        if (e.on && hit(e.x, e.y, e.w * 0.7, e.h * 0.7, px, py, 44, 20)) { damage(e, 99); playerHit(); return; }
      }
      if (item && hit(item.x, item.y, 16, 16, px, py, 56, 26)) {
        const mode = item.mode;
        item = null;             // cleared first: a flash bomb may drop a new one
        effectItem(mode);
      }
    }

    function damage(e, dmg) {
      e.hp -= dmg;
      if (e.hp > 0) { SD.Audio.playSE(SD.SE.HIT); return; }
      e.on = 0;
      st.kills++;
      const row = SD.SCORE_PTS[G.Stage_mode] || SD.SCORE_PTS[1];
      G.Score += row[e.def.pts] || 100;
      explode(e.x, e.y, e.w > 40);
      SD.Audio.playSE(SD.SE.DEAD);
      // Only the carrier drops, and it always does - a fresh one replaces any
      // item still floating around.
      if (e.def.carry) dropItem(e.x, e.y);
    }

    function playerHit() {
      G.Ship--;
      G.Disp_ship = Math.max(0, G.Ship - 1);
      explode(G.X[0], G.Y[0], true);
      SD.Audio.playSE(SD.SE.DEAD);
      st.phase = 3; st.timer = 0;
    }

    function explode(x, y, big) {
      const b = free(blasts);
      if (!b) return;
      b.on = 1; b.x = x; b.y = y; b.t = 0; b.big = big ? 1 : 0;
      b.spr = (big ? S.ExplosionL_1 : S.ExplosionS_1) + ((Math.random() * 3) | 0);
    }

    function updateBlasts() {
      for (const b of blasts) {
        if (!b.on) continue;
        if (++b.t > 16) b.on = 0;
      }
    }

    // ---------------------------------------------------------------- items
    // GameInstance.select_item, transcribed.
    function selectItem() {
      let m = SD.ITEM_PUT[(Math.random() * 16) | 0];
      if (G.Mypower === 0 && G.My3way === 0 && m === 4) m = 3 + ((Math.random() * 2) | 0) * 2;
      if ((m === 3 || m === 5) && (G.Mypower === 1 || G.My3way === 1)) m = 4;
      if (m === 3 && G.Mypower === 1) m = 5;
      if (m === 5 && G.My3way === 1) m = 3;
      if (G.Ship > 2 && m === 7) m = 4;
      if (G.Vmax[0] < 8 && m !== 6 && m !== 3 && m !== 5) m = 1;
      if (G.Mybomb < AMMO_CAP && m !== 6) m = 2;
      if (G.Vmax[0] < 6 && m !== 6) m = 1;
      return m;
    }

    function dropItem(x, y) {
      item = { mode: selectItem(), x: x, y: y, vy: down ? -1.2 : 1.2, t: 0 };
    }

    function updateItem() {
      if (!item) return;
      item.t++;
      item.y += item.vy;
      // DEEP items float straight up to the surface, SKY items fall straight
      // down; only the drifting SPACE stage lets them wander sideways.
      if (panning) item.x += Math.sin(item.t * 0.05) * 0.8;
      const gone = down ? item.y < WATER_Y - 4 : item.y > FIELD_BOTTOM;
      if (item.t > 600 || gone || item.y < FIELD_TOP) item = null;
    }

    // FLASH BOMB: everything hostile on screen goes at once - every enemy and
    // every round already in the air. Kills score as normal and counts toward
    // the stage quota, so a carrier caught in it still leaves its item.
    function flashBomb() {
      for (const m of emis) m.on = 0;
      for (const e of enemies) if (e.on) damage(e, 999);
      st.flash = 8;
    }

    // GameInstance.effect_item, transcribed.
    function effectItem(m) {
      switch (m) {
        case 1: if (G.Vmax[0] !== 16) G.Vmax[0] += 2; break;
        case 2:
          // Deeper magazine: one more charge may be in the water at a time.
          if (G.Mybomb < AMMO_CAP) G.Mybomb++;
          break;
        case 3: G.Mypower = 1; break;
        case 4: flashBomb(); break;
        case 5:
          G.My3way = 1;
          // 3-WAY spends three rounds a volley, so it comes with the room for them.
          G.Mybomb = Math.min(AMMO_CAP, Math.max(G.Mybomb, 6));
          break;
        case 6:
          G.My3way = 1; G.Mypower = 1; G.Mybomb = AMMO_CAP; G.Vmax[0] = 10;
          break;
        case 7: G.Ship++; G.Disp_ship++; break;
        default: break;
      }
      G.Info_type = m;
      G.Info_lefttime = 40;
      SD.Audio.playSE(SD.SE.ITEM);
    }

    // -------------------------------------------------------------- drawing
    st.draw = function (cx) {
      drawBackdrop(cx);

      for (const s of shots) {
        if (!s.on) continue;
        SD.Gfx.draw(cx, s.pow > 1 ? S.Bomb_Red_M : S.Bomb_Blu_M, s.x, s.y, G.Anim);
      }
      for (const m of emis) {
        if (!m.on) continue;
        SD.Gfx.draw(cx, m.spr, m.x, m.y, G.Anim);
      }
      // The sheets are all drawn facing left, so anything that came in from
      // the left - and is therefore heading right - is mirrored.
      for (const e of enemies) {
        if (!e.on) continue;
        SD.Gfx.draw(cx, e.spr, e.x, e.y, G.Anim, 1, e.vx > 0);
      }
      if (item) {
        const fr = ITEM_FRAME[item.mode];
        SD.Gfx.draw(cx, S.PowerUp_Blu + (item.mode - 1), item.x, item.y,
                    fr === undefined ? G.Anim : fr);
      }

      // Player: blink while invulnerable, hide while exploding.
      if (st.phase !== 3 && st.phase !== 4 && !(st.invuln > 0 && (G.Anim & 2))) {
        SD.Gfx.draw(cx, playerSpr, G.X[0], G.Y[0], G.Anim);
      }

      for (const b of blasts) {
        if (!b.on) continue;
        SD.Gfx.draw(cx, b.spr, b.x, b.y, b.t);
      }

      if (st.flash > 0) {
        cx.fillStyle = 'rgba(255,255,255,' + (st.flash / 10) + ')';
        cx.fillRect(0, FIELD_TOP, C.SCREEN_W, FIELD_BOTTOM - FIELD_TOP);
      }

      drawChrome(cx);

      if (st.phase === 0) SD.Game.drawInfo('READY', 15);
      if (st.phase === 2) SD.Game.drawInfo('STAGE CLEAR', 4);
      if (st.phase === 4) SD.Game.drawInfo('GAME OVER', 2);
      if (G.Info_lefttime > 0) {
        G.Info_lefttime--;
        SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, FIELD_BOTTOM - 48, ITEM_LABEL[G.Info_type] || '', 4);
      }
    };

    const ITEM_LABEL = { 1: 'SPEED UP', 2: 'AMMO UP', 3: 'POWER SHOT', 4: 'FLASH BOMB',
                         5: '3-WAY', 6: 'FULL POWER', 7: '1UP' };

    // Items that hold one cell instead of cycling. POWER SHOT stops switching
    // cells at all; the flash bomb is pinned to its yellow frame rather than
    // blinking orange -> green.
    const ITEM_FRAME = { 3: 0, 4: 1 };

    function drawBackdrop(cx) {
      if (kind === 'deep') {
        // Sky, then a flat body of water with the surface drawn across it.
        cx.fillStyle = '#00c8e8';
        cx.fillRect(0, FIELD_TOP, C.SCREEN_W, SKY_H);
        cx.fillStyle = '#0d1a9c';
        cx.fillRect(0, WATER_Y, C.SCREEN_W, FIELD_BOTTOM - WATER_Y);
        SD.Gfx.drawStrip(cx, S.Horizon, 0, WATER_Y - 3, C.SCREEN_W, 6, G.Anim);
      } else if (kind === 'sky') {
        const g = cx.createLinearGradient(0, FIELD_TOP, 0, FIELD_BOTTOM);
        g.addColorStop(0, '#0d1b47');
        g.addColorStop(0.6, '#2a5c9c');
        g.addColorStop(1, '#8fbfe0');
        cx.fillStyle = g;
        cx.fillRect(0, FIELD_TOP, C.SCREEN_W, FIELD_BOTTOM - FIELD_TOP);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 151 + st.scroll * 0.4) % (C.SCREEN_W + 64)) - 32;
          SD.Gfx.drawAt(cx, S.Cloud, x, FIELD_TOP + 30 + i * 47, G.Anim);
        }
      } else {
        cx.fillStyle = '#04040c';
        cx.fillRect(0, FIELD_TOP, C.SCREEN_W, FIELD_BOTTOM - FIELD_TOP);
        for (const s of st.stars) {
          cx.fillStyle = SD.Gfx.palCss(s.c);
          cx.fillRect(s.x | 0, s.y | 0, 2, 2);
        }
      }
    }

    function drawChrome(cx) {
      drawChromeCommon(cx, Math.max(0, st.norma - st.kills), undefined,
                       { enemies: enemies, shots: shots, emis: emis });
    }

    return st;
  }

  // ------------------------------------------------------------------- boss
  // Stage_mode 4. A single large target with a weak core, escorted by orbiting
  // pods; it fires beams and spreads at the player.
  function makeBoss() {
    const st = { pausable: true };
    let boss, pods, shotsB, timer, phase, invuln, playerY;

    st.init = function () {
      // resetPools() zeroes Vmax, so carry the player's speed over first.
      const spd = G.Vmax[0] || C.INIT_SPEED;
      initPools();
      SD.Game.resetPools();
      G.X[0] = C.SCREEN_W / 2;
      playerY = C.SHIP_SKY_Y;
      G.Y[0] = playerY;
      G.Vmax[0] = spd;
      G.Disp_ship = G.Ship - 1;
      timer = 0; phase = 0; invuln = 60;
      const cycle = Math.floor((G.Stage - 1) / 4);      // 0, 1, 2
      boss = {
        x: C.SCREEN_W / 2, y: FIELD_TOP + 90, vx: 1.6,
        hp: 120 + cycle * 90, hpMax: 120 + cycle * 90,
        spr: [S.Eerie_Core, S.Lunatic_NoddleH, S.BPSM_Body][cycle] || S.Eerie_Core,
        fire: 60, t: 0,
      };
      const sz = SD.Gfx.sizeOf(boss.spr);
      boss.w = sz.w; boss.h = sz.h;
      pods = [];
      for (let i = 0; i < 3 + cycle; i++) {
        pods.push({ on: 1, a: (i / (3 + cycle)) * Math.PI * 2, r: 120 + i * 14,
                    hp: 8 + cycle * 4, spr: S.Lunatic_Noddle1 + (i % 3) });
      }
      SD.Audio.playBGM(SD.BGM.BOSS);
    };

    st.tick = function () {
      const k = SD.Game.key();
      timer++;
      if (phase === 0) { if (timer > 45) { phase = 1; timer = 0; } return; }

      if (phase === 2) {          // defeated
        if (timer % 6 === 0) {
          const b = free(blasts);
          if (b) {
            b.on = 1; b.t = 0;
            b.x = boss.x + (Math.random() - 0.5) * boss.w;
            b.y = boss.y + (Math.random() - 0.5) * boss.h;
            b.spr = S.ExplosionL_1 + ((Math.random() * 3) | 0);
          }
          SD.Audio.playSE(SD.SE.DEAD);
        }
        for (const b of blasts) if (b.on && ++b.t > 16) b.on = 0;
        if (timer > 120) {
          G.Boss_dead = 1;
          if (G.Stage >= 12) SD.Game.fadeScene(SCN.ENDING);
          else SD.Game.gameScene('next');
        }
        return;
      }
      if (phase === 3) {          // player destroyed
        for (const b of blasts) if (b.on && ++b.t > 16) b.on = 0;
        if (timer > 70) {
          if (G.Ship <= 0) { phase = 4; timer = 0; SD.Audio.playBGM(SD.BGM.GAMEOVER); }
          else { phase = 1; timer = 0; invuln = 90; G.X[0] = C.SCREEN_W / 2;
                 G.Mypower = 0; G.My3way = 0; G.Vmax[0] = C.INIT_SPEED; G.Mybomb = C.INIT_BOMB;
                 // Shots are not stepped while dying, so retire them here or
                 // they would occupy pool slots for the rest of the fight.
                 for (const m of emis) m.on = 0;
                 for (const s of shots) s.on = 0; }
        }
        return;
      }
      if (phase === 4) {
        for (const b of blasts) if (b.on && ++b.t > 16) b.on = 0;
        if (timer > 150 || (k & SD.Input.TRIG_1)) SD.Game.fadeScene(SCN.RESULT);
        return;
      }

      // player
      const v = G.Vmax[0];
      if (k & SD.Input.HOLD_L) G.X[0] -= v;
      if (k & SD.Input.HOLD_R) G.X[0] += v;
      if (k & SD.Input.HOLD_U) G.Y[0] = Math.max(playerY - 40, G.Y[0] - 2);
      if (k & SD.Input.HOLD_D) G.Y[0] = Math.min(playerY + 24, G.Y[0] + 2);
      G.X[0] = Math.max(C.WX_MIN + 32, Math.min(C.WX_MAX - 32, G.X[0]));

      if (st.cool > 0) st.cool--; else st.cool = 0;
      if (st.altCool > 0) st.altCool--; else st.altCool = 0;
      // Same two release points as the stages: Z from the bow, X from the stern.
      if ((k & SD.Input.HOLD_1) && !st.cool && bossVolley(-BOW)) st.cool = G.Mypower ? 4 : 6;
      if ((k & SD.Input.HOLD_2) && !st.altCool && bossVolley(BOW)) st.altCool = G.Mypower ? 4 : 6;

      // boss movement + fire
      boss.t++;
      boss.x += boss.vx;
      if (boss.x < C.WX_MIN + boss.w / 2 || boss.x > C.WX_MAX - boss.w / 2) boss.vx = -boss.vx;
      boss.y = FIELD_TOP + 90 + Math.sin(boss.t * 0.02) * 22;

      if (--boss.fire <= 0) {
        boss.fire = Math.max(24, 60 - G.Stage * 2);
        const n = 3 + Math.floor(G.Stage / 4);
        for (let i = 0; i < n; i++) {
          const m = free(emis);
          if (!m) break;
          const ang = Math.PI / 2 + (i - (n - 1) / 2) * 0.28;
          m.on = 1; m.x = boss.x; m.y = boss.y + boss.h / 2;
          m.vx = Math.cos(ang) * 3.4; m.vy = Math.sin(ang) * 3.4;
          m.spr = S.Bullet3;
        }
      }

      for (const p of pods) {
        if (!p.on) continue;
        p.a += 0.018;
        p.x = boss.x + Math.cos(p.a) * p.r;
        p.y = boss.y + Math.sin(p.a) * p.r * 0.35 + 78;
      }

      for (const s of shots) {
        if (!s.on) continue;
        s.x += s.vx; s.y += s.vy;
        if (s.y < FIELD_TOP - 8) { s.on = 0; continue; }
        let done = false;
        for (const p of pods) {
          if (!p.on) continue;
          if (Math.abs(s.x - p.x) < 18 && Math.abs(s.y - p.y) < 18) {
            s.on = 0; p.hp -= s.pow;
            if (p.hp <= 0) { p.on = 0; G.Score += 200; SD.Audio.playSE(SD.SE.DEAD); }
            else SD.Audio.playSE(SD.SE.HIT);
            done = true; break;
          }
        }
        if (done) continue;
        if (Math.abs(s.x - boss.x) < boss.w / 2 && Math.abs(s.y - boss.y) < boss.h / 2) {
          s.on = 0; boss.hp -= s.pow; SD.Audio.playSE(SD.SE.HIT);
        }
      }
      for (const p of pods) if (p.on && p.hp <= 0) p.on = 0;
      if (boss.hp <= 0 && phase === 1) {
        phase = 2; timer = 0;
        G.Score += (SD.SCORE_PTS[4] && SD.SCORE_PTS[4][6]) || 10000;
        SD.Audio.playBGM(SD.BGM.BOSSCLEAR1);
      }

      for (const m of emis) {
        if (!m.on) continue;
        m.x += m.vx; m.y += m.vy;
        if (m.y > FIELD_BOTTOM + 16 || m.x < 0 || m.x > C.SCREEN_W) m.on = 0;
      }
      for (const b of blasts) if (b.on && ++b.t > 16) b.on = 0;

      if (invuln > 0) { invuln--; return; }
      for (const m of emis) {
        if (m.on && Math.abs(m.x - G.X[0]) < 26 && Math.abs(m.y - G.Y[0]) < 15) {
          m.on = 0; hitPlayer(); return;
        }
      }
      for (const p of pods) {
        if (p.on && Math.abs(p.x - G.X[0]) < 32 && Math.abs(p.y - G.Y[0]) < 24) { hitPlayer(); return; }
      }
    };

    function bossVolley(off) {
      const need = G.My3way ? 3 : 1;
      if (ammoLeft() < need) return false;
      const sx = G.X[0] + off, sy = G.Y[0] - 18, pw = G.Mypower ? 2 : 1;
      const put = (vx, vy) => { const s = free(shots); if (s) { s.on = 1; s.x = sx; s.y = sy; s.vx = vx; s.vy = vy; s.pow = pw; } };
      put(0, -SHOT_V);
      if (G.My3way) { put(-1.2, -SHOT_V * 0.93); put(1.2, -SHOT_V * 0.93); }
      SD.Audio.playSE(SD.SE.FIRE);
      return true;
    }

    function hitPlayer() {
      G.Ship--;
      G.Disp_ship = Math.max(0, G.Ship - 1);
      const b = free(blasts);
      if (b) { b.on = 1; b.t = 0; b.x = G.X[0]; b.y = G.Y[0]; b.spr = S.ExplosionL_1; }
      SD.Audio.playSE(SD.SE.DEAD);
      phase = 3; timer = 0;
    }

    st.draw = function (cx) {
      cx.fillStyle = '#05040e';
      cx.fillRect(0, FIELD_TOP, C.SCREEN_W, FIELD_BOTTOM - FIELD_TOP);

      SD.Gfx.draw(cx, boss.spr, boss.x, boss.y, G.Anim);
      for (const p of pods) if (p.on) SD.Gfx.draw(cx, p.spr, p.x, p.y, G.Anim);
      for (const s of shots) if (s.on) SD.Gfx.draw(cx, s.pow > 1 ? S.Bomb_Red_M : S.Bomb_Blu_M, s.x, s.y, G.Anim);
      for (const m of emis) if (m.on) SD.Gfx.draw(cx, m.spr, m.x, m.y, G.Anim);
      if (phase !== 3 && phase !== 4 && !(invuln > 0 && (G.Anim & 2))) {
        SD.Gfx.draw(cx, S.Yamaboku_SPACE, G.X[0], G.Y[0], G.Anim);
      }
      for (const b of blasts) if (b.on) SD.Gfx.draw(cx, b.spr, b.x, b.y, b.t);

      drawChromeCommon(cx, 0, Math.max(0, boss.hp) / boss.hpMax,
                       { enemies: pods, shots: shots, emis: emis });

      if (phase === 0) SD.Game.drawInfo('WARNING', 2);
      if (phase === 2) SD.Game.drawInfo('BOSS DOWN', 4);
      if (phase === 4) SD.Game.drawInfo('GAME OVER', 2);
    };

    st.cool = 0;
    st.altCool = 0;
    return st;
  }

  // ----------------------------------------------------- stage interludes
  // GameDeep2Sky / GameSky2Space / GameSpace2Boss: a short animated caption
  // between two stages.
  function makeInterlude(text, bgmId) {
    const st = { pausable: false };
    let t = 0;
    st.init = function () { t = 0; SD.Audio.playBGM(bgmId); };
    st.tick = function () {
      t++;
      // gameScene('next') bumps Stage and picks the scene for the new Stage_mode.
      if (t > 110 || (SD.Game.key() & SD.Input.TRIG_1)) SD.Game.gameScene('next');
    };
    st.draw = function (cx) {
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 150, text, 5);
      SD.Gfx.drawTextCentre(cx, C.SCREEN_W / 2, 200, '\x17\x18\x19\x1a' + SD.Game.pad(G.Stage, 2), 6);
    };
    return st;
  }

  function registerAll(register) {
    register(SCN.DEEP, makeStage('deep', SCN.DEEP, SD.BGM.DEEP));
    register(SCN.SKY, makeStage('sky', SCN.SKY, SD.BGM.SKY));
    register(SCN.SPACE, makeStage('space', SCN.SPACE, SD.BGM.SPACE));
    register(SCN.BOSS, makeBoss());
    register(SCN.DEEP2SKY, makeInterlude('LEAVING THE SEA', SD.BGM.DEEP2SKY));
    register(SCN.SKY2SPACE, makeInterlude('LEAVING THE SKY', SD.BGM.SKY2SPACE));
    register(SCN.SPACE2BOSS, makeInterlude('WARNING', SD.BGM.ALARM));
  }

  return { registerAll, FIELD_TOP, FIELD_BOTTOM };
})();
