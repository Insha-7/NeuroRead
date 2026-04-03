(function() {
  'use strict';

  // Prevent double initialization if injected twice
  if (window._NR_INITIALIZED) return;
  window._NR_INITIALIZED = true;

  console.log("[NeuroRead AI] Content script injected successfully");

  // Message listener from popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    
    if (message.type === 'PING') {
      sendResponse({ ready: true });
      return true;
    }

    if (message.type === 'TEST_INJECTION') {
      (async function() {
        try {
          // 1. Capture sentences
          const { sentences, nodeMap } = window.NR_DOMCapture.extractVisibleSentences();
          if (sentences.length === 0) {
            sendResponse({ success: false, message: "No text found on page." });
            return;
          }

          // 2. Build Trie map
          window.NR_TrieIndex.build(nodeMap);

          // 3. Check Cache
          const { hits, misses } = await window.NR_Cache.checkBatch(sentences);
          
          let aiResult = { sentences: [] };
          
          // 4. Hit Backend
          if (misses.length > 0) {
            const reqBody = { sentences: misses.map(m => ({ id: m.id, text: m.text })) };
            console.log("[NeuroRead] Sending to backend via service worker...");
            
            const aiResultStr = await new Promise((resolve, reject) => {
               chrome.runtime.sendMessage({
                  type: 'FETCH_BACKEND',
                  url: 'http://localhost:8000/analyze',
                  method: 'POST',
                  headers: { "Content-Type": "application/json" },
                  body: reqBody
               }, response => {
                  if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                  else if (!response.success) reject(new Error(response.error));
                  else resolve(response.data);
               });
            });
            
            aiResult = aiResultStr;
            
            // 5. Store new results in cache
            if (aiResult.sentences) {
               window.NR_Cache.storeBatch(misses, aiResult.sentences);
            }
          }

          const allResults = [...hits, ...(aiResult.sentences || [])];
          
          // 6. Replace DOM text without breaking elements
          let replacements = 0;
          for (const res of allResults) {
            if (res.simplified) {
              window.NR_TrieIndex.replaceText(res.id, res.simplified);
              replacements++;
            }
          }

          // Show Success visual
          const banner = document.createElement('div');
          banner.id = "nr-test-banner";
          banner.style.cssText = "position: fixed; bottom: 0; left: 0; width: 100vw; background: #6A0DAD; color: white; text-align: center; padding: 10px; z-index: 999999; font-weight: bold; font-family: system-ui;";
          banner.innerText = `NeuroRead AI: Replaced ${replacements} complex sentences. CAM Score: ${aiResult.cam ? aiResult.cam.score.toFixed(2) : 'Cached'}`;
          document.body.appendChild(banner);
          setTimeout(() => banner.remove(), 4000);

          console.log("[NeuroRead] Transformation complete. Idioms found:", aiResult.idioms);
          
        } catch(err) {
          console.error("[NeuroRead AI] Test Failed:", err);
          alert("NeuroRead AI test failed: " + err.message);
        }
      })();
      sendResponse({ received: true });
      return true;
    }

    return true;
  });
})();
