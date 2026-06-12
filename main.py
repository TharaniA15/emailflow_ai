from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
import json
import imaplib
import email
from email.header import decode_header

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


# -----------------------------
# Models
# -----------------------------

class FetchEmailsInput(BaseModel):
    email: str
    password: str


class AnalyzeInput(BaseModel):
    email_text: str


# -----------------------------
# Email Import Endpoint
# -----------------------------

@app.post("/fetch-emails")
def fetch_emails(user_data: FetchEmailsInput):
    try:

        IMAP_SERVER = (
            "imap.gmail.com"
            if "gmail.com" in user_data.email
            else "imap-mail.outlook.com"
        )

        mail = imaplib.IMAP4_SSL(IMAP_SERVER)

        mail.login(
            user_data.email,
            user_data.password
        )

        mail.select("inbox")

        status, messages = mail.search(None, "ALL")

        email_ids = messages[0].split()

        latest_email_ids = email_ids[-5:]

        fetched_emails = []

        for e_id in latest_email_ids:

            res, msg_data = mail.fetch(e_id, "(RFC822)")

            for response_part in msg_data:

                if isinstance(response_part, tuple):

                    msg = email.message_from_bytes(
                        response_part[1]
                    )

                    subject, encoding = decode_header(
                        msg["Subject"]
                    )[0]

                    if isinstance(subject, bytes):
                        subject = subject.decode(
                            encoding if encoding else "utf-8"
                        )

                    sender, encoding = decode_header(
                        msg["From"]
                    )[0]

                    if isinstance(sender, bytes):
                        sender = sender.decode(
                            encoding if encoding else "utf-8"
                        )

                    body = ""

                    if msg.is_multipart():

                        for part in msg.walk():

                            content_type = part.get_content_type()

                            if content_type == "text/plain":

                                payload = part.get_payload(
                                    decode=True
                                )

                                if payload:
                                    body = payload.decode(
                                        errors="ignore"
                                    )

                                break

                    else:

                        payload = msg.get_payload(
                            decode=True
                        )

                        if payload:
                            body = payload.decode(
                                errors="ignore"
                            )

                    fetched_emails.append({
                        "id": e_id.decode(),
                        "sender": sender,
                        "subject": subject,
                        "body": body[:500]
                    })

        mail.logout()

        return {
            "status": "success",
            "emails": fetched_emails
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# -----------------------------
# AI Email Analysis Endpoint
# -----------------------------

@app.post("/analyze-email")
def analyze_email(data: AnalyzeInput):

    try:

        prompt = f"""
You are an enterprise customer support AI.

Analyze the customer email.

Return ONLY valid JSON.

Categories:
- General Inquiry
- Technical Support
- Feedback & Suggestions
- Complaints
- Urgent Assistance

Sentiments:
- Appreciative
- Neutral
- Frustrated
- Urgent / Anxious

Customer Email:
{data.email_text}

Return exactly:

{{
  "category": "...",
  "sentiment": "...",
  "reply": "..."
}}
"""

        response = model.generate_content(prompt)

        result_text = response.text.strip()

        start = result_text.find("{")
        end = result_text.rfind("}") + 1

        if start != -1 and end != -1:
            result_text = result_text[start:end]

        return json.loads(result_text)

    except Exception as e:

        print("GEMINI ERROR:", str(e))

        return {
            "category": "General Inquiry",
            "sentiment": "Neutral",
            "reply": "Thank you for contacting us. We will review your request and get back to you shortly."
        }