window.NR_DOMCapture = (function() {
  'use strict';

  function extractVisibleSentences() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip scripts, styles, noscript, etc.
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'canvas', 'svg', 'code'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip hidden elements
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip empty or whitespace-only nodes
          if (!node.nodeValue.trim()) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let idCounter = 1;
    const sentences = [];
    const nodeMap = new Map();

    let currentNode;
    while((currentNode = walker.nextNode())) {
      const text = currentNode.nodeValue.replace(/\\s+/g, ' ').trim();
      if (text.length > 20) { // Only send substantial pieces of text
        sentences.push({ id: idCounter, text: text });
        nodeMap.set(idCounter, currentNode);
        idCounter++;
      }
    }

    return { sentences, nodeMap };
  }

  return {
    extractVisibleSentences
  };
})();
