// NeuroRead AI — ai-text.js
// Module 3: AI Text Simplification
// Harvests text blocks and replaces them with simplified chunks from Llama 3 via Groq.

(function () {
  "use strict";
  if (window.__NR_AI_TEXT_LOADED) return;
  window.__NR_AI_TEXT_LOADED = true;

  const API = "http://localhost:8000/simplify";
  const MIN_LENGTH = 80;    // Don't simplify very short fragments
  const BATCH_SIZE = 10;    // Max chunks per API call

  // CSS for simplified text indication
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .nr-simplifying {
      opacity: 0.5;
      transition: opacity 0.3s ease;
      position: relative;
    }
    .nr-simplified {
      transition: all 0.5s ease;
    }
  `;
  document.head.appendChild(styleEl);

  /**
   * Finds all eligible text containers within the main content area.
   */
  function findTextNodes() {
    // Target main article areas, fallback to body
    const container = document.querySelector('article, main, .content, .mw-parser-output') || document.body;

    // We target common block elements that contain reading text
    const candidates = Array.from(container.querySelectorAll('p, li, blockquote, dd'));

    // Filter by length and visibility
    return candidates.filter(el => {
      const text = el.innerText.trim();
      return text.length >= MIN_LENGTH &&
        el.offsetParent !== null &&
        !el.closest('nav, footer, aside, .nav, .menu');
    });
  }

  async function processBatch(nodes) {
    const textChunks = nodes.map(n => n.innerText.trim());

    // Mark as loading
    nodes.forEach(n => n.classList.add('nr-simplifying'));

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "FETCH",
          url: API,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { text_chunks: textChunks }
        },
        (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) {
            console.error("[NeuroRead/AI] Batch failed:", chrome.runtime.lastError || res?.error);
            nodes.forEach(n => n.classList.remove('nr-simplifying'));
            return resolve(false);
          }

          const simplifiedChunks = res.data.simplified_chunks;

          nodes.forEach((node, i) => {
            node.classList.remove('nr-simplifying');
            if (simplifiedChunks[i]) {
              // Store original if not already stored
              if (!node.dataset.nrOriginal) {
                node.dataset.nrOriginal = node.innerHTML;
              }

              // Replace content. Note: Using innerHTML here because the AI 
              // might return markdown bullets (-) which we can convert 
              // or just wrap in a div. For simplicity, we'll convert 
              // the simplified text to basic HTML if it contains bullets.
              let text = simplifiedChunks[i];
              if (text.includes('- ')) {
                text = text.split('\n').map(line => {
                  if (line.trim().startsWith('- ')) {
                    return `<li>${line.trim().substring(2)}</li>`;
                  }
                  return line;
                }).join('\n');
                if (text.includes('<li>')) {
                  text = `<ul>${text}</ul>`;
                }
              }

              node.innerHTML = text;
              node.classList.add('nr-simplified');
            }
          });
          resolve(true);
        }
      );
    });
  }

  window.NR_AiText = {
    activate: async function () {
      const nodes = findTextNodes();
      if (nodes.length === 0) {
        return { success: false, error: "No readable content found." };
      }

      console.log(`[NeuroRead/AI] Found ${nodes.length} nodes to simplify.`);

      // Process in batches
      for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
        const batch = nodes.slice(i, i + BATCH_SIZE);
        await processBatch(batch);
      }

      return { success: true };
    },

    deactivate: function () {
      const nodes = document.querySelectorAll('[data-nr-original]');
      nodes.forEach(node => {
        node.innerHTML = node.dataset.nrOriginal;
        node.classList.remove('nr-simplified');
        // Clean up dataset
        delete node.dataset.nrOriginal;
      });
      console.log("[NeuroRead/AI] Originals restored.");
    }
  };
})();
