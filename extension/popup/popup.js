document.addEventListener("DOMContentLoaded", () => {
  const btnActivate = document.getElementById("btn-activate");
  const btnDeactivate = document.getElementById("btn-deactivate");
  const status = document.getElementById("status");

  async function getTabId() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith("chrome://")) {
      status.textContent = "Open a real webpage first.";
      return null;
    }
    return tab.id;
  }

  async function ensureInjected(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "PING" });
    } catch {
      // Not injected yet — inject now
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["features/formatting.js"],
      });
    }
  }

  btnActivate.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;

    status.textContent = "Injecting…";

    await ensureInjected(tabId);

    // Tell the content script to activate formatting
    chrome.tabs.sendMessage(tabId, { type: "ACTIVATE_FORMATTING" }, (res) => {
      if (chrome.runtime.lastError) {
        status.textContent = "Error: " + chrome.runtime.lastError.message;
        return;
      }
      status.textContent = res && res.success ? "✅ Formatting applied!" : "❌ " + (res ? res.error : "Unknown");
    });
  });

  btnDeactivate.addEventListener("click", async () => {
    const tabId = await getTabId();
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { type: "DEACTIVATE_FORMATTING" });
    status.textContent = "Deactivated.";
  });
});
