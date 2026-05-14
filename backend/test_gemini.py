import httpx
import asyncio
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

async def test_gemini():
    # Initialize the new Client
    # It automatically handles async operations efficiently
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = (
        "You are Finwise, a sharp AI financial co-pilot for freelancers in India.\n"
        "CRITICAL: Keep your response EXTREMELY crisp and brief. Do not make the response long. Answer directly in 2-3 short sentences maximum.\n"
        "Write like a premium finance app: practical, specific, calm, and not textbook-like.\n"
        "Use Markdown bold sparingly for the exact items the user should notice, such as limits, deadlines, risks, and action items.\n"
        "Keep answers accurate for India.\n\n"
        "You must respond in ONLY a valid JSON format with the following keys:\n"
        '{"reply": "your crisp markdown response here", "follow_ups": ["follow up question 1", "follow up question 2", "follow up question 3"]}\n'
        "The follow_ups should be 3 short, specific follow-up questions the user might ask next.\n\n"
        "User: How much tax do I pay on 10 lakhs income?\nFinwise:"
    )

    try:
        # In the new SDK, we use client.models.generate_content
        # For async, we simply await the call
        # Change this line in your test_gemini.py
        response = await client.models.generate_content(
            model="gemini-2.0-flash-001", # Sometimes a specific suffix is required
            # OR try the newer version:
            # model="gemini-3-flash", 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=300,
                temperature=0.1
            )
        )

        print("Response text:", response.text)
        
        # Parse the JSON response
        result = json.loads(response.text.strip())
        print("--- Parsed Result ---")
        print(f"Reply: {result.get('reply')}")
        print(f"Follow-ups: {result.get('follow_ups')}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())