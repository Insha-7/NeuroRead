from collections import deque
from rate_limit_monitor import rate_limit_monitor
from typing import Optional

# Define our robust fallback sequences
POOLS = {
    "text_pool": deque(["llama-3.1-8b-instant", "mixtral-8x7b-32768", "llama-3.1-70b-versatile",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "moonshotai/kimi-k2-instruct-0905",
    "moonshotai/kimi-k2-instruct",
    "openai/gpt-oss-120b",
    "groq/compound-mini",
    "groq/compound",
    "allam-2-7b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]),
    "vision_pool": deque(["meta-llama/llama-4-scout-17b-16e-instruct"]),
    "audio_pool": deque(["whisper-large-v3-turbo"])
}

class ModelPoolManager:
    def __init__(self):
        self.pools = POOLS

    def get_available_model(self, pool_name: str) -> Optional[str]:
        """
        Returns the first available model in the sequence that isn't rate-limited.
        If the primary is rate_limited, pops it to the back and pulls the next!
        """
        if pool_name not in self.pools:
            raise ValueError(f"Pool {pool_name} doesn't exist.")
            
        pool = self.pools[pool_name]
        
        # We try every model in the pool exactly once before giving up
        for _ in range(len(pool)):
            candidate = pool[0]
            
            if rate_limit_monitor.check_can_use_model(candidate):
                return candidate
            else:
                print(f"🔄 Rotating model pool '{pool_name}': {candidate} is Rate-Limited! Throwing to back.")
                # Rotate: pop from left and append to right
                pool.rotate(-1)
                
        print(f"🛑 CRITICAL: Entire pool '{pool_name}' is currently rate-limited!")
        return None

model_pool_manager = ModelPoolManager()
