window.NR_TrieIndex = (function() {
  'use strict';

  let localNodeMap = new Map();

  function build(nodeMap) {
    localNodeMap = nodeMap;
  }

  function replaceText(sentenceId, newText) {
    if (!localNodeMap.has(sentenceId)) return false;
    
    const node = localNodeMap.get(sentenceId);
    
    // We only alter nodeValue to prevent breaking React/Vue bound event listeners 
    // on the parent elements.
    node.nodeValue = newText;
    return true;
  }
  
  function getNode(sentenceId) {
      return localNodeMap.get(sentenceId);
  }

  return {
    build,
    replaceText,
    getNode
  };
})();
