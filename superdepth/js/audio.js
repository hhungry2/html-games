// SuperDepth - sound. BGM slots and SE slots keep the SWF's numbering, so
// SD.BGM.DEEP still means SndBGM02.mp3 and SD.SE.BOMB still means SndSE01.mp3.
//
// Playback goes through HTMLAudioElement rather than the WebAudio decoder so the
// page also works when opened straight off the filesystem.

SD.Audio = (function () {
  const BASE = 'assets/sounds/';
  const bgm = [];
  const se = [];
  let current = -1;
  let muted = false;
  let unlocked = false;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Jingles rather than background tracks: they end and stay ended.
  const ONESHOT = new Set([
    SD.BGM.GAMEOVER, SD.BGM.BOSSCLEAR1, SD.BGM.BOSSCLEAR2, SD.BGM.BOSSCLEAR3,
  ]);

  function init() {
    for (let i = 0; i <= 14; i++) {
      const a = new Audio(BASE + 'SndBGM' + pad2(i) + '.mp3');
      a.preload = 'none';
      // The game-over and boss-clear jingles play once; everything else loops.
      a.loop = !ONESHOT.has(i);
      bgm.push(a);
    }
    // SndSE01..06 line up with EFS_BOMB..EFS_ITEM (0..5).
    for (let i = 1; i <= 6; i++) {
      const a = new Audio(BASE + 'SndSE' + pad2(i) + '.mp3');
      a.preload = 'auto';
      se.push(a);
    }
  }

  // Browsers refuse to start audio before a gesture; the title screen calls this
  // on the first key press or tap.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (current >= 0) playBGM(current, true);
  }

  function playBGM(n, force) {
    if (n === current && !force) return;
    stopBGM();
    current = n;
    if (muted || !unlocked) return;
    const a = bgm[n];
    if (!a) return;
    a.currentTime = 0;
    a.volume = 0.55;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  function stopBGM() {
    if (current >= 0 && bgm[current]) { bgm[current].pause(); }
    current = -1;
  }

  function pauseBGM() { if (current >= 0 && bgm[current]) bgm[current].pause(); }
  function resumeBGM() {
    if (current >= 0 && bgm[current] && !muted && unlocked) {
      const p = bgm[current].play(); if (p && p.catch) p.catch(() => {});
    }
  }

  function playSE(n) {
    if (muted || !unlocked) return;
    const a = se[n];
    if (!a) return;
    // Clone so overlapping shots do not cut each other off.
    const c = a.cloneNode();
    c.volume = 0.45;
    const p = c.play();
    if (p && p.catch) p.catch(() => {});
  }

  function setMuted(m) {
    muted = m;
    if (m) pauseBGM(); else resumeBGM();
    return muted;
  }
  function isMuted() { return muted; }

  return { init, unlock, playBGM, stopBGM, pauseBGM, resumeBGM, playSE, setMuted, isMuted };
})();
