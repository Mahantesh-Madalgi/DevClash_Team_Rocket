import os
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

def test_deepgram():
    try:
        url = "https://api.deepgram.com/v1/projects"
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "application/json"
        }
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            print("Deepgram OK")
            print(f"Projects: {res.json()}")
        else:
            print(f"Deepgram Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Deepgram Error: {e}")

if __name__ == "__main__":
    test_deepgram()
