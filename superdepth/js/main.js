// SuperDepth - entry point.
window.addEventListener('DOMContentLoaded', () => {
  SD.Game.boot().catch((e) => {
    const s = document.getElementById('status');
    if (s) s.textContent = 'ERROR: ' + e.message;
    console.error(e);
  });
});
