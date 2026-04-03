import os
import wave
import struct
import math
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def create_test_wav(filename="test_audio.wav"):
    """Creates a simple 1 second mono sine wave audio file"""
    sample_rate = 16000
    duration_seconds = 1
    frequency = 440.0
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) 
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(sample_rate * duration_seconds):
            # Generate sine wave sample
            value = int(32767.0 * math.sin(frequency * math.pi * 2 * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)
            
    return filename

def test_voice_model():
    print("Testing Groq Whisper v3 Voice Model...")
    
    audio_path = create_test_wav()
    print(f"Created dummy audio file: {audio_path}")
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        start_time = __import__('time').time()
        
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                file=(audio_path, audio_file.read()),
                model="whisper-large-v3-turbo",
            )
        
        duration = __import__('time').time() - start_time
        print(f"\\nSuccess! Response received in {duration:.2f}s:")
        print(f"Transcription: '{response.text}'")
        
        # Cleanup
        os.remove(audio_path)
        return True
    
    except Exception as e:
        print(f"\\nError during Voice API check: {e}")
        if os.path.exists(audio_path):
            os.remove(audio_path)
        return False

if __name__ == "__main__":
    test_voice_model()
