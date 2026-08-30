// SuperDepth - graphics layer.
//
// The SWF stores every character as a greyscale mask in a single-column strip
// (c08/c16/c32 are 8/16/32 pixel cells, boss.png is a second 32 pixel strip).
// A sprite is `wCells * hCells` consecutive cells, and each animation frame
// names its own start cell plus a palette variant. We rebuild the coloured
// frames once at load time, exactly the way BitmapResource.getBitmaps() did,
// and cache them as canvases.

SD.Gfx = (function () {
  const images = {};
  const masks = {};          // sheet name -> {w, h, idx: Uint8Array of palette indices}
  const frames = {};         // sprite id -> [canvas per frame]
  const fontTints = [];      // palette index -> tinted 256x128 font canvas
  let fontImg = null;

  // --- palettes ----------------------------------------------------------

  // The four "live" entries, as a function of a counter. Both the per-sprite
  // build variant and the per-frame stage animation use these same formulas;
  // they only differ in which counter drives them.
  function cyclePal(p, c1, c3, c7) {
    p[2] = 0xFF000000 + 0xDD0000 + 0x220000 * c1;
    p[3] = 0xFF000000 + 0xDD0000 + 0x220000 * c1 + 0x88 + 0x11 * c7;
    p[4] = 0xFF000000 + 0x00BB00 + 0x004400 * c1 + 0x88 * c1;
    p[6] = 0xFF000000 + 0xCC0000 - 0x0F0000 * c3 + 0x009900 + 0x001100 * c3;
  }

  // Palette used when baking one animation frame (BitmapResource.getBitmaps).
  function paletteForVariant(t) {
    const p = SD.PALS.slice();
    if (t >= 0 && t < 8) {
      cyclePal(p, t & 1, t & 3, t & 7);
    } else if (t === 12) {
      // Earth gets its own blue-green ramp.
      for (let i = 1; i < 6; i++) p[i] = 0xFF000000 + 0x2200 + 0x1100 * i + 0x11 * i;
      p[6] = 0xFF000000 + 0x00EE00 + 0xEE;
      p[7] = 0xFF000000 + 0x00FF00 + 0xFF;
    }
    return p;
  }

  // GameStage keeps a second palette with a slightly different base, animated
  // every frame off the Myu counters and used for drawing primitives.
  const stageBase = [
    0x00000000, 0xFF0000FF, 0xFFFF0000, 0xFF8800FF, 0xFF00FF88, 0xFF00BBDD,
    0xFFFFBB00, 0xFFFFBB00, 0xFF000000, 0xFF333333, 0xFF444444, 0xFF555555,
    0xFF777777, 0xFF999999, 0xFFDDDDDD, 0xFFFFFFFF,
  ];
  const stagePal = stageBase.slice();

  function tickPalette(myu2, myu4, myu8) {
    cyclePal(stagePal, myu2, myu4, myu8);
  }

  function css(argb) {
    const a = ((argb >>> 24) & 255) / 255;
    return 'rgba(' + ((argb >> 16) & 255) + ',' + ((argb >> 8) & 255) + ',' + (argb & 255) + ',' + a + ')';
  }
  function palCss(i) { return css(stagePal[i & 15]); }

  // --- loading -----------------------------------------------------------

  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('image load failed'));
      im.src = src;
    });
  }

  // Read a sheet back as palette indices. The masks are 16-level greys, so the
  // index is simply round(grey / 17); fully transparent pixels map to 0.
  function toMask(img) {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const idx = new Uint8Array(cv.width * cv.height);
    for (let i = 0, p = 0; i < idx.length; i++, p += 4) {
      idx[i] = d[p + 3] === 0 ? 0 : Math.min(15, Math.round(d[p] / 17));
    }
    return { w: cv.width, h: cv.height, idx: idx };
  }

  async function load() {
    const names = ['c08', 'c16', 'c32', 'boss', 'font', 'logo', 'super', 'rader'];
    await Promise.all(names.map(async (n) => { images[n] = await loadImage(SD_IMAGES[n]); }));
    for (const n of ['c08', 'c16', 'c32', 'boss']) masks[n] = toMask(images[n]);
    fontImg = images.font;
    buildAllSprites();
  }

  // --- sprite baking -----------------------------------------------------

  function buildFrame(id, f) {
    const c = SD.CONV[id];
    const flags = c[0], sheet = SD.SHEETS[flags & 3], sz = SD.KSZ[flags & 3];
    const wc = c[1], hc = c[2];
    const cell = c[5 + f * 2], variant = c[6 + f * 2];
    const m = masks[sheet], pal = paletteForVariant(variant);

    const w = wc * sz, h = hc * sz;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    const out = cx.createImageData(w, h);
    const od = out.data;

    // Cells run left-to-right then top-to-bottom, stepping a row at a time by
    // the sheet's authored width (SD.STRIDE) rather than by the sprite's own.
    const stride = SD.STRIDE[flags & 3];
    for (let cy = 0; cy < hc; cy++) {
      for (let cxi = 0; cxi < wc; cxi++) {
        const srcCell = cell + cy * stride + cxi;
        const sy = srcCell * sz;
        if (sy < 0 || sy + sz > m.h) continue;
        for (let y = 0; y < sz; y++) {
          let s = (sy + y) * m.w;
          let o = ((cy * sz + y) * w + cxi * sz) * 4;
          for (let x = 0; x < sz; x++, s++, o += 4) {
            const argb = pal[m.idx[s]];
            od[o] = (argb >> 16) & 255;
            od[o + 1] = (argb >> 8) & 255;
            od[o + 2] = argb & 255;
            od[o + 3] = (argb >>> 24) & 255;
          }
        }
      }
    }
    cx.putImageData(out, 0, 0);
    return cv;
  }

  function buildAllSprites() {
    for (let id = 0; id < SD.CONV.length; id++) {
      const c = SD.CONV[id];
      // Logo / Super / Rader are whole images rather than strip cells.
      if (id >= SD.S.Logo) { frames[id] = [images[SD.SPRITE_NAMES[id].toLowerCase()]]; continue; }
      const list = [];
      for (let f = 0; f < c[3]; f++) {
        try { list.push(buildFrame(id, f)); } catch (e) { /* skip malformed */ }
      }
      frames[id] = list;
    }
  }

  // --- drawing -----------------------------------------------------------

  // `anim` is the global frame counter; each sprite advances every conv[4] ticks.
  function frameOf(id, anim) {
    const list = frames[id];
    if (!list || !list.length) return null;
    const speed = SD.CONV[id][4] || 1;
    return list[Math.floor(anim / speed) % list.length];
  }

  function sizeOf(id) {
    const c = SD.CONV[id], sz = SD.KSZ[c[0] & 3];
    if (id >= SD.S.Logo) { const i = frames[id][0]; return { w: i.width, h: i.height }; }
    return { w: c[1] * sz, h: c[2] * sz };
  }

  // Draw with (x, y) as the sprite's centre, which is how the original places
  // almost everything (CommonFunc.XY_CENTER). Every character sheet is drawn
  // facing left, so anything travelling right passes flip = true.
  function draw(cx, id, x, y, anim, alpha, flip) {
    const img = frameOf(id, anim || 0);
    if (!img) return;
    const px = Math.round(x - img.width / 2), py = Math.round(y - img.height / 2);
    const dim = alpha !== undefined && alpha < 1;
    if (!dim && !flip) { cx.drawImage(img, px, py); return; }
    cx.save();
    if (dim) cx.globalAlpha = alpha;
    if (flip) {
      cx.translate(px + img.width, py);
      cx.scale(-1, 1);
      cx.drawImage(img, 0, 0);
    } else {
      cx.drawImage(img, px, py);
    }
    cx.restore();
  }

  function drawAt(cx, id, x, y, anim) {   // top-left anchored
    const img = frameOf(id, anim || 0);
    if (img) cx.drawImage(img, Math.round(x), Math.round(y));
  }

  // Tile a sprite horizontally across `w`, optionally clipped to `h` tall.
  // The scenery strips (Horizon, Bottom) are single tiles meant to repeat;
  // conv's high byte carries the original repeat count.
  function drawStrip(cx, id, x, y, w, h, anim) {
    const img = frameOf(id, anim || 0);
    if (!img) return;
    const hh = Math.min(h === undefined ? img.height : h, img.height);
    for (let px = 0; px < w; px += img.width) {
      const ww = Math.min(img.width, w - px);
      cx.drawImage(img, 0, 0, ww, hh, Math.round(x + px), Math.round(y), ww, hh);
    }
  }

  // --- text --------------------------------------------------------------

  // 16x16 glyphs, 16 per row, indexed by the raw character code 0..127.
  // Codes 0..31 are the game's own symbols (ordinals, "Stage", arrows, frame
  // pieces); 32..127 are plain ASCII.
  function tintedFont(colIdx) {
    if (fontTints[colIdx]) return fontTints[colIdx];
    const cv = document.createElement('canvas');
    cv.width = fontImg.width; cv.height = fontImg.height;
    const cx = cv.getContext('2d');
    cx.drawImage(fontImg, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = css(stageBase[colIdx & 15]);
    cx.fillRect(0, 0, cv.width, cv.height);
    fontTints[colIdx] = cv;
    return cv;
  }

  const FW = 16, FH = 16;

  function drawText(cx, x, y, str, colIdx, scale) {
    const s = scale || 1;
    const sheet = tintedFont(colIdx === undefined ? 15 : colIdx);
    let px = x;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i) & 127;
      if (code !== 32) {
        cx.drawImage(sheet, (code & 15) * FW, (code >> 4) * FH, FW, FH,
                     Math.round(px), Math.round(y), FW * s, FH * s);
      }
      px += FW * s;
    }
  }

  function textWidth(str, scale) { return str.length * FW * (scale || 1); }

  function drawTextCentre(cx, cxPos, y, str, colIdx, scale) {
    drawText(cx, cxPos - textWidth(str, scale) / 2, y, str, colIdx, scale);
  }

  return {
    load, draw, drawAt, drawStrip, drawText, drawTextCentre, textWidth, sizeOf, frameOf,
    tickPalette, palCss, css, stagePal, images,
    FW, FH,
  };
})();
