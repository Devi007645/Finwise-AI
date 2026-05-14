import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient() as client:
        try:
            # First need to get a token, or fake the token? 
            # If verify_token requires a valid supabase token, it will fail 401.
            # But the user says "there is an error in the response from the chatbot".
            pass
        except Exception as e:
            print(e)
