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

# ─── Model Assignments ───────────────────────────────────────
# Spread tasks across different models to distribute rate limits.
# Heavy tasks (DOM mapping, text simplification) use the big model.
# Lighter tasks (voice intent, focus mode) use smaller/faster models.
MODELS = {
    "dom_mapper":       "moonshotai/kimi-k2-instruct-0905",   # Needs deep CSS understanding
    "text_simplifier":  "llama-3.1-8b-instant",      # Fast, good enough for ELI5
    "focus_mapper":     "qwen/qwen3-32b",      # Simple selector extraction
    "focus_reader":     "llama-3.1-8b-instant", # Fast ~3s responses; 5K char chunks stay under 6K TPM
    "voice_intent":     "openai/gpt-oss-20b",      # Quick command parsing
    "whisper":          "whisper-large-v3-turbo",     # Audio transcription (fixed)
    "vision_explainer": "meta-llama/llama-4-scout-17b-16e-instruct",  # Multimodal image analysis
    "cam_analyzer":     "llama-3.1-8b-instant",       # Fast numerical/text evaluation
    "tone_analyzer":    "llama-3.1-8b-instant",       # Explicit social/emotional parsing
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
    Returns a ChatGroq LLM instance configured for the given task.
    """
    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=MODELS.get(task, "llama-3.1-8b-instant"),
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
