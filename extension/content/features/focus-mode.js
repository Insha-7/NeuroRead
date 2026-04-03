window.NR_FocusMode = (function() {
  'use strict';

  function toggle(enabled) {
    if (enabled) {
      if (!document.getElementById('nr-focus-style')) {
        const style = document.createElement('style');
        style.id = "nr-focus-style";
        style.textContent = `
          /* Hide non-essential noisy elements */
          aside, nav:not(.main-nav), .sidebar, iframe, .ads, .advertisement, [id*="ad-"], [class*="ad-"], .comments, .related-articles, .popup, .overlay {
             opacity: 0.1 !important;
             transition: opacity 0.3s ease;
             filter: grayscale(100%) blur(2px) !important;
             pointer-events: none !important;
          }
          aside:hover, .comments:hover, .related-articles:hover {
             opacity: 1 !important;
             filter: none !important;
             pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      const style = document.getElementById('nr-focus-style');
      if (style) style.remove();
    }
  }

  function deactivate() {
    toggle(false);
  }

  return { toggle, deactivate };
})();
