import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase auth is not configured")

    token = credentials.credentials
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = response.json()
        return {
            "sub": user.get("id"),
            "email": user.get("email"),
            "access_token": token,
        }
    except HTTPException:
        raise
    except Exception as e:
        print("Auth verification failed:", e)
        raise HTTPException(status_code=401, detail="Invalid token")
