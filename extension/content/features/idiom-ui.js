window.NR_IdiomUI = (function() {
  'use strict';

  function render(idioms) {
    if (!idioms || idioms.length === 0) return;

    // To properly underline idioms inside standard text without blowing up the whole DOM text node,
    // we would use a more complex range-based text higlighter.
    // Since we only get sentenceIds mapped to textNodes, we can find the parent element 
    // and highlight using a simple safe RegExp on the whole element's innerHTML if it contains the idiom exactly.
    // For safety and SPA compliance, if it fails gracefully, that's fine.

    idioms.forEach(idiom => {
       const node = window.NR_TrieIndex.getNode(idiom.sentenceId);
       if (!node || !node.parentElement) return;

       const el = node.parentElement;
       const safeText = idiom.text.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
       const regex = new RegExp(`\\\\b(${safeText})\\\\b`, 'gi');
       
       if (regex.test(el.innerHTML) && !el.innerHTML.includes('nr-idiom')) {
          el.innerHTML = el.innerHTML.replace(
              regex, 
              `<span class="nr-idiom" title="Literal meaning: ${idiom.meaning}" style="border-bottom: 2px dotted #E67E00; cursor: help; background: rgba(230, 126, 0, 0.1); border-radius: 3px; padding: 0 2px;">$1</span>`
          );
       }
    });
  }

  function remove() {
    document.querySelectorAll('.nr-idiom').forEach(el => {
       const parent = el.parentNode;
       while (el.firstChild) {
           parent.insertBefore(el.firstChild, el);
       }
       parent.removeChild(el);
    });
  }

  return { render, remove };
})();
that