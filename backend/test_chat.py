from fastapi.testclient import TestClient
from main import app
from auth import verify_token
import asyncio

# Mock the dependency
def override_verify_token():
    return {
        "sub": "test-user-id",
        "email": "test@example.com",
        "access_token": "mock-token"
    }

app.dependency_overrides[verify_token] = override_verify_token

client = TestClient(app)

def test_chat_endpoint():
    request_data = {
        "history": [],
        "message": "Hi, I am a freelancer in India. I earn around 10 Lakhs. Should I register for GST?"
    }
    print("Sending request to /api/chat...")
    response = client.post("/api/chat", json=request_data)
    print("Response status code:", response.status_code)
    try:
        print("Response JSON:", response.json())
    except Exception as e:
        print("Response text:", response.text)
        
if __name__ == "__main__":
    test_chat_endpoint()
