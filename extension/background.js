// NeuroRead AI — Service Worker (background.js)
// Proxies fetch requests from content scripts to bypass mixed-content restrictions.

chrome.runtime.onInstalled.addListener(() => {
  console.log("[NeuroRead] Extension installed.");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Proxy HTTP requests so content scripts on HTTPS pages can reach localhost
  if (msg.type === "FETCH") {
    const opts = {
      method: msg.method || "GET",
      headers: msg.headers || {}
    };
    if (msg.body) {
      opts.body = JSON.stringify(msg.body);
    }

    fetch(msg.url, opts)
      .then(res => {
        if (!res.ok) throw new Error("Backend " + res.status);
        return res.json();
      })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));

    return true; // keep channel open for async response
  }

  // Handle toggling network-level adblocking rules
  if (msg.type === "TOGGLE_AD_RULES") {
    if (msg.enable) {
      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ["ruleset_1"]
      }).catch(err => console.error("Could not enable ruleset", err));
    } else {
      chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ["ruleset_1"]
      }).catch(err => console.error("Could not disable ruleset", err));
    }
    sendResponse({ success: true });
    return false;
  }
});
