import os
import time
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import Groq and Langchain
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

# Use explicit caching via functools
from functools import lru_cache
import hashlib

load_dotenv()

app = FastAPI(title="NeuroRead AI Backend", version="2.0.0")

# Setup CORS to allow the Extension to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# LangChain AI Text Chain Setup
SYSTEM_PROMPT = """You are NeuroRead AI, an accessibility assistant for neurodivergent users (e.g. dyslexia, ADHD).
Your task is to analyze an array of sentences and simplify complex ones while preserving their exact semantic meaning.
Also identify any idioms and evaluate the overall emotional tone of the page context.

Rules:
1. ONLY simplify a sentence if it is complex, hard to read, or uses advanced vocabulary. If it is already simple, return null for it.
2. If an idiom or common figure of speech is found, provide its literal, plain meaning.
3. Keep the output strictly in the exact JSON format requested, without markdown fences or extra text.

Output JSON Format:
{
  "sentences": [
    { "id": 1, "simplified": "Simplified text if changed." },
    { "id": 2, "simplified": null }
  ],
  "idioms": [
    { "text": "bite the bullet", "meaning": "face a difficult situation", "sentenceId": 1 }
  ],
  "page_tone": "low",
  "needs_tone_warning": false
}"""

# Server-Side Cache Implementation
sentence_cache = {}

def get_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

class Sentence(BaseModel):
    id: int
    text: str

class AnalyzeRequest(BaseModel):
    sentences: list[Sentence]

# ─── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    api_key_configured = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "ok",
        "service": "neuroread-ai-fastapi",
        "uptime": time.time() - START_TIME,
        "groq_configured": api_key_configured
    }

@app.get("/profile/{profile_id}")
def get_profile(profile_id: str):
    profiles = {
        "adhd": {
            "name": "ADHD",
            "ttsSpeed": 1.3,
            "features": {"adhdColours": True, "focusMode": False, "readingRuler": False},
            "css": "/* ADHD Base CSS */\\n:root {\\n  --nr-font-size: 22px;\\n  --nr-line-height: 1.85;\\n  --nr-background: #FFFFFF;\\n  --nr-text-color: #1A1A1A;\\n  --nr-h1-color: #6A0DAD;\\n  --nr-h2-color: #7B2FBE;\\n  --nr-fact-color: #E67E00;\\n  --nr-quote-color: #007777;\\n}"
        },
        "autism": {
            "name": "Autism",
            "ttsSpeed": 0.9,
            "features": {"adhdColours": False, "focusMode": True, "readingRuler": False},
            "css": "/* Autism Base CSS */\\n:root {\\n  --nr-font-size: 20px;\\n  --nr-line-height: 2.0;\\n  --nr-background: #FAF9F2;\\n  --nr-text-color: #2C2C2C;\\n}"
        },
        "dyslexia": {
            "name": "Dyslexia",
            "ttsSpeed": 1.0,
            "features": {"adhdColours": False, "focusMode": False, "readingRuler": True},
            "css": "/* Dyslexia Base CSS */\\n@font-face {\\n  font-family: 'OpenDyslexic';\\n  src: url('chrome-extension://__EXTENSION_ID__/fonts/OpenDyslexic-Regular.otf') format('opentype');\\n}\\n:root {\\n  --nr-font-family: 'OpenDyslexic', sans-serif;\\n  --nr-font-size: 20px;\\n  --nr-line-height: 2.0;\\n  --nr-letter-spacing: 0.05em;\\n  --nr-word-spacing: 0.15em;\\n  --nr-background: #FFFEF0;\\n}"
        },
        "custom": {
            "name": "Custom",
            "ttsSpeed": 1.0,
            "features": {"adhdColours": False, "focusMode": False, "readingRuler": False},
            "css": "/* Custom Base */"
        }
    }
    
    if profile_id not in profiles:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    return profiles[profile_id]

@app.post("/analyze")
async def analyze_sentences(req: AnalyzeRequest):
    # 1. Separate cached hits from misses
    misses = []
    hits = []
    
    for sent in req.sentences:
        h = get_hash(sent.text)
        if h in sentence_cache:
            hits.append({"id": sent.id, "simplified": sentence_cache[h]})
        else:
            misses.append(sent)

    ai_result = {"sentences": [], "idioms": [], "page_tone": "low", "needs_tone_warning": False}
    
    # 2. Ask Groq to simplify misses
    if misses:
        try:
            llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1, api_key=os.getenv("GROQ_API_KEY"))
            parser = JsonOutputParser()
            chain = llm | parser
            
            # Format inputs
            input_text = json.dumps([{"id": m.id, "text": m.text} for m in misses])
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=input_text)
            ]
            
            response = chain.invoke(messages)
            ai_result = response
            
            # Store in cache
            if "sentences" in ai_result:
                for res_sent in ai_result["sentences"]:
                    if res_sent["simplified"]:
                        # find original text to hash
                        orig = next((m.text for m in misses if m.id == res_sent["id"]), None)
                        if orig:
                            sentence_cache[get_hash(orig)] = res_sent["simplified"]
                            
        except Exception as e:
            print(f"Groq API Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    # Combine hits and misses
    all_sentences = hits + ai_result.get("sentences", [])
    ai_result["sentences"] = all_sentences
    
    # Quick Text CAM Score calculation (Mocked visual since Groq removed vision)
    words = sum(len(s.text.split()) for s in req.sentences)
    sentences = len(req.sentences)
    avg_words = words / sentences if sentences > 0 else 0
    score = min(1.0, avg_words / 25.0)  # simple complexity heuristic
    
    label = "Easy"
    if score > 0.7:
        label = "Hard"
    elif score > 0.4:
        label = "Medium"
        
    ai_result["cam"] = {"score": score, "label": label}

    return ai_result

@app.post("/voice")
async def process_voice(audio: UploadFile = File(...)):
    """Transcribes an audio file via Whisper and tries to match a known command."""
    temp_path = f"/tmp/{audio.filename}"
    with open(temp_path, "wb") as f:
        f.write(audio.file.read())
        
    try:
        with open(temp_path, "rb") as f:
            resp = groq_client.audio.transcriptions.create(
                file=(temp_path, f.read()),
                model="whisper-large-v3-turbo",
            )
            
        transcript = resp.text.lower()
        print(f"Voice Transcript: '{transcript}'")
        
        # Simple string matching for now
        command = None
        matched = False
        
        if "simplify" in transcript or "easy" in transcript:
            command = "simplify"
            matched = True
        elif "focus" in transcript or "hide" in transcript:
            command = "focus"
            matched = True
        elif "stop" in transcript or "reset" in transcript or "undo" in transcript:
            command = "stop"
            matched = True
            
        return {
            "transcript": transcript,
            "command": command,
            "matched": matched
        }
    except Exception as e:
        print(f"Voice API Error: {e}")
        raise HTTPException(status_code=500, detail="Voice transcription failed")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
