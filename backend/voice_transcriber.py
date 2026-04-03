import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def transcribe_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    """
    Takes raw audio bytes and uses Groq Whisper to transcribe them.
    Returns the transcription text.
    """
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3-turbo",
            response_format="text",
            language="en",
            temperature=0.0,
        )
        result = transcription.strip() if isinstance(transcription, str) else transcription.text.strip()
        
        # Whisper often hallucinates these phrases on silence/background noise
        hallucinations = [
            "thank you.", "thank you", "thanks for watching.", "thanks for watching!",
            "please subscribe.", "subscribe.", "you", "bye."
        ]
        if result.lower() in hallucinations:
            return ""
            
        return result
    except Exception as e:
        print(f"[Voice Transcriber] Groq Whisper Error: {e}")
        return ""
