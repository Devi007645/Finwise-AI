import google as genai
import asyncio

async def main():
    try:
        config = genai.types.GenerationConfig(
            response_mime_type="application/json",
            max_output_tokens=300
        )
        print("Success:", config)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
