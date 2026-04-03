window.NR_TTS = (function() {
  'use strict';

  let currentUtterance = null;
  let speed = 1.0;

  function setSpeed(newSpeed) {
    speed = newSpeed;
  }

  function play() {
    if (currentUtterance) {
      window.speechSynthesis.cancel();
    }
    
    // We get text from DOM capturing
    const { sentences } = window.NR_DOMCapture.extractVisibleSentences();
    if (!sentences || sentences.length === 0) return;

    // Join all extracted text
    const fullText = sentences.map(s => s.text).join(' ');

    currentUtterance = new SpeechSynthesisUtterance(fullText);
    currentUtterance.rate = speed;
    currentUtterance.lang = "en-US";
    
    window.speechSynthesis.speak(currentUtterance);
  }

  function stop() {
    if (window.speechSynthesis) {
       window.speechSynthesis.cancel();
    }
    currentUtterance = null;
  }

  return { play, stop, setSpeed };
})();
