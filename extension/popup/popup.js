document.addEventListener('DOMContentLoaded', () => {
  let selectedProfile = null;
  let isActive = false;
  let currentTabId = null;

  const cards = document.querySelectorAll('.profile-card');
  const btnActivate = document.getElementById('btn-activate');
  const btnDeactivate = document.getElementById('btn-deactivate');
  const statusBar = document.getElementById('status-bar');
  const camBadge = document.getElementById('cam-badge');
  const ttsBtn = document.getElementById('btn-tts-play');

  // Load UI State
  chrome.storage.local.get(['activeProfile', 'isActive'], (data) => {
     if (data.activeProfile) {
        selectedProfile = data.activeProfile;
        cards.forEach(c => {
           if (c.dataset.profile === selectedProfile) c.classList.add('selected');
        });
     }
     if (data.isActive) {
        isActive = true;
        btnActivate.style.opacity = '0.5';
        btnActivate.innerText = "Active";
        btnDeactivate.style.opacity = '1';
        statusBar.innerText = "System Active";
        statusBar.className = "status-bar active";
     }
  });

  // Select profile
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedProfile = card.dataset.profile;
      
      if (isActive && currentTabId) {
         chrome.storage.local.set({ activeProfile: selectedProfile });
         chrome.tabs.sendMessage(currentTabId, {
            type: 'PROFILE_CHANGED', data: { activeProfile: selectedProfile }
         }).catch(()=>{});
      }
    });
  });

  async function ensureInjection() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;
    currentTabId = tab.id;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    } catch {
      await chrome.scripting.executeScript({
         target: { tabId: tab.id },
         files: [
            'content/lru-cache.js',
            'content/trie-index.js',
            'content/dom-capture.js',
            'content/features/simplify.js',
            'content/features/idiom-ui.js',
            'content/features/tone-banner.js',
            'content/features/focus-mode.js',
            'content/features/reading-ruler.js',
            'content/features/tts.js',
            'content/features/adhd-colours.js',
            'content/features/voice.js',
            'content/content.js'
         ]
      });
    }
    return tab.id;
  }

  btnActivate.addEventListener('click', async () => {
    if (!selectedProfile) {
        statusBar.innerText = "Please select a profile";
        return;
    }
    
    statusBar.className = "status-bar processing";
    statusBar.innerText = "Injecting models...";
    
    const tabId = await ensureInjection();
    if (!tabId) return;

    chrome.storage.local.set({ activeProfile: selectedProfile, isActive: true });
    
    // Command content script
    chrome.tabs.sendMessage(tabId, {
       type: 'PROFILE_CHANGED', data: { activeProfile: selectedProfile }
    }, () => {
       isActive = true;
       btnActivate.style.opacity = '0.5';
       btnActivate.innerText = "Active";
       statusBar.innerText = "System Active";
       statusBar.className = "status-bar active";
    });
  });

  btnDeactivate.addEventListener('click', async () => {
     chrome.storage.local.set({ isActive: false });
     isActive = false;
     btnActivate.style.opacity = '1';
     btnActivate.innerText = "✨ Activate";
     statusBar.innerText = "System Deactivated";
     statusBar.className = "status-bar";
     
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'DEACTIVATE' }).catch(()=>{});
     }
  });

  // Toggles
  const toggles = ['focusMode', 'readingRuler', 'adhdColours', 'voiceCommands'];
  toggles.forEach(t => {
     const el = document.getElementById(`toggle-${t}`);
     if (!el) return;
     el.addEventListener('change', async (e) => {
        if (!isActive) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
           chrome.tabs.sendMessage(tab.id, {
              type: 'FEATURE_TOGGLED', data: { feature: t, enabled: e.target.checked }
           }).catch(()=>{});
        }
     });
  });

  // TTS Toggle
  let ttsActive = false;
  ttsBtn.addEventListener('click', async () => {
     if (!isActive) return;
     ttsActive = !ttsActive;
     ttsBtn.innerText = ttsActive ? "⏹ Stop" : "▶ Play";
     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
     if (tab) {
        chrome.tabs.sendMessage(tab.id, {
           type: 'FEATURE_TOGGLED', data: { feature: 'tts', enabled: ttsActive }
        }).catch(()=>{});
     }
  });

  // Listen for CAM updates
  chrome.runtime.onMessage.addListener((msg) => {
     if (msg.type === 'CAM_UPDATE') {
        const score = msg.data.score.toFixed(2);
        camBadge.innerText = `CAM: ${score}`;
        camBadge.style.color = msg.data.label === "Hard" ? "#ef4444" : (msg.data.label === "Medium" ? "#f59e0b" : "#10b981");
        camBadge.style.borderColor = camBadge.style.color;
        camBadge.style.background = `${camBadge.style.color}20`;
     }
  });
});
