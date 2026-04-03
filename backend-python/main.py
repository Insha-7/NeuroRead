import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="NeuroRead AI Backend", version="1.0.0")

# Setup CORS to allow the Extension to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

@app.get("/health")
def health_check():
    api_key_configured = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "ok",
        "service": "neuroread-ai-fastapi",
        "uptime": time.time() - START_TIME,
        "groq_configured": api_key_configured
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
