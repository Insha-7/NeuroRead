// NeuroRead AI — formatting.js
// Module 1: Bigger font size, font color, line height injection.
// Applies CSS variables to semantic elements without breaking page layout.

(function () {
  "use strict";
  if (window.__NR_FORMATTING_LOADED) return;
  window.__NR_FORMATTING_LOADED = true;

  const STYLE_ID = "nr-formatting-style";
  const API = "http://localhost:8000";

  // Fetch settings from our backend via the service-worker proxy
  function fetchSettings() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "FETCH", url: API + "/settings", method: "GET" },
        (res) => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
          if (!res || !res.ok) return reject(res ? res.error : "No response");
          resolve(res.data);
        }
      );
    });
  }

  // Build and inject a <style> block from the settings JSON
  function injectStyles(settings) {
    removeStyles(); // clean slate

    const s = settings;
    const c = s.colors;

    const css = `
/* NeuroRead AI — Formatting Override */

/* --- Page background --- */
body, main, article, section {
  background-color: ${c.background} !important;
}

/* --- Paragraph text: bigger, spaced, dark --- */
.mw-parser-output > p,
.mw-parser-output > ul > li,
.mw-parser-output > ol > li,
.mw-parser-output > blockquote {
  font-size: ${s.base_font_size} !important;
  line-height: ${s.line_height} !important;
  color: ${c.text} !important;
  margin-bottom: 0.8em !important;
}

/* --- Page title — fixed size, purple --- */
#firstHeading, .mw-page-title-main {
  color: ${c.highlight} !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  margin-bottom: 0.5em !important;
}

/* --- Section headings — purple, proportional --- */
.mw-heading h2,
.mw-parser-output > h2 {
  color: ${c.highlight} !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  margin-top: 1.2em !important;
  margin-bottom: 0.5em !important;
  border-bottom: 2px solid ${c.highlight}33 !important;
  padding-bottom: 4px !important;
}

.mw-heading h3,
.mw-parser-output > h3 {
  color: ${c.highlight} !important;
  font-size: 22px !important;
  font-weight: 700 !important;
  margin-top: 1em !important;
  margin-bottom: 0.4em !important;
}

/* --- Links stay blue (not heading links) --- */
.mw-parser-output a:not(.mw-jump-link) {
  color: #2563EB !important;
}
.mw-parser-output a:visited {
  color: #5B21B6 !important;
}

/* Links inside headings stay purple */
.mw-heading a,
#firstHeading a {
  color: ${c.highlight} !important;
  text-decoration: none !important;
}

/* --- Bold text = orange accent --- */
.mw-parser-output b,
.mw-parser-output strong {
  color: ${c.accent} !important;
}

/* --- Math elements: keep inline, no extra spacing --- */
math, .mwe-math-element, .mwe-math-fallback-image-inline,
.mwe-math-fallback-image-display {
  display: inline !important;
  vertical-align: middle !important;
  line-height: 1 !important;
  margin: 0 2px !important;
  padding: 0 !important;
}
/* Reset the outer span wrapper Wikipedia puts around math */
.mwe-math-element {
  display: inline-block !important;
  margin: 0 1px !important;
}

/* --- DO NOT touch superscripts, references, small UI --- */
sup, sub, .reference,
.mw-editsection, .navbox, .catlinks, .metadata,
figcaption, .thumbcaption, .legend {
  font-size: revert !important;
  color: revert !important;
}

/* --- Images: enlarge thumbnails --- */
.mw-parser-output .thumb {
  width: 350px !important;
  max-width: 50% !important;
}
.mw-parser-output .thumbinner {
  width: 100% !important;
  max-width: 100% !important;
}
.mw-parser-output .thumbimage,
.mw-parser-output .thumbinner img {
  width: 100% !important;
  height: auto !important;
}
/* Also enlarge inline images not inside .thumb */
.mw-parser-output img:not(.mw-logo-icon):not([width="1"]):not(.mwe-math-fallback-image-inline):not(.mwe-math-fallback-image-display) {
  min-width: 150px;
}

/* --- Table of contents stays clean --- */
.toc, #toc, .mw-table-of-contents {
  font-size: 15px !important;
}
`;

    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);

    console.log("[NeuroRead] Formatting applied.");
  }

  function removeStyles() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  // Public API exposed to popup / orchestrator
  window.NR_Formatting = {
    activate: async function () {
      try {
        const settings = await fetchSettings();
        injectStyles(settings);
        return { success: true };
      } catch (err) {
        console.error("[NeuroRead] Formatting error:", err);
        return { success: false, error: String(err) };
      }
    },
    deactivate: function () {
      removeStyles();
      console.log("[NeuroRead] Formatting removed.");
    },
  };
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "PING") {
      sendResponse({ ready: true });
      return;
    }
    if (msg.type === "ACTIVATE_FORMATTING") {
      window.NR_Formatting.activate().then(sendResponse);
      return true; // async
    }
    if (msg.type === "DEACTIVATE_FORMATTING") {
      window.NR_Formatting.deactivate();
      sendResponse({ success: true });
    }
  });
})();
