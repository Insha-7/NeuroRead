window.NR_ADHDColours = (function() {
  'use strict';

  function toggle(enabled) {
    if (enabled) {
      if (!document.getElementById('nr-adhd-style')) {
        const style = document.createElement('style');
        style.id = "nr-adhd-style";
        style.textContent = `
          /* Ensure paragraphs and lists use standard text coloring */
          p, li {
            color: var(--nr-text-color) !important;
            font-family: var(--nr-font-family, inherit) !important;
            line-height: var(--nr-line-height) !important;
            font-size: var(--nr-font-size) !important;
          }
          
          /* Headers */
          h1, h1 a { color: var(--nr-h1-color) !important; text-decoration: none !important; font-size: 2.8em !important; font-weight: 800 !important; line-height: 1.2 !important; }
          h2, h2 a { color: var(--nr-h2-color) !important; text-decoration: none !important; font-size: 2.2em !important; font-weight: 700 !important; line-height: 1.3 !important; }
          h3, h3 a, h4, h4 a { color: var(--nr-h1-color) !important; text-decoration: none !important; font-size: 1.6em !important; font-weight: 700 !important; }
          
          /* Facts and emphasis */
          strong, b { color: var(--nr-fact-color) !important; }
          em, i { color: var(--nr-quote-color) !important; }
          
          /* Page Background Override */
          body, main, article {
            background-color: var(--nr-background) !important;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      const style = document.getElementById('nr-adhd-style');
      if (style) style.remove();
    }
  }

  function activate() {
    toggle(true);
  }
  function deactivate() {
    toggle(false);
  }

  return { toggle, activate, deactivate };
})();
