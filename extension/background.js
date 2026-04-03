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
  } else if (message.type === "PROCESS_VOICE") {
    
    // We get audioBase64 from content script. It looks like: "data:audio/webm;base64,GkXf..."
    const b64Data = message.audioBase64.split(',')[1];
    const binary = atob(b64Data);
    const array = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([array], {type: 'audio/webm'});
    
    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");

    fetch("http://localhost:8000/voice", {
      method: "POST",
      body: formData
    })
    .then(async res => {
       if (!res.ok) throw new Error("Backend Returned " + res.status);
       return res.json();
    })
    .then(data => sendResponse({ success: true, data: data }))
    .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
  return true;
});
