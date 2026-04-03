import time
from fastapi import FastAPI, HTTPException
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
                "paragraph_spacing": ai_response.get("paragraph_spacing", "2em"),
                "heading_margin_top": ai_response.get("heading_margin_top", "2.8em"),
                "content_max_width": ai_response.get("content_max_width", "780px"),
                "list_indent": ai_response.get("list_indent", "20px"),
                "list_item_spacing": ai_response.get("list_item_spacing", "0.8em")
            },
            "clutter": {
                "override_background_image": ai_response.get("override_background_image", True),
                "image_display_style": ai_response.get("image_display_style", "block"),
                "border_style": ai_response.get("border_style", "minimal"),
                "remove_decorative_shadows": ai_response.get("remove_decorative_shadows", True)
            }
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
