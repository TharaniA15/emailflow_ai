from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_ollama import OllamaLLM
import os
import google.generativeai as genai
import json
import imaplib
import email
import sqlite3
from email.header import decode_header
import bcrypt


load_dotenv()
app = FastAPI()

conn = sqlite3.connect("data/users.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
)
""")

# Ensure existing databases get the name column if it was created before the schema update.
cursor.execute("PRAGMA table_info(users)")
existing_columns = [row[1] for row in cursor.fetchall()]
if "name" not in existing_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
    conn.commit()

conn.commit()

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

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini")

OLLAMA_BASE_URL = "https://ollama-llm-995224459939.asia-southeast1.run.app"

ollama_llm = OllamaLLM(
    model="mistral:7b",
    base_url=OLLAMA_BASE_URL,
    timeout=120,
)

def get_ai_response(prompt):

    print(f"Using AI Provider: {AI_PROVIDER}")

    if AI_PROVIDER == "gemini":
        response = model.generate_content(prompt)
        return response.text

    elif AI_PROVIDER == "ollama":
        return ollama_llm.invoke(prompt)

    else:
        raise Exception("Invalid AI provider")


# -----------------------------
# Models
# -----------------------------

class FetchEmailsInput(BaseModel):
    email: str
    password: str


class AnalyzeInput(BaseModel):
    email_text: str


class LoginInput(BaseModel):
    email: str
    password: str

class SignupInput(BaseModel):
    name: str
    email: str
    password: str

# -----------------------------
# Email Import Endpoint
# -----------------------------

 
@app.post("/signup")
def signup(user: SignupInput):

    cursor.execute(
        "SELECT * FROM users WHERE email=?",
        (user.email,)
    )

    existing_user = cursor.fetchone()

    if existing_user:
        return {
            "status": "error",
            "message": "Email already exists"
        }

    # Hash the password with bcrypt before storing it.
    # bcrypt stores a salted hash and never saves the plain text password.
    hashed_password = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    cursor.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        (user.name, user.email, hashed_password)
    )

    conn.commit()

    return {
        "status": "success",
        "message": "Account created",
        "name": user.name
    }

@app.post("/login")
def login(user: LoginInput):

    # Lookup by email only, then verify the password against the bcrypt hash.
    cursor.execute(
        "SELECT name, email, password FROM users WHERE email=?",
        (user.email,)
    )

    found_user = cursor.fetchone()

    if not found_user:
        return {
            "status": "error",
            "message": "Invalid email or password"
        }

    name, email_address, stored_password_hash = found_user

    # bcrypt.checkpw returns True only if the provided password matches the stored hash.
    if bcrypt.checkpw(user.password.encode("utf-8"), stored_password_hash.encode("utf-8")):
        return {
            "status": "success",
            "message": "Login successful",
            "name": name,
            "email": email_address
        }

    return {
        "status": "error",
        "message": "Invalid email or password"
    }
 
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

        latest_email_ids = email_ids[-20:]

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

- General Inquiry:
  Questions, requests for information, or general communication.

- Technical Support:
  Reports of bugs, system errors, login issues, account access issues, or technical problems.

- Feedback & Suggestions:
  Positive feedback, compliments, suggestions, feature requests, appreciation, or customer opinions.

- Complaints:
  Customer dissatisfaction, negative experiences, service issues, or complaints.

- Urgent Assistance:
  Critical situations requiring immediate attention, urgent business impact, deadlines, or emergencies.

Sentiments:

- Appreciative:
  Positive feedback, compliments, gratitude, satisfaction.

- Neutral:
  Informational messages without strong emotion.

- Frustrated:
  Complaints, dissatisfaction, disappointment, anger.

- Urgent / Anxious:
  Stress, urgency, panic, immediate assistance required.

Customer Email:
{data.email_text}

Return exactly:

{{
  "category": "...",
  "sentiment": "...",
  "reply": "..."
}}
"""

        result_text = get_ai_response(prompt).strip()

        start = result_text.find("{")
        end = result_text.rfind("}") + 1

        if start != -1 and end != -1:
            result_text = result_text[start:end]

        return json.loads(result_text)

    except Exception as e:

        print("GEMINI ERROR:", str(e))

        return {
           "status": "error",
        "message": f"AI Provider Error: {str(e)}"

        }
    