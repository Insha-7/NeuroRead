import time
import asyncio
import json
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

app = FastAPI(title="NeuroRead API Settings Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

# ─── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "uptime": time.time() - START_TIME
    }

@app.get("/settings")
def get_settings():
    return {
        "base_font_size": "20px",
        "line_height": "1.8",
        "colors": {
            "background": "#FFFEF5",
            "text": "#1A1A1A",
            "highlight": "#6A0DAD",
            "accent": "#E67E00"
        }
    }

class SkeletonRequest(BaseModel):
    html_skeleton: str

@app.post("/analyze-site")
async def analyze_site(request: SkeletonRequest):
    from cache import cache
    cached = cache.get("dom_mapper", request.html_skeleton)
    if cached:
        return {"success": True, "cached": True, **cached}

    from dom_mapper import generate_css_map
    ai_response = await asyncio.to_thread(generate_css_map, request.html_skeleton)
    
    response_data = {
        "selectors": {
            "title_selector": ai_response.get("title_selector", "h1"),
            "body_selector": ai_response.get("body_selector", "p"),
            "header_selectors": ai_response.get("header_selectors", "h2, h3"),
            "exclusions": ai_response.get("exclusions", "sup, sub, math, nav, footer"),
            "thumbnail_selector": ai_response.get("thumbnail_selector", "img")
        },
        "formatting": {
            "typography": {
                "base_font_size": ai_response.get("base_font_size", "22px"),
                "line_height": ai_response.get("line_height", "1.9"),
                "font_family": ai_response.get("font_family", "sans-serif"),
                "text_align": ai_response.get("text_align", "left"),
                "max_line_width": ai_response.get("max_line_width", "680px"),
                "letter_spacing": ai_response.get("letter_spacing", "0.02em"),
                "word_spacing": ai_response.get("word_spacing", "0.08em"),
                "override_italic": ai_response.get("override_italic", True)
            },
            "colors": {
                "background": ai_response.get("background_color", "#FAFAF5"),
                "text": ai_response.get("text_color", "#1A1A2E"),
                "highlight": ai_response.get("heading_color", "#4A1D96"),
                "accent": ai_response.get("accent_color", "#D97706")
            },
            "layout": {
                "paragraph_spacing": ai_response.get("paragraph_spacing", "1em"),
                "heading_margin_top": ai_response.get("heading_margin_top", "1.5em"),
                "content_max_width": ai_response.get("content_max_width", "780px"),
                "list_indent": ai_response.get("list_indent", "20px"),
                "list_item_spacing": ai_response.get("list_item_spacing", "0.5em")
            },
            "clutter": {
                "override_background_image": ai_response.get("override_background_image", True),
                "image_display_style": ai_response.get("image_display_style", "block"),
                "border_style": ai_response.get("border_style", "minimal"),
                "remove_decorative_shadows": ai_response.get("remove_decorative_shadows", True)
            }
        }
    }
    cache.set("dom_mapper", request.html_skeleton, response_data)
    return {"success": True, **response_data}

@app.post("/analyze-focus")
async def analyze_focus(request: SkeletonRequest):
    from cache import cache
    cached = cache.get("focus_mapper", request.html_skeleton)
    if cached:
        return {"success": True, "cached": True, **cached}

    from focus_mapper import generate_focus_map
    ai_response = await asyncio.to_thread(generate_focus_map, request.html_skeleton)
    
    response_data = {
        "selectors": {
            "main_content_selector": ai_response.get("main_content_selector", "article, main"),
            "hide_selectors": ai_response.get("hide_selectors", "nav, footer, aside")
        }
    }
    cache.set("focus_mapper", request.html_skeleton, response_data)
    return {"success": True, **response_data}

class SimplifyRequest(BaseModel):
    text_chunks: List[str]

@app.post("/simplify")
async def simplify_text(request: SimplifyRequest):
    from cache import cache
    chunks_str = json.dumps(request.text_chunks)
    cached = cache.get("text_simplifier", chunks_str)
    if cached:
        return {"success": True, "cached": True, "simplified_chunks": cached}

    from text_simplifier import simplify_text_chunks
    max_batch = 10
    chunks = request.text_chunks[:max_batch]
    simplified = await asyncio.to_thread(simplify_text_chunks, chunks)
    
    cache.set("text_simplifier", chunks_str, simplified)
    return {
        "success": True,
        "simplified_chunks": simplified
    }

