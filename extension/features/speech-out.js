// NeuroRead AI — speech-out.js
// Module 4: Text-to-Speech with Paragraph Highlighting
// Content script sends text to background.js which uses chrome.tts API.
// Background sends highlight events back here.

(function () {
  "use strict";
  if (window.__NR_SPEECH_OUT_LOADED) return;
  window.__NR_SPEECH_OUT_LOADED = true;

  const STYLE_ID = "nr-speech-style";

  // Inject highlight styles
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      .nr-reading-active {
        background-color: #FBBF24 !important;
        color: #1A1A1A !important;
        border-radius: 4px;
        padding: 4px 6px;
        transition: background-color 0.3s ease;
        outline: 2px solid #F59E0B;
      }
    `;
    document.head.appendChild(styleEl);
  }

  let readableElements = [];

  /**
   * Collects all readable paragraphs from the page.
   */
  function getReadableElements() {
    const container = document.querySelector('article, main, .content, .mw-parser-output') || document.body;
    return Array.from(container.querySelectorAll('p, li, blockquote, dd'))
      .filter(el => {
        const text = el.innerText.trim();
        return text.length > 30 && el.offsetParent !== null && !el.closest('nav, footer, aside, .nav, .menu');
      });
  }

  /**
   * Remove all highlights.
   */
  function clearHighlights() {
    document.querySelectorAll('.nr-reading-active').forEach(el => {
      el.classList.remove('nr-reading-active');
    });
  }

  // Listen for highlight/done/fallback events from background.js
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TTS_HIGHLIGHT") {
      clearHighlights();
      if (readableElements[msg.index]) {
        readableElements[msg.index].classList.add('nr-reading-active');
        readableElements[msg.index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    if (msg.type === "TTS_DONE") {
      clearHighlights();
      readableElements = [];
      speechSynthesis.cancel();
    }
    // Fallback: background couldn't use chrome.tts, use speechSynthesis here
    if (msg.type === "TTS_SPEAK_FALLBACK") {
      clearHighlights();
      if (readableElements[msg.index]) {
        readableElements[msg.index].classList.add('nr-reading-active');
        readableElements[msg.index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg.text);
      utterance.rate = 0.9;
      utterance.lang = "en-US";
      utterance.onend = () => {
        if (readableElements[msg.index]) {
          readableElements[msg.index].classList.remove('nr-reading-active');
        }
      };
      speechSynthesis.speak(utterance);
    }
  });

  // Public API
  window.NR_SpeechOut = {
    activate: function () {
      readableElements = getReadableElements();
      if (readableElements.length === 0) {
        return { success: false, error: "No readable content found." };
      }

      // Extract text and send to background for chrome.tts
      const paragraphTexts = readableElements.map(el => el.innerText.trim());

      chrome.runtime.sendMessage({
        type: "TTS_START",
        paragraphs: paragraphTexts
      });

      return { success: true };
    },

    deactivate: function () {
      chrome.runtime.sendMessage({ type: "TTS_STOP" });
      clearHighlights();
      readableElements = [];
      return { success: true };
    },

    pause: function () {
      // chrome.tts doesn't have pause, so we stop
      chrome.runtime.sendMessage({ type: "TTS_STOP" });
    }
  };
})();
