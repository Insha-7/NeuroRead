window.NR_Simplify = (function() {
  'use strict';
  
  function apply(sentences) {
    let replacements = 0;
    for (const res of sentences) {
      if (res.simplified) {
        window.NR_TrieIndex.replaceText(res.id, res.simplified);
        replacements++;
      }
    }
    return replacements;
  }

  function restore() {
    // Optional: Requires keeping original texts in cache/memory if we want an undo button
    // For now, reload tab to undo
  }

  return { apply, restore };
})();