class ReaderRequest(BaseModel):
    raw_text: Optional[str] = None
    feed_items: Optional[List[Dict[str, str]]] = None
    is_feed: bool = False

@app.post("/focus-reader")
async def focus_reader_endpoint(request: ReaderRequest):
    import time as _t
    from focus_reader import extract_reader_content
    from cache import cache
    
    print(f"[focus-reader] === REQUEST RECEIVED === raw_text={len(request.raw_text or '')} chars, feed_items={len(request.feed_items or [])}, is_feed={request.is_feed}")
    
    if not request.raw_text and not request.feed_items:
        print("[focus-reader] REJECTED: no content provided")
        return {"success": False, "error": "No content provided"}
    
    cache_key = json.dumps({"text": request.raw_text, "feed": request.feed_items, "is_feed": request.is_feed})
    cached = cache.get("focus_reader", cache_key)
    if cached:
        print("[focus-reader] === SERVED FROM CACHE ===")
        return {"success": True, "cached": True, "data": cached}
    
    start = _t.time()
    result = await asyncio.to_thread(extract_reader_content, request.raw_text, request.feed_items, request.is_feed)
    elapsed = _t.time() - start
    
    sections_count = len(result.get("sections", []))
    feed_count = len(result.get("feed", []))
    print(f"[focus-reader] === DONE in {elapsed:.1f}s === sections={sections_count}, feed={feed_count}")
    
    cache.set("focus_reader", cache_key, result)
    return {
        "success": True,
        "data": result
    }

@app.post("/voice")
async def voice_transcribe(audio: UploadFile = File(...)):
    from voice_transcriber import transcribe_audio
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    transcription = await asyncio.to_thread(transcribe_audio, audio_bytes, audio.filename or "recording.webm")
    
    if not transcription:
        return {"success": False, "error": "No audible transcription"}

    from voice_intent import parse_intent
    intent = await asyncio.to_thread(parse_intent, transcription)
    
    return {
        "success": True,
        "transcription": transcription,
        "intent": intent
    }

class ImageExplainRequest(BaseModel):
    image_base64: str
    context: str = ""

@app.post("/explain-image")
async def explain_image_endpoint(request: ImageExplainRequest):
    from cache import cache
    cache_key = request.image_base64[:100] + request.context # Hash key base
    cached = cache.get("vision_explainer", cache_key)
    if cached:
        return {"success": True, "cached": True, "explanation": cached}

    from vision_explainer import explain_image
    
    if not request.image_base64:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    explanation = await asyncio.to_thread(explain_image, request.image_base64, request.context)
    cache.set("vision_explainer", cache_key, explanation)
    
    return {
        "success": True,
        "explanation": explanation
    }

class CamRequest(BaseModel):
    text_content: str

@app.post("/cam-score")
async def cam_score_endpoint(request: CamRequest):
    from cache import cache
    cached = cache.get("cam_analyzer", request.text_content)
    if cached:
        return {"success": True, "cached": True, "cam": cached}

    from cam_analyzer import analyze_cam_score
    
    if not request.text_content:
        return {"success": False, "error": "No text provided"}
        
    result = await asyncio.to_thread(analyze_cam_score, request.text_content)
    cache.set("cam_analyzer", request.text_content, result)
    
    return {
        "success": True,
        "cam": result
    }

class ToneRequest(BaseModel):
    text_content: str

@app.post("/analyze-tone")
async def analyze_tone_endpoint(request: ToneRequest):
    from cache import cache
    cached = cache.get("tone_analyzer", request.text_content)
    if cached:
        return {"success": True, "cached": True, "analysis": cached}

    from tone_analyzer import analyze_tone
    
    if not request.text_content:
        raise HTTPException(status_code=400, detail="No text data provided")
        
    result = await asyncio.to_thread(analyze_tone, request.text_content)
    cache.set("tone_analyzer", request.text_content, result)
    
    return {
        "success": True,
        "analysis": result
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
