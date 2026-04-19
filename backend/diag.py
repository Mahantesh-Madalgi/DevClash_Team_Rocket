import os
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq
from supabase import create_client

load_dotenv()

def test_apis():
    print("--- Diagnostic Start ---")
    
    # Supabase
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        supabase = create_client(url, key)
        supabase.table("analysis_results").select("count", count="exact").limit(1).execute()
        print("✅ Supabase: Connected")
    except Exception as e:
        print(f"❌ Supabase: Failed - {e}")

    # Groq
    try:
        groq_key = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=groq_key)
        client.chat.completions.create(
            messages=[{"role": "user", "content": "Hi"}],
            model="llama-3.1-8b-instant",
        )
        print("✅ Groq: Connected")
    except Exception as e:
        print(f"❌ Groq: Failed - {e}")

    # Gemini
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-flash-latest')
        model.generate_content("Hi")
        print("✅ Gemini: Connected")
    except Exception as e:
        print(f"❌ Gemini: Failed - {e}")

if __name__ == "__main__":
    test_apis()
