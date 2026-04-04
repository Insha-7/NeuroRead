import time
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

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
    """
    Returns the core formatting settings. The frontend will 
    safely map these variables to semantic DOM elements.
    """
    return {
        "base_font_size": "20px",
        "line_height": "1.8",
        "colors": {
            "background": "#FFFEF5",   # Soft warm white
            "text": "#1A1A1A",         # Deep high-contrast grey
            "highlight": "#6A0DAD",    # Deep purple for links/headers
            "accent": "#E67E00"        # Vibrant orange for bullet points
        }
    }

class SkeletonRequest(BaseModel):
    html_skeleton: str

@app.post("/analyze-site")
def analyze_site(request: SkeletonRequest):
    """
    Module 1: AI CSS Mapper & Styler
    Accepts a basic DOM skeleton string and uses Llama 3 to return safely targeted CSS selectors 
    AND optimized ADHD styling properties dynamically.
    """
    from dom_mapper import generate_css_map
    
    # Generate the selectors and styles via Langchain/Groq
    ai_response = generate_css_map(request.html_skeleton)
    
    return {
        "success": True,
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

@app.post("/analyze-focus")
def analyze_focus(request: SkeletonRequest):
    """
    Module 8: AI True Focus Mode
    Uses Llama 3 to aggressively identify sidebars, navs, and distracting containers to hide.
    """
    from focus_mapper import generate_focus_map
    
    ai_response = generate_focus_map(request.html_skeleton)
    
    return {
        "success": True,
        "selectors": {
            "main_content_selector": ai_response.get("main_content_selector", "article, main"),
            "hide_selectors": ai_response.get("hide_selectors", "nav, footer, aside")
        }
    }

class SimplifyRequest(BaseModel):
    text_chunks: List[str]

@app.post("/simplify")
def simplify_text(request: SimplifyRequest):
    """
    Module 3: AI Text Simplification
    Accepts up to 10 text chunks and simplifies them for ADHD/Autism friendly reading.
    """
    from text_simplifier import simplify_text_chunks
    
    # Chunked batching (max 10 chunks)
    max_batch = 10
    chunks = request.text_chunks[:max_batch]
    
    simplified = simplify_text_chunks(chunks)
    
    return {
        "success": True,
        "simplified_chunks": simplified
    }


@app.post("/voice")
async def voice_transcribe(audio: UploadFile = File(...)):
    """
    Module 4: Voice Transcription
    Accepts an audio file upload and returns Groq Whisper transcription.
    """
    from voice_transcriber import transcribe_audio
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    transcription = transcribe_audio(audio_bytes, filename=audio.filename or "recording.webm")
    
    if not transcription:
        return {"success": False, "error": "No audible transcription"}

    from voice_intent import parse_intent
    intent = parse_intent(transcription)
    
    return {
        "success": True,
        "transcription": transcription,
        "intent": intent
    }


class ImageExplainRequest(BaseModel):
    image_base64: str
    context: str = ""

@app.post("/explain-image")
def explain_image_endpoint(request: ImageExplainRequest):
    """
    Module: Multimodal Image/Diagram Explainer
    Accepts a base64-encoded image and returns a plain-language explanation.
    """
    from vision_explainer import explain_image
    
    if not request.image_base64:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    explanation = explain_image(request.image_base64, request.context)
    
    return {
        "success": True,
        "explanation": explanation
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
