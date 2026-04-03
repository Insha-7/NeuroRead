import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
