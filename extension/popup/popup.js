document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const btnVoice = document.getElementById("btn-voice");
  
  const toggles = {
    formatting: document.getElementById("toggle-formatting"),
    focus: document.getElementById("toggle-focus"),
    simplify: document.getElementById("toggle-simplify"),
    read: document.getElementById("toggle-read"),
    toc: document.getElementById("toggle-toc"),
    ruler: document.getElementById("toggle-ruler"),
    focusMode: document.getElementById("toggle-focus-mode")
  };

  const sliders = {
    fontSize: { el: document.getElementById("font-size-slider"), val: document.getElementById("font-size-val"), suffix: "px" },
    lineSpacing: { el: document.getElementById("line-spacing-slider"), val: document.getElementById("line-spacing-val"), suffix: "" }
  };

  const profileCards = document.querySelectorAll(".profile-card");

  async function getTabId() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith("chrome://")) {
      status.textContent = "Open a real webpage first.";
      return null;
    }
    return tab.id;
  }

  // Inject a file if not already present, then execute a function natively (Across ALL frames payload)
  async function executeFeature(tabId, file, closureFunc) {
    try {
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: [file] });
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: closureFunc
      });
      return results && results.length > 0 ? results[0].result : { success: false };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Storage wrappers
  async function saveState() {
    const state = {
      formatting: toggles.formatting.checked,
      focus: toggles.focus.checked,
      simplify: toggles.simplify.checked,
      read: toggles.read.checked,
      toc: toggles.toc.checked,
      ruler: toggles.ruler.checked,
      focusMode: toggles.focusMode.checked,
      activeProfile: document.querySelector('.profile-card.active')?.dataset.preset || 'custom',
      typographyOverrides: {
        fontSize: sliders.fontSize.el.value,
        lineSpacing: sliders.lineSpacing.el.value
      }
    };
    await chrome.storage.local.set({ nrState: state });
  }

  async function loadState() {
    const res = await chrome.storage.local.get("nrState");
    if (res.nrState) {
      Object.keys(toggles).forEach(k => {
        if (res.nrState[k] !== undefined) toggles[k].checked = res.nrState[k];
      });
      if (res.nrState.typographyOverrides) {
        if (res.nrState.typographyOverrides.fontSize) {
          sliders.fontSize.el.value = res.nrState.typographyOverrides.fontSize;
          sliders.fontSize.val.textContent = sliders.fontSize.el.value + sliders.fontSize.suffix;
        }
        if (res.nrState.typographyOverrides.lineSpacing) {
          sliders.lineSpacing.el.value = res.nrState.typographyOverrides.lineSpacing;
          sliders.lineSpacing.val.textContent = sliders.lineSpacing.el.value + sliders.lineSpacing.suffix;
        }
      }
      setProfileActive(res.nrState.activeProfile || 'custom');
    }
  }

  function setProfileActive(preset) {
    profileCards.forEach(c => c.classList.remove('active'));
    const target = document.querySelector(`.profile-card[data-preset="${preset}"]`);
    if (target) target.classList.add('active');
  }

  /* ---------------------------------
   * FEATURE EXECUTION MAP
   * --------------------------------- */
  const features = {
    formatting: {
      file: "features/formatting.js",
      on: function() { return window.NR_Formatting.activate(); },
      off: function() { return window.NR_Formatting.deactivate(); }
    },
    focus: {
      file: "features/focus-blocker.js",
      on: function() { return window.NR_FocusBlock.activate(); },
      off: function() { return window.NR_FocusBlock.deactivate(); }
    },
    simplify: {
      file: "features/ai-text.js",
      on: function() { return window.NR_AiText.activate(); },
      off: function() { return window.NR_AiText.deactivate(); }
    },
    read: {
      file: "features/speech-out.js",
      on: function() { return window.NR_SpeechOut.activate(); },
      off: function() { return window.NR_SpeechOut.deactivate(); }
    },
    toc: {
      file: "features/visual-enhancement.js",
      on: function() { return window.NR_Visual.activate(); },
      off: function() { return window.NR_Visual.deactivate(); }
    },
    ruler: {
      file: "features/read-ruler.js",
      on: function() { return window.NR_ReadRuler.activate(); },
      off: function() { return window.NR_ReadRuler.deactivate(); }
    },
    focusMode: {
      file: "features/focus-mode.js",
      on: function() { return window.NR_FocusMode.activate(); },
      off: function() { return window.NR_FocusMode.deactivate(); }
    }
  };

  async function toggleFeature(key, turnOn) {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = turnOn ? `Activating ${key}…` : `Deactivating ${key}…`;
    
    const feat = features[key];
    const func = turnOn ? feat.on : feat.off;
    const res = await executeFeature(tabId, feat.file, func);
    
    if (res && res.error) {
       status.textContent = `❌ ${res.error}`;
    } else {
       status.textContent = "Ready.";
    }
  }

  // Attach Toggle Listeners
  Object.keys(toggles).forEach(key => {
    toggles[key].addEventListener('change', async (e) => {
      setProfileActive('custom'); // Manual toggle switches to custom mode
      await toggleFeature(key, e.target.checked);
      await saveState();
    });
  });

  // Attach Slider Listeners
  Object.keys(sliders).forEach(key => {
    const s = sliders[key];
    s.el.addEventListener('input', async (e) => {
      s.val.textContent = e.target.value + s.suffix;
      setProfileActive('custom');
      await saveState();
    });
  });

  /* ---------------------------------
   * USER PROFILES (PRESETS)
   * --------------------------------- */
  const presets = {
    adhd: { formatting: true, focus: true, focusMode: true, simplify: false, read: false, toc: true, ruler: true },
    dyslexia: { formatting: true, focus: false, focusMode: false, simplify: true, read: true, toc: false, ruler: true },
    autism: { formatting: true, focus: true, focusMode: true, simplify: true, read: false, toc: false, ruler: false }
  };

  profileCards.forEach(card => {
    card.addEventListener('click', async () => {
      const presetName = card.dataset.preset;
      setProfileActive(presetName);
      
      if (presetName !== 'custom' && presets[presetName]) {
        // Apply preset
        const config = presets[presetName];
        status.textContent = `Applying ${presetName.toUpperCase()} Profile…`;
        
        for (const key of Object.keys(toggles)) {
          const shouldBeOn = config[key];
          if (toggles[key].checked !== shouldBeOn) {
            toggles[key].checked = shouldBeOn;
            await toggleFeature(key, shouldBeOn);
          }
        }
        status.textContent = `${presetName.toUpperCase()} Profile Active`;
      }
      await saveState();
    });
  });

  /* ---------------------------------
   * VOICE COMMAND (Always manual)
   * --------------------------------- */
  btnVoice.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    
    btnVoice.classList.add("listening");
    btnVoice.textContent = "🎤 Listening...";
    
    // Inject dependencies
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/formatting.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/ai-text.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/speech-out.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/visual-enhancement.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/read-ruler.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/focus-mode.js"] });
    
    const res = await executeFeature(tabId, "features/speech-in.js", function() { return window.NR_SpeechIn.activate(); });
    
    setTimeout(() => {
      btnVoice.classList.remove("listening");
      btnVoice.textContent = "🎤 Listen";
    }, 5000);
    
    if (res && res.error) status.textContent = `❌ ${res.error}`;
  });

  // Init
  await loadState();
});
