document.addEventListener('DOMContentLoaded', () => {
  const btnTest = document.getElementById('btn-test');

  async function ensureContentScripts(tabId) {
    try {
      // Try messaging the tab to check if script is already present
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      console.log('Scripts already injected.');
    } catch (e) {
      // Content scripts not injected — inject them now
      console.log('Injecting content scripts into tab', tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
            'content/lru-cache.js',
            'content/trie-index.js',
            'content/dom-capture.js',
            'content/content.js'
        ]
      });
    }
  }

  btnTest.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert("No active tab found. Try on a real webpage, not a blank tab.");
        return;
      }

      const isChromeURL = tab.url.startsWith("chrome://") || tab.url.startsWith("edge://");
      if (isChromeURL) {
         alert("Cannot inject scripts into browser setting pages. Please go to a normal website (e.g. google.com).");
         return;
      }

      btnTest.innerText = "Injecting...";
      
      // 1. Force inject our script
      await ensureContentScripts(tab.id);

      // 2. Send the test signal
      chrome.tabs.sendMessage(tab.id, { type: 'TEST_INJECTION' }, (response) => {
        if (chrome.runtime.lastError) {
           btnTest.innerText = "Error - Check Console";
           console.error(chrome.runtime.lastError.message);
        } else {
           btnTest.innerText = "Success! Look at the page!";
           btnTest.style.background = "#10B981"; // green
        }
      });

    } catch (err) {
      console.error('Activation error:', err);
      btnTest.innerText = "Failed";
    }
  });
});
