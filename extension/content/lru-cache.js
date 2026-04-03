window.NR_Cache = (function() {
  'use strict';

  // Simple in-memory cache mapped by text hash
  const maxEntries = 500;
  const sentenceCache = new Map();

  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function checkBatch(sentences) {
    const hits = [];
    const misses = [];

    for (const sent of sentences) {
      const hash = await sha256(sent.text);
      if (sentenceCache.has(hash)) {
        hits.push({ id: sent.id, simplified: sentenceCache.get(hash) });
        // LRU behavior: bump to latest
        const val = sentenceCache.get(hash);
        sentenceCache.delete(hash);
        sentenceCache.set(hash, val);
      } else {
        misses.push({ id: sent.id, text: sent.text, hash: hash });
      }
    }
    return { hits, misses };
  }

  function storeBatch(missesWithHashes, resultSentences) {
    resultSentences.forEach(res => {
      if (res.simplified) {
        const originalMiss = missesWithHashes.find(m => m.id === res.id);
        if (originalMiss) {
          sentenceCache.set(originalMiss.hash, res.simplified);
          
          if (sentenceCache.size > maxEntries) {
            // Remove oldest
            const firstKey = sentenceCache.keys().next().value;
            sentenceCache.delete(firstKey);
          }
        }
      }
    });
  }

  function clear() {
      sentenceCache.clear();
  }

  return {
    checkBatch,
    storeBatch,
    clear
  };
})();
