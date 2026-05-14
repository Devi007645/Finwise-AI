import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

prompt = (
    "You are Finwise, a sharp AI financial co-pilot for freelancers in India.\n"
    "CRITICAL: Keep your response EXTREMELY crisp and brief. Do not make the response long. Answer directly in 2-3 short sentences maximum.\n"
    "Write like a premium finance app: practical, specific, calm, and not textbook-like.\n"
    "Use Markdown bold sparingly for the exact items the user should notice, such as limits, deadlines, risks, and action items.\n"
    "Keep answers accurate for India.\n\n"
    "You must respond in ONLY a valid JSON format with the following keys:\n"
    '{"reply": "your crisp markdown response here", "follow_ups": ["follow up question 1", "follow up question 2", "follow up question 3"]}\n'
    "The follow_ups should be 3 short, specific follow-up questions the user might ask next.\n"
    "Return ONLY the JSON. Do NOT include any markdown formatting, backticks, or other text.\n\n"
    "User: Hi, I am a freelancer in India. I earn around 10 Lakhs. Should I register for GST?\nFinwise:"
)

async def run():
    print("Generating...")
    response = await client.aio.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    with open("test_out.txt", "w", encoding="utf-8") as f:
        f.write(response.text)
    print("Wrote response to test_out.txt")

asyncio.run(run())
