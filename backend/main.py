import os
import json
import base64
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from auth import verify_token
import httpx
from dotenv import load_dotenv
from google import genai


load_dotenv()

app = FastAPI()

# Allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Gemini
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Setup Supabase REST credentials.
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials missing. Database inserts will be skipped.")

class ChatRequest(BaseModel):
    history: List[Dict[str, str]]
    message: str
    conversation_id: Optional[str] = None
    finance_context: Optional[str] = None

class ExtractRequest(BaseModel):
    file_name: str
    mime_type: str
    data_base64: str
    record_hint: Optional[str] = None

def fallback_follow_ups(message: str, ai_reply: str) -> List[str]:
    combined = f"{message} {ai_reply}".lower()

    if "gst" in combined:
        return [
            "What turnover makes GST registration worth it for me?",
            "How should I invoice foreign clients under GST?",
            "Can I claim input tax credit on my tools?",
        ]

    if "tds" in combined or "upwork" in combined:
        return [
            "How do I reconcile TDS with my advance tax?",
            "Which documents should I keep for foreign income?",
            "Can platform fees be claimed as expenses?",
        ]

    if "tax" in combined or "80c" in combined or "deduction" in combined:
        return [
            "Which deductions should I prioritize first?",
            "Old regime or new regime: which fits me better?",
            "What expenses can I safely claim this year?",
        ]

    return [
        "What should I do next based on this?",
        "How does this change for my income level?",
        "What documents should I keep ready?",
    ]

def save_to_supabase_bg(user_id: str, conversation_id: str, message: str, ai_reply: str, access_token: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            db_response = httpx.post(
                f"{SUPABASE_URL}/rest/v1/messages",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "content": message,
                    "ai_response": ai_reply
                },
                timeout=10,
            )
            db_response.raise_for_status()

            if conversation_id:
                title = message.strip()
                db_response = httpx.patch(
                    f"{SUPABASE_URL}/rest/v1/conversations",
                    params={"id": f"eq.{conversation_id}"},
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json={
                        "title": title[:60] or "New conversation",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    timeout=10,
                )
                db_response.raise_for_status()
        except Exception as e:
            print(f"Background Supabase save failed: {e}")
    else:
        print("Warning: Supabase client not initialized, skipping database insert.")


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks, user: dict = Depends(verify_token)):
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    # Construct prompt
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
    )
    if request.finance_context:
        prompt += f"User finance context from Finwise records:\n{request.finance_context}\n\n"
    for msg in request.history:
        prompt += f"{msg['role'].capitalize()}: {msg['content']}\n"
    prompt += f"User: {request.message}\nFinwise:"

    try:
        # Request from Gemini
        response = await client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        ai_reply = ""
        follow_ups = []
        try:
            import re
            text = response.text.strip()
            # Extract JSON block if surrounded by markdown or other text
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                text = match.group(0)
            
            result = json.loads(text)
            ai_reply = result.get("reply", "I'm here to help with your finances.")
            follow_ups = result.get("follow_ups", [])
        except Exception:
            ai_reply = response.text.strip()
            # Strip markdown if fallback is triggered
            if ai_reply.startswith("```"):
                ai_reply = ai_reply.strip("`").replace("json", "", 1).strip()
            follow_ups = fallback_follow_ups(request.message, ai_reply)
        
        # Save to database in background
        access_token = user.get('access_token')
        if access_token:
            background_tasks.add_task(
                save_to_supabase_bg,
                user_id,
                request.conversation_id,
                request.message,
                ai_reply,
                access_token
            )

        return {"response": ai_reply, "follow_ups": follow_ups, "user_id": user_id}
        
    except Exception as e:
        print(f"Error processing AI request: {e}")
        raise HTTPException(status_code=500, detail="Failed to process AI request or save to database")

@app.post("/api/extract-document")
async def extract_document(request: ExtractRequest, user: dict = Depends(verify_token)):
    if not user.get("sub"):
        raise HTTPException(status_code=401, detail="User ID not found in token")

    try:
      file_bytes = base64.b64decode(request.data_base64)
      prompt = (
          "Extract finance record details from this invoice/receipt/document for an Indian freelancer app.\n"
          "Return only JSON with keys: counterparty, invoice_number, amount, invoice_date, category, "
          "record_type, status, notes, extracted_summary.\n"
          "record_type must be either income or expense. Use the user's hint if provided.\n"
          "invoice_date must be YYYY-MM-DD if visible, otherwise today's date.\n"
          "amount must be a number in INR if possible.\n\n"
          f"User hint: {request.record_hint or 'not provided'}\n"
          f"File name: {request.file_name}\n"
      )
      response = await client.aio.models.generate_content(
          model=GEMINI_MODEL,
          contents=[
              prompt,
              genai.types.Part.from_bytes(data=file_bytes, mime_type=request.mime_type)
          ]
      )
      text = response.text.strip()
      if text.startswith("```"):
          text = text.strip("`").replace("json", "", 1).strip()

      try:
          extracted = json.loads(text)
      except json.JSONDecodeError:
          extracted = {"extracted_summary": text}

      return {"extracted": extracted}
    except Exception as e:
      print(f"Error extracting document: {e}")
      raise HTTPException(status_code=500, detail="Failed to extract document insights")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
