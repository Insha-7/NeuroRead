"""
NeuroRead AI — vision_explainer.py
Module: Multimodal Image/Diagram Explainer
Uses Groq Llama 3.2 11B Vision to explain images in plain language.
"""

from config import get_groq_client, MODELS

SYSTEM_PROMPT = """You are an accessibility assistant for neurodivergent users (ADHD, Dyslexia, Autism).
Describe this image in simple, plain language. Focus on:
- What is being shown (type of diagram, chart, photo, etc.)
- Key relationships, patterns, or data points
- Labels and their meanings
- Any important takeaways

Keep your explanation under 150 words. Use short sentences. Avoid jargon.
If the image appears to be decorative or a logo, say so briefly."""


def explain_image(image_base64: str, context: str = "") -> str:
    """
    Send a base64-encoded image to Llama 3.2 Vision for plain-language explanation.
    
    Args:
        image_base64: Base64 string of the image (with or without data URL prefix)
        context: Optional surrounding text from the page for better understanding
    
    Returns:
        Plain-language explanation string
    """
    client = get_groq_client()
    model = MODELS.get("vision_explainer", "meta-llama/llama-4-scout-17b-16e-instruct")
    
    # Ensure proper data URL format
    if not image_base64.startswith("data:"):
        image_base64 = f"data:image/png;base64,{image_base64}"
    
    user_content = [
        {
            "type": "image_url",
            "image_url": {
                "url": image_base64
            }
        },
        {
            "type": "text",
            "text": f"Explain this image simply.{(' Context from the page: ' + context[:300]) if context else ''}"
        }
    ]
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            max_tokens=300,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[vision_explainer] Error: {e}")
        return f"Could not analyze this image: {str(e)}"
