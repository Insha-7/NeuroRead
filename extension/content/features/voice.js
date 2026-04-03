window.NR_Voice = (function() {
  'use strict';

  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;

  async function startListening() {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      isRecording = true;
      console.log("[NeuroRead Voice] Listening...");
      
      // Stop automatically after 5 seconds
      setTimeout(() => {
        if (isRecording) stopListening();
      }, 5000);

    } catch (err) {
      console.error("[NeuroRead Voice] Microphone error:", err);
      alert("Microphone access denied or error: " + err.message);
    }
  }

  function stopListening() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  }

  async function processAudio(blob) {
    console.log("[NeuroRead Voice] Processing audio...");
    
    // We must proxy through service worker to bypass CORS/mixed content
    const base64Audio = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
    });

    // Actually, handling multipart/form-data via Service Worker proxy is tricky.
    // We will decode the base64 -> Blob back in the Service Worker.
    chrome.runtime.sendMessage({
       type: 'PROCESS_VOICE', 
       audioBase64: base64Audio
    }, (response) => {
       if (response && response.success) {
          executeCommand(response.data);
       } else {
          console.error("Voice processing failed:", response ? response.error : chrome.runtime.lastError);
       }
    });
  }

  function executeCommand(info) {
    if (!info.matched) {
      console.log(`[NeuroRead Voice] Ignored: "${info.transcript}"`);
      return;
    }
    
    const banner = document.createElement('div');
    banner.style.cssText = "position: fixed; top: 10px; right: 10px; background: #6A0DAD; color: white; padding: 15px; border-radius: 8px; z-index: 2147483647;";
    banner.innerText = `🎙️ Command: ${info.command}`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3000);

    // Call orchestrator
    if (info.command === "simplify" && window.NR_transformPage) {
        window.NR_transformPage();
    } else if (info.command === "focus" && window.NR_FocusMode) {
        window.NR_FocusMode.toggle(true);
    } else if (info.command === "stop" && window.NR_resetPage) {
        window.NR_resetPage();
    }
  }

  return { startListening, stopListening };
})();
