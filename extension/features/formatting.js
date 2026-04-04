// NeuroRead AI — formatting.js
// Module 1: AI-Driven Formatting Scanner
// Collects DOM skeleton, sends to Groq backend, receives perfect CSS selectors.

(function () {
  "use strict";
  if (window.__NR_FORMATTING_LOADED) return;
  window.__NR_FORMATTING_LOADED = true;

  const STYLE_ID = "nr-formatting-style";
  const API = "http://localhost:8000";

  // Build a lightweight skeleton of the site structure for the AI to analyze
  function buildSkeleton() {
    const elements = document.querySelectorAll('main, article, section, header, div[class*="content"], h1, h2, h3, p, img');
    let skeleton = "";
    let count = 0;
    for (let el of elements) {
      if (count > 250) break; // Prevent massive payloads
      let tag = el.tagName.toLowerCase();
      let id = el.id ? `#${el.id}` : '';
      let cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').join('.')}` : '';
      if (cls.length > 50) cls = cls.substring(0, 50); // Trim crazy tailwind classes
      skeleton += `<${tag}${id}${cls}>\n`;
      count++;
    }
    return skeleton;
  }

  // Fetch AI tailored settings based on our skeleton
  function fetchSettings() {
    return new Promise((resolve, reject) => {
      const skeleton = buildSkeleton();
      chrome.runtime.sendMessage(
        {
          type: "FETCH",
          url: API + "/analyze-site",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { html_skeleton: skeleton }
        },
        (res) => {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
          if (!res || !res.ok) return reject(res ? res.error : "No response");
          resolve(res.data);
        }
      );
    });
  }

  // Dynamically inject CSS based on what Groq Llama 3 mapped
  function injectStyles(payload) {
    removeStyles(); // clean slate

    const s = payload.selectors;
    const f = payload.formatting;
    const t = f.typography;
    const c = f.colors;
    const l = f.layout;
    const cl = f.clutter;

    const css = `
/* NeuroRead AI — AI-Mapped Formatting Override */

/* --- Page & Container --- */
body {
  background-color: ${c.background} !important;
  ${cl.override_background_image ? 'background-image: none !important;' : ''}
}
main:not(.vector-column-start):not(nav), 
article, 
.mw-body-content,
[role="main"] {
  background-color: ${c.background} !important;
  ${cl.override_background_image ? 'background-image: none !important;' : ''}
  font-family: ${t.font_family} !important;
}

/* Constrain column width for readability return sweeps */
:is(${s.title_selector}, ${s.body_selector}, ${s.header_selectors}):not(#nr-toc-container *) {
  max-width: ${l.content_max_width} !important;
  margin-left: auto !important;
  margin-right: auto !important;
  ${cl.remove_decorative_shadows ? 'box-shadow: none !important; text-shadow: none !important;' : ''}
}

/* --- Paragraph text --- */
:is(${s.body_selector}):not(#nr-toc-container *) {
  font-size: ${t.base_font_size} !important;
  line-height: ${t.line_height} !important;
  color: ${c.text} !important;
  text-align: ${t.text_align} !important;
  letter-spacing: ${t.letter_spacing} !important;
  word-spacing: ${t.word_spacing} !important;
  margin-bottom: ${l.paragraph_spacing} !important;
  max-width: ${t.max_line_width} !important;
}

/* --- Italics Override --- */
${t.override_italic ? 'i:not(#nr-toc-container i), em:not(#nr-toc-container em) { font-style: normal !important; font-weight: 500 !important; }' : ''}

/* --- Page title --- */
:is(${s.title_selector}):not(#nr-toc-container *) {
  color: ${c.highlight} !important;
  font-size: 42px !important;
  font-weight: 800 !important;
  margin-bottom: 0.5em !important;
}

/* --- Section headings --- */
:is(${s.header_selectors}):not(#nr-toc-container *) {
  color: ${c.highlight} !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  margin-top: ${l.heading_margin_top} !important;
  margin-bottom: 0.8em !important;
}

/* --- Links (exclude TOC) --- */
a:not(#nr-toc-container a):not(#nr-toc-list a) { color: #2563EB !important; }
a:visited:not(#nr-toc-container a):not(#nr-toc-list a) { color: #5B21B6 !important; }
:is(${s.title_selector}) a, :is(${s.header_selectors}) a {
  color: ${c.highlight} !important;
  text-decoration: none !important;
}

/* --- Bold text & Emphasis (exclude TOC) --- */
b:not(#nr-toc-container b), strong:not(#nr-toc-container strong) { 
  color: ${c.accent} !important; 
  font-weight: 800 !important;
}

/* --- Lists (exclude TOC & native sidebars) --- */
ul:not(#nr-toc-container *):not(.vector-toc *):not(#vector-toc *), ol:not(#nr-toc-container *):not(.vector-toc *):not(#vector-toc *) {
  padding-left: ${l.list_indent} !important;
}
li:not(#nr-toc-container *):not(.vector-toc *):not(#vector-toc *) {
  margin-bottom: ${l.list_item_spacing} !important;
  font-size: ${t.base_font_size} !important;
  line-height: ${t.line_height} !important;
  color: ${c.text} !important;
}

/* --- Images & Image Containers --- */
.thumb, figure, .thumbinner, .tmulti {
  width: auto !important;
  max-width: 450px !important;
  min-width: 300px !important;
}
.thumb img, figure img, .thumbinner img,
:is(${s.thumbnail_selector}):not(#nr-toc-container *):not(.mwe-math-fallback-image-inline):not(.mwe-math-fallback-image-display) {
  display: ${cl.image_display_style} !important;
  margin-top: 1em !important;
  margin-bottom: 1em !important;
  width: 100% !important;
  max-width: 450px !important;
  min-width: 280px !important;
  height: auto !important;
}

/* --- HARD EXCLUSIONS: Math & Inline Elements --- */
math, .mwe-math-element, .mwe-math-fallback-image-inline, .mwe-math-fallback-image-display {
  display: inline-block !important;
  margin: 0 !important;
  padding: 0 !important;
  vertical-align: middle !important;
  width: auto !important;
  max-width: none !important;
  background-color: transparent !important;
}

/* --- GROQ EXCLUSIONS --- */
${s.exclusions} {
  font-size: revert !important;
  color: revert !important;
  line-height: revert !important;
  background-color: revert !important;
}

/* --- PROTECT Wikipedia Native Sidebar & UI (containers) --- */
.vector-column-start,
#vector-toc-pinned-container,
.vector-toc,
#toc, .toc,
.vector-toc-landmark,
#mw-panel-toc,
.sidebar,
.vector-pinnable-element,
.vector-settings,
#mw-panel,
.mw-sidebar,
.vector-page-toolbar,
footer,
#mw-head,
.mw-header {
  background-color: #ffffff !important;
}

/* --- PROTECT Wikipedia Native Sidebar & UI (all elements) --- */
.vector-column-start *,
#vector-toc-pinned-container *,
.vector-toc *,
#toc *, .toc *,
.vector-toc-landmark *,
#mw-panel-toc *,
.sidebar *,
.vector-pinnable-element *,
.vector-settings *,
#mw-panel *,
.mw-sidebar *,
nav, nav *,
.vector-page-toolbar *,
#p-lang-btn,
.mw-portlet, .mw-portlet *,
footer *,
#mw-head *,
.mw-header * {
  font-size: revert !important;
  color: revert !important;
  line-height: revert !important;
  font-family: revert !important;
  letter-spacing: revert !important;
  word-spacing: revert !important;
  text-align: revert !important;
  margin-bottom: revert !important;
  max-width: revert !important;
  font-style: revert !important;
  font-weight: revert !important;
}
`;

    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);

    console.log("[NeuroRead/Groq] Dynamic formatting applied.");
    console.log("Groq's payload:", payload);
  }

  function removeStyles() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  // Public API exposed to popup / orchestrator
  window.NR_Formatting = {
    activate: async function () {
      try {
        const payload = await fetchSettings();
        injectStyles(payload);
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
})();
