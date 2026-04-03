window.NR_ToneBanner = (function() {
  'use strict';

  function show(toneLevel) {
    if (document.getElementById('nr-tone-banner')) return;

    let text = "Tone Notice: This page contains potentially sensitive or highly emotional material.";
    let color = "#E63946"; // severe red
    
    if (toneLevel === "medium") {
       text = "Tone Notice: This page discusses topics that may be stressful or intense.";
       color = "#F4A261"; // orange
    } else if (toneLevel === "low") {
       text = "Tone Notice: This page has mild emotional sentiment.";
       color = "#2A9D8F"; // safe green
    }

    const banner = document.createElement('div');
    banner.id = "nr-tone-banner";
    banner.style.cssText = `position: sticky; top: 0; left: 0; width: 100%; background: ${color}; color: white; text-align: center; padding: 12px; z-index: 2147483647; font-weight: 600; font-family: system-ui; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;`;
    banner.innerText = text + " (Click to dismiss)";
    
    banner.addEventListener('click', () => {
      banner.style.display = 'none';
    });

    document.body.prepend(banner);
  }

  function remove() {
    const banner = document.getElementById('nr-tone-banner');
    if (banner) banner.remove();
  }

  return { show, remove };
})();
