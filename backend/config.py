"""
NeuroRead AI — config.py
Central configuration for all backend modules.
Manages API keys, model assignments, and retry/rate-limit logic.
"""

import os
import time
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from groq import Groq

load_dotenv()

# ─── API Key ─────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

from model_pool import model_pool_manager

# ─── Pool Assignments ───────────────────────────────────────
# Assign tasks to their required fallback pools instead of rigid distinct models
POOL_ASSIGNMENTS = {
    "dom_mapper":       "text_pool",
    "text_simplifier":  "text_pool",
    "focus_mapper":     "text_pool",
    "focus_reader":     "text_pool",
    "voice_intent":     "text_pool",
    "whisper":          "audio_pool",
    "vision_explainer": "vision_pool",
    "cam_analyzer":     "text_pool",
    "tone_analyzer":    "text_pool",
}

# ─── LLM Parameters ──────────────────────────────────────────
TEMPERATURES = {
    "dom_mapper":       0.3,
    "text_simplifier":  0.3,
    "focus_mapper":     0.3,
    "voice_intent":     0.3,
}

# ─── Rate Limit / Retry Config ────────────────────────────────
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10  # Base delay, doubles on each retry (exponential backoff)


def get_llm(task: str) -> ChatGroq:
    """
    Returns a ChatGroq LLM instance using the Model Pool rotation.
    If the top model in the pool is rate-limited, it automatically fails over to the next!
    """
    pool_name = POOL_ASSIGNMENTS.get(task, "text_pool")
    selected_model = model_pool_manager.get_available_model(pool_name)
    
    if not selected_model:
        raise Exception(f"All models in '{pool_name}' are currently Rate-Limited! Server cannot process {task}.")
    
    print(f"[{task}] 🎯 Grabbed available model from {pool_name}: {selected_model}")
    
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=selected_model,
        temperature=TEMPERATURES.get(task, 0.1),
        timeout=30,  # 30 second hard timeout — never hang forever
    )


def get_groq_client() -> Groq:
    """
    Returns a raw Groq SDK client (used for Whisper audio transcription).
    """
    return Groq(api_key=GROQ_API_KEY)


def invoke_with_retry(chain, input_data: dict, task_name: str = "unknown"):
    """
    Invokes a Langchain chain with exponential backoff retry on rate limit errors.
    Returns the parsed response dict, or None on total failure.
    """
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return chain.invoke(input_data)
        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "rate_limit" in error_str.lower()
            
            if is_rate_limit and attempt < MAX_RETRIES:
                wait = RETRY_DELAY_SECONDS * (2 ** (attempt - 1))
                print(f"[{task_name}] Rate limited (attempt {attempt}/{MAX_RETRIES}). Retrying in {wait}s...")
                time.sleep(wait)
            else:
                print(f"[{task_name}] Groq Error (attempt {attempt}/{MAX_RETRIES}): {e}")
                return None
    return None

import asyncio
async def invoke_with_retry_async(chain, input_data: dict, task_name: str = "unknown"):
    """
    Async version of invoke_with_retry.
    """
    loop = asyncio.get_event_loop()
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await loop.run_in_executor(
                None, 
                lambda: chain.invoke(input_data)
            )
        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "rate_limit" in error_str.lower()
            
            if is_rate_limit and attempt < MAX_RETRIES:
                wait = RETRY_DELAY_SECONDS * (2 ** (attempt - 1))
                print(f"[{task_name}] Rate limited. Retrying in {wait}s...")
                await asyncio.sleep(wait)
            else:
                return None
    return None
