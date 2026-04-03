document.addEventListener("DOMContentLoaded", () => {
  const btnActivate = document.getElementById("btn-activate");
  const btnDeactivate = document.getElementById("btn-deactivate");
  const btnFocus = document.getElementById("btn-focus");
  const btnFocusOff = document.getElementById("btn-focus-off");
  const btnSimplify = document.getElementById("btn-simplify");
  const btnSimplifyOff = document.getElementById("btn-simplify-off");
  const btnRead = document.getElementById("btn-read");
  const btnReadOff = document.getElementById("btn-read-off");
  const btnVoice = document.getElementById("btn-voice");
  const status = document.getElementById("status");

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
      // We return the result from the main frame (usually results[0])
      return results && results.length > 0 ? results[0].result : { success: false, error: "No frames" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /* ---------------------------------
   * MODULE 1: FORMATTING
   * --------------------------------- */
  function cmdFormatAct() { return window.NR_Formatting.activate(); }
  function cmdFormatDeact() { return window.NR_Formatting.deactivate(); }

  btnActivate.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = "Injecting…";
    const res = await executeFeature(tabId, "features/formatting.js", cmdFormatAct);
    status.textContent = res && res.success ? "1. Formatting applied!" : "❌ " + (res && res.error);
  });

  btnDeactivate.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    await executeFeature(tabId, "features/formatting.js", cmdFormatDeact);
    status.textContent = "1. Formatting removed.";
  });

  /* ---------------------------------
   * MODULE 2: FOCUS BLOCKER
   * --------------------------------- */
  function cmdFocusAct() { return window.NR_FocusBlock.activate(); }
  function cmdFocusDeact() { return window.NR_FocusBlock.deactivate(); }

  btnFocus.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = "Activating ad block…";
    await executeFeature(tabId, "features/focus-blocker.js", cmdFocusAct);
    status.textContent = "2. Ads & Autoplay Blocked!";
  });

  btnFocusOff.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    await executeFeature(tabId, "features/focus-blocker.js", cmdFocusDeact);
    status.textContent = "2. Blockers removed.";
  });

  /* ---------------------------------
   * MODULE 3: AI TEXT SIMPLIFICATION
   * --------------------------------- */
  function cmdSimplifyAct() { return window.NR_AiText.activate(); }
  function cmdSimplifyDeact() { return window.NR_AiText.deactivate(); }

  btnSimplify.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = "Simplifying text (AI)…";
    const res = await executeFeature(tabId, "features/ai-text.js", cmdSimplifyAct);
    status.textContent = res && res.success ? "3. Text Simplified!" : "❌ " + (res && res.error);
  });

  btnSimplifyOff.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    await executeFeature(tabId, "features/ai-text.js", cmdSimplifyDeact);
    status.textContent = "3. Originals restored.";
  });

  /* ---------------------------------
   * MODULE 4: READ ALOUD & VOICE CMD
   * --------------------------------- */
  function cmdReadAct() { return window.NR_SpeechOut.activate(); }
  function cmdReadDeact() { return window.NR_SpeechOut.deactivate(); }
  function cmdVoiceAct() { return window.NR_SpeechIn.activate(); }

  btnRead.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = "Reading aloud…";
    const res = await executeFeature(tabId, "features/speech-out.js", cmdReadAct);
    status.textContent = res && res.success ? "4. Reading…" : "❌ " + (res && res.error);
  });

  btnReadOff.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    await executeFeature(tabId, "features/speech-out.js", cmdReadDeact);
    status.textContent = "4. Reading stopped.";
  });

  btnVoice.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    status.textContent = "🎤 Listening (5s)…";
    // Inject all feature scripts so voice commands can call them
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/formatting.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/ai-text.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["features/speech-out.js"] });
    const res = await executeFeature(tabId, "features/speech-in.js", cmdVoiceAct);
    status.textContent = res && res.success ? "🎤 " + (res.message || "Listening…") : "❌ " + (res && res.error);
  });

  /* ---------------------------------
   * MODULE 5: VISUAL ENHANCEMENT
   * --------------------------------- */
  const btnToc = document.getElementById("btn-toc");
  function cmdTocAct() { return window.NR_Visual.activate(); }

  if (btnToc) {
    btnToc.addEventListener("click", async () => {
      const tabId = await getTabId();
      if (!tabId) return;
      status.textContent = "Loading Navigation…";
      const res = await executeFeature(tabId, "features/visual-enhancement.js", cmdTocAct);
      status.textContent = res && res.success ? "5. Navigation opened!" : "❌ " + (res && res.error);
    });
  }

});
