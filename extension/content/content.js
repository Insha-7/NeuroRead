(function() {
  'use strict';

  if (window._NR_INITIALIZED) return;
  window._NR_INITIALIZED = true;

  console.log("[NeuroRead AI] Content script injected. Ready for features.");

  const PROFILE_STYLE_ID = 'nr-profile-styles';
  let currentProfile = null;
  let isTransformed = false;

  async function injectProfileCSS(profileId) {
    if (!profileId) return;

    try {
      const profileStr = await new Promise((resolve, reject) => {
         chrome.runtime.sendMessage({
            type: 'FETCH_BACKEND',
            url: `http://localhost:8000/profile/${profileId}`,
            method: 'GET'
         }, response => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!response.success) reject(new Error(response.error));
            else resolve(response.data);
         });
      });
      
      const profile = profileStr;

      // Remove existing
      const existing = document.getElementById(PROFILE_STYLE_ID);
      if (existing) existing.remove();

      // Inject new profile CSS
      const style = document.createElement('style');
      style.id = PROFILE_STYLE_ID;
      style.setAttribute('data-neuroread', 'true');
      
      let css = profile.css;
      if (chrome.runtime && chrome.runtime.id) {
        css = css.replace(/__EXTENSION_ID__/g, chrome.runtime.id);
      }
      style.textContent = css;
      document.head.appendChild(style);

      // Apply initial features
      if (profile.features) {
         if (profile.features.adhdColours && window.NR_ADHDColours) window.NR_ADHDColours.activate();
         if (profile.features.focusMode && window.NR_FocusMode) window.NR_FocusMode.toggle(true);
         if (profile.features.readingRuler && window.NR_ReadingRuler) window.NR_ReadingRuler.toggle(true);
      }
      if (profile.ttsSpeed && window.NR_TTS) {
         window.NR_TTS.setSpeed(profile.ttsSpeed);
      }

      console.log(`[NeuroRead] Profile "${profile.name}" injected.`);
    } catch (err) {
      console.error('[NeuroRead] CSS Injection Failed:', err);
    }
  }

  async function transformPage() {
    if (!currentProfile) return;
    console.log('[NeuroRead] Transforming page...');

    try {
        const { sentences, nodeMap } = window.NR_DOMCapture.extractVisibleSentences();
        if (sentences.length === 0) return;

        window.NR_TrieIndex.build(nodeMap);
        await injectProfileCSS(currentProfile);

        const { hits, misses } = await window.NR_Cache.checkBatch(sentences);
        let aiResult = { sentences: [], idioms: [] };
        let finalCamScore = 1.0;
        let needsTone = false;
        let finalTone = "low";

        // To prevent Groq Token exhaustion and JSON Parsing errors on 1000+ sentence pages (like Wikipedia),
        // we chunk the requests into smaller batches of 25 sentences.
        const BATCH_SIZE = 25;
        for (let i = 0; i < misses.length; i += BATCH_SIZE) {
            const chunk = misses.slice(i, i + BATCH_SIZE);
            const reqBody = { sentences: chunk.map(m => ({ id: m.id, text: m.text })) };
            
            try {
                const resBatch = await new Promise((resolve, reject) => {
                   chrome.runtime.sendMessage({
                      type: 'FETCH_BACKEND', url: 'http://localhost:8000/analyze',
                      method: 'POST', headers: { "Content-Type": "application/json" }, body: reqBody
                   }, response => {
                      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                      else if (!response.success) reject(new Error(response.error));
                      else resolve(response.data);
                   });
                });

                if (resBatch.sentences) {
                   window.NR_Cache.storeBatch(chunk, resBatch.sentences);
                   aiResult.sentences.push(...resBatch.sentences);
                }
                if (resBatch.idioms) aiResult.idioms.push(...resBatch.idioms);
                if (resBatch.cam) finalCamScore = resBatch.cam.score;
                if (resBatch.needs_tone_warning) needsTone = true;
                if (resBatch.page_tone === 'medium' || resBatch.page_tone === 'high') finalTone = resBatch.page_tone;

            } catch (err) {
                console.warn(`[NeuroRead] Batch ${i} failed. Error:`, err);
                // Continue to next batch if one fails rather than breaking entire page.
            }
        }

        const allResults = [...hits, ...(aiResult.sentences || [])];
        
        // Modules
        if (window.NR_Simplify) {
           const count = window.NR_Simplify.apply(allResults);
           console.log(`[NeuroRead] Simplifications applied: ${count}`);
        }
        if (window.NR_IdiomUI && aiResult.idioms.length > 0) window.NR_IdiomUI.render(aiResult.idioms);
        if (window.NR_ToneBanner && needsTone) window.NR_ToneBanner.show(finalTone);
        
        // Notify popup of score
        chrome.runtime.sendMessage({ type: 'CAM_UPDATE', data: { score: finalCamScore, label: finalCamScore > 0.7 ? "Hard" : "Easy" } }).catch(()=>{});

        isTransformed = true;
    } catch (err) {
        console.error('[NeuroRead] Transformation error:', err);
    }
  }

  function resetPage() {
    if (window.NR_Simplify) window.NR_Simplify.restore();
    if (window.NR_IdiomUI) window.NR_IdiomUI.remove();
    if (window.NR_ToneBanner) window.NR_ToneBanner.remove();
    if (window.NR_FocusMode) window.NR_FocusMode.deactivate();
    if (window.NR_ReadingRuler) window.NR_ReadingRuler.deactivate();
    if (window.NR_TTS) window.NR_TTS.stop();
    if (window.NR_ADHDColours) window.NR_ADHDColours.deactivate();
    if (window.NR_Voice) window.NR_Voice.stopListening();
    
    const style = document.getElementById(PROFILE_STYLE_ID);
    if (style) style.remove();
    
    currentProfile = null;
    isTransformed = false;
  }

  // Globally expose for Voice Commands
  window.NR_transformPage = transformPage;
  window.NR_resetPage = resetPage;

  // Messaging routing
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ ready: true });
    }
    // Main UI Controls
    else if (message.type === 'PROFILE_CHANGED') {
      currentProfile = message.data.activeProfile;
      if (currentProfile) transformPage();
      else resetPage();
      sendResponse({ received: true });
    }
    else if (message.type === 'DEACTIVATE') {
      resetPage();
      sendResponse({ received: true });
    }
    else if (message.type === 'FEATURE_TOGGLED') {
      const { feature, enabled } = message.data;
      if (feature === 'focusMode' && window.NR_FocusMode) window.NR_FocusMode.toggle(enabled);
      else if (feature === 'readingRuler' && window.NR_ReadingRuler) window.NR_ReadingRuler.toggle(enabled);
      else if (feature === 'tts' && window.NR_TTS) { enabled ? window.NR_TTS.play() : window.NR_TTS.stop(); }
      else if (feature === 'adhdColours' && window.NR_ADHDColours) window.NR_ADHDColours.toggle(enabled);
      else if (feature === 'voiceCommands' && window.NR_Voice) { enabled ? window.NR_Voice.startListening() : window.NR_Voice.stopListening(); }
      sendResponse({ received: true });
    }
    return true;
  });

})();
