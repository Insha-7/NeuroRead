chrome.runtime.onInstalled.addListener(() => {
  console.log("NeuroRead AI Extension Installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ECHO") {
    sendResponse({ echo: true });
  } else if (message.type === "FETCH_BACKEND") {
    fetch(message.url, {
      method: message.method || "GET",
      headers: message.headers || {},
      body: message.body ? JSON.stringify(message.body) : null
    })
    .then(async res => {
      if (!res.ok) throw new Error("Backend Returned " + res.status);
      return res.json();
    })
    .then(data => sendResponse({ success: true, data: data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // Keep message channel open for async fetch
  }
  return true;
});
