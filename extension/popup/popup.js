document.addEventListener("DOMContentLoaded", () => {
  const btnActivate = document.getElementById("btn-activate");
  const btnDeactivate = document.getElementById("btn-deactivate");
  const btnFocus = document.getElementById("btn-focus");
  const btnFocusOff = document.getElementById("btn-focus-off");
  const status = document.getElementById("status");

  async function getTabId() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith("chrome://")) {
      status.textContent = "Open a real webpage first.";
      return null;
    }
    return tab.id;
  }

  // Inject a file if not already present, then execute a function natively
  async function executeFeature(tabId, file, closureFunc) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: closureFunc
      });
      return results[0].result;
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


});
