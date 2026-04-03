import os
import base64
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def get_base64_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_vision_model():
    print("Testing Groq Llama 3.2 11B Vision Model...")
    
    # Create a dummy 1x1 white pixel image for testing safely without downloading anything
    # Standard 1x1 pixel PNG in base64:
    dummy_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
    
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        start_time = __import__('time').time()
        
        # Analyze the image
        response = client.chat.completions.create(
            model="llama-3.2-11b-vision",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "What is the primary color of this image? It is just a 1x1 pixel. Please answer in one word."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{dummy_b64}",
                            },
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=20
        )
        
        duration = __import__('time').time() - start_time
        result = response.choices[0].message.content.strip()
        print(f"\\nSuccess! Response received in {duration:.2f}s:")
        print(f"Vision output: '{result}'")
        return True
    
    except Exception as e:
        print(f"\\nError during Vision API check: {e}")
        return False

if __name__ == "__main__":
    test_vision_model()
