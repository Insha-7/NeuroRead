window.NR_ReadingRuler = (function() {
  'use strict';

  let overlayTop, overlayBottom;
  let active = false;

  function init() {
    if (document.getElementById('nr-ruler-top')) return;

    overlayTop = document.createElement('div');
    overlayTop.id = "nr-ruler-top";
    overlayTop.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; background: rgba(0,0,0,0.4); z-index: 2147483645; pointer-events: none; display: none;";

    overlayBottom = document.createElement('div');
    overlayBottom.id = "nr-ruler-bottom";
    overlayBottom.style.cssText = "position: fixed; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 2147483645; pointer-events: none; display: none;";

    document.body.appendChild(overlayTop);
    document.body.appendChild(overlayBottom);

    document.addEventListener('mousemove', onMouseMove);
  }

  function onMouseMove(e) {
    if (!active) return;
    const windowHeight = window.innerHeight;
    const rulerHeight = 120; // 120px clear reading window
    const mouseY = e.clientY;

    const topDist = Math.max(0, mouseY - (rulerHeight / 2));
    const bottomStart = Math.min(windowHeight, mouseY + (rulerHeight / 2));

    overlayTop.style.height = `${topDist}px`;
    overlayBottom.style.top = `${bottomStart}px`;
  }

  function toggle(enabled) {
    active = enabled;
    if (enabled) {
      init();
      overlayTop.style.display = 'block';
      overlayBottom.style.display = 'block';
    } else {
      if (overlayTop) overlayTop.style.display = 'none';
      if (overlayBottom) overlayBottom.style.display = 'none';
    }
  }

  function deactivate() {
    toggle(false);
  }

  return { toggle, deactivate };
})();
