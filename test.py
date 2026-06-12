import requests


url = "http://127.0.0.1:8000/analyze-email"


data = {
    "email_text": "Hey, I bought your software yesterday but it keeps crashing whenever I try to open it. Fix this ASAP or give me my money back!"
}


print("Sending email to AI... Please wait...")
response = requests.post(url, json=data)


print("\n--- AI Result ---")
print(response.json())