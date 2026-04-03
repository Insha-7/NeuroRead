// NeuroRead AI — speech-in.js
// Module 4: Voice Command Input
// Records audio from the mic, sends to Groq Whisper, and executes matched commands.

(function () {
  "use strict";
  if (window.__NR_SPEECH_IN_LOADED) return;
  window.__NR_SPEECH_IN_LOADED = true;

  const API = "http://localhost:8000/voice";
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // Supported voice commands
  const COMMANDS = {
    "simplify": () => { if (window.NR_AiText) window.NR_AiText.activate(); },
    "format": () => { if (window.NR_Formatting) window.NR_Formatting.activate(); },
    "read": () => { if (window.NR_SpeechOut) window.NR_SpeechOut.activate(); },
    "stop": () => { if (window.NR_SpeechOut) window.NR_SpeechOut.deactivate(); },
    "scroll down": () => { window.scrollBy({ top: 500, behavior: 'smooth' }); },
    "scroll up": () => { window.scrollBy({ top: -500, behavior: 'smooth' }); },
    "go to top": () => { window.scrollTo({ top: 0, behavior: 'smooth' }); },
    "undo": () => {
      if (window.NR_AiText) window.NR_AiText.deactivate();
      if (window.NR_Formatting) window.NR_Formatting.deactivate();
    }
  };

  /**
   * Match transcription to a known command (fuzzy).
   */
  function matchCommand(text) {
    const lower = text.toLowerCase().trim();
    for (const [key, fn] of Object.entries(COMMANDS)) {
      if (lower.includes(key)) {
        return { command: key, execute: fn };
      }
    }
    return null;
  }

  /**
   * Start recording from the microphone.
   */
  async function startRecording() {
    if (isRecording) return { success: false, error: "Already recording" };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        isRecording = false;

        // Send to backend for transcription
        const transcription = await sendToBackend(audioBlob);
        if (transcription) {
          console.log("%c🎤 NeuroRead Voice Heard: " + transcription, "background: #DC2626; color: white; font-size: 16px; padding: 6px 12px; border-radius: 4px;");
          const match = matchCommand(transcription);
          if (match) {
            console.log("%c✅ Executing command: " + match.command, "background: #059669; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;");
            match.execute();
          } else {
            console.log("%c❌ No matching command for: " + transcription, "background: #D97706; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;");
          }
        } else {
          console.log("%c🎤 NeuroRead: Could not transcribe audio", "background: #333; color: #aaa; font-size: 14px; padding: 4px 8px;");
        }
      };

      mediaRecorder.start();
      isRecording = true;

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);

      return { success: true, message: "Recording for 5 seconds..." };
    } catch (err) {
      console.error("[NeuroRead/Voice] Mic error:", err);
      return { success: false, error: "Microphone access denied" };
    }
  }

  /**
   * Send the recorded audio blob to the backend via background.js proxy.
   */
  function sendToBackend(audioBlob) {
    return new Promise((resolve) => {
      // Convert blob to base64 to send via message passing
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];

        chrome.runtime.sendMessage(
          {
            type: "FETCH_AUDIO",
            url: API,
            audioBase64: base64,
            filename: "recording.webm"
          },
          (res) => {
            if (chrome.runtime.lastError || !res || !res.ok) {
              console.error("[NeuroRead/Voice] Transcription failed:", chrome.runtime.lastError || res?.error);
              resolve(null);
              return;
            }
            resolve(res.data.transcription || "");
          }
        );
      };
      reader.readAsDataURL(audioBlob);
    });
  }

  // Public API
  window.NR_SpeechIn = {
    activate: function () {
      return startRecording();
    },
    deactivate: function () {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      isRecording = false;
    }
  };
})();
