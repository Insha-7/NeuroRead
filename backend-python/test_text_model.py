import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

SYSTEM_PROMPT = """
You are NeuroRead AI, an accessibility assistant for neurodivergent users.
Your task is to analyze an array of sentences and simplify complex ones while preserving their exact meaning.
Also identify any idioms and evaluate the overall emotional tone.

Rules:
1. Only simplify sentences that are complex/hard to read.
2. If an idiom is found, provide its plain meaning.
3. Keep the output strictly in the exact JSON format requested, without markdown fences.

Desired JSON Format:
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
}
"""

def test_text_model():
    print("Testing Groq Llama 3.3 Text Model via LangChain...")
    
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        api_key=os.getenv("GROQ_API_KEY")
    )
    
    parser = JsonOutputParser()
    
    def prompt_func(inputs):
        user_input = inputs["input"]
        return [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=str(user_input))
        ]
        
    chain = prompt_func | llm | parser
    
    test_input = [
        {"id": 1, "text": "The esoteric nature of quantum mechanics often obfuscates the underlying reality from laypersons."},
        {"id": 2, "text": "It's time to bite the bullet and learn it anyway."}
    ]
    
    print("Sending input:", json.dumps(test_input, indent=2))
    
    start = time.time()
    try:
        response = chain.invoke({"input": json.dumps(test_input)})
        duration = time.time() - start
        print(f"\\nSuccess! Response received in {duration:.2f}s:")
        print(json.dumps(response, indent=2))
        return True
    except Exception as e:
        print(f"\\nError during API check: {e}")
        return False

if __name__ == "__main__":
    import time
    test_text_model()
