import os
import json
import re
from groq import Groq
import google.generativeai as genai

def groq_scan_language(timed_transcript: str, job_description: str) -> list:
    """
    Lightning-fast anomaly check using Groq for unallowed language detection.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    client = Groq(api_key=GROQ_API_KEY)
    
    jd_context = job_description if job_description and job_description.strip() else "Assume strict English ONLY."
    
    prompt = f"""
Analyze the following interview transcript mapped by timestamp.
JOB DESCRIPTION STRICTNESS: '{jd_context}'

Task: Detect Language Violations. If the speaker uses a language explicitly NOT allowed by the Job Description, extract it.

Respond ONLY with a raw JSON array matching this format (return empty [] if no violations):
[
    {{
        "timestamp": 1.5,
        "description": "Used unauthorized language.",
        "correction": "(English translation of the phrase)"
    }}
]

TIMED TRANSCRIPT:
{timed_transcript}
"""
    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant", 
            temperature=0.0,
        )
        raw_response = completion.choices[0].message.content
        match = re.search(r"\[.*\]", raw_response, re.DOTALL)
        return json.loads(match.group(0)) if match else json.loads(raw_response)
    except Exception as e:
        print(f"DEBUG: Groq scan error: {e}")
        return []

def gemini_comparison_report(transcript_text: str, job_description: str) -> dict:
    """
    Deep analytical comparison using Gemini 1.5. Scores capability against JD.
    """
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=GEMINI_API_KEY)
    
    # We use Flash because it handles heavy technical context windows elegantly while remaining snappy
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
You are an expert technical HR auditor.
Below is the candidate's transcript and the given Job Description requirements.

JOB DESCRIPTION:
{job_description or "General Professional Role"}

TRANSCRIPT:
{transcript_text}

Analyze the candidate's technical skills, soft skills, and experiences vs the Job Description. Output a strict JSON object:
{{
    "match_percentage": 85,
    "technical_events": [
        {{
            "timestamp": 12.0,
            "type": "positive",
            "category": "technical",
            "description": "Demonstrated strong knowledge relevant to JD."
        }},
        {{
            "timestamp": 45.0,
            "type": "negative",
            "category": "leadership",
            "description": "Lacked examples required for leadership."
        }}
    ]
}}
Ensure the JSON is raw and parsable. If exact timestamps are unknown, approximate or default to 0.0.
"""
    try:
        response = model.generate_content(prompt)
        raw_response = response.text
        print("--- RAW GEMINI COMPARISON REPORT ---")
        print(raw_response)
        
        match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        return json.loads(match.group(0)) if match else json.loads(raw_response)
    except Exception as e:
        print(f"DEBUG: Gemini evaluation error: {e}")
        return {
            "match_percentage": 0,
            "technical_events": []
        }
