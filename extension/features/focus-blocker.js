// NeuroRead AI — focus-blocker.js
// Module 2: Focus & Ad-Block System
// Hides DOM-based ad overlays, popups, and automatically stops autoplaying media.

(function () {
  "use strict";
  if (window.__NR_FOCUSBLOCK_LOADED) return;
  window.__NR_FOCUSBLOCK_LOADED = true;

  const STYLE_ID = "nr-focusblock-style";
  let observer = null;

  // Broad CSS selection for common ad containers and annoying sticky popups
  function injectHidingCSS() {
    removeStyles();
    
    const css = `
      /* Common Ad Containers */
      .ad, .ads, .advertisement, .ad-container, .ad-slot, .ad-banner,
      [id^="div-gpt-ad-"], [class*="google_ads"], [id^="google_ads"],
      [id^="taboola-"], [class*="taboola"], [class*="outbrain"],
      [id^="outbrain"], iframe[name^="google_ads"],
      /* Cookie & Newsletter Popups */
      [class*="cookie-banner"], [id*="cookie-banner"], [class*="newsletter"], 
      [id*="newsletter"], [class*="popup-overlay"], .fc-consent-root,
      #onetrust-consent-sdk, .cc-window, .qc-cmp2-container
      {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;

    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function removeStyles() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  // Find all <audio> and <video> elements on the page and forcefully pause them.
  // We use MutationObserver to catch auto-playing videos that inject later.
  function stopAutoplay() {
    const haltMedia = () => {
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach(media => {
        // Strip out autoplay attribute
        if (media.hasAttribute('autoplay')) {
          media.removeAttribute('autoplay');
        }
        // Force pause
        if (!media.paused) {
          media.pause();
          console.log("[NeuroRead] Halted autoplaying media.");
        }
      });
    };

    haltMedia(); // Run immediately

    // Watch for new video elements injected by SPA frameworks or ad scripts
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        mutations.forEach(m => {
          if (m.addedNodes.length > 0) shouldCheck = true;
        });
        if (shouldCheck) haltMedia();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function allowAutoplay() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function enableNetworkBlocking() {
    chrome.runtime.sendMessage({ type: "TOGGLE_AD_RULES", enable: true });
  }

  function disableNetworkBlocking() {
    chrome.runtime.sendMessage({ type: "TOGGLE_AD_RULES", enable: false });
  }

  // Public API exposed to popup
  window.NR_FocusBlock = {
    activate: function () {
      console.log("[NeuroRead] Activating Focus & Ad Blocker...");
      injectHidingCSS();
      stopAutoplay();
      enableNetworkBlocking(); // Tell background to activate NetRequest rules
      return { success: true };
    },
    deactivate: function () {
      console.log("[NeuroRead] Deactivating Focus & Ad Blocker...");
      removeStyles();
      allowAutoplay();
      disableNetworkBlocking();
      return { success: true };
    },
  };

})();
