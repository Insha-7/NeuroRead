import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

models = client.models.list()
vision_models = [m.id for m in models.data if "vision" in m.id.lower()]

print("All Available Models on Groq:")
for m in models.data:
    print(f" - {m.id}")
