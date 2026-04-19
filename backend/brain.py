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
        "issue": "(The exact non-allowed statement spoken by the candidate)",
        "correction": "(The fully rewritten correct statement translated to English)"
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
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    jd_context = job_description if job_description and job_description.strip() else "NO JOB DESCRIPTION PROVIDED. Perform a 'General Professional Conduct Evaluation'."
    
    prompt = f"""
You are a Senior Technical Architect & Real Mentor. 
Analyze the candidate's transcript with Empathetic Technical Rigor. 

JOB DESCRIPTION CONTEXT:
{jd_context}

TRANSCRIPT:
{transcript_text}

TASK:
1. "match_percentage": A balanced alignment score rewarding structural logic.
2. "scorecard": 0-10 ratings for Technical Depth, Communication, Relevance, and Confidence.
3. "technical_events": For every GROWTH AREA (negative event), provide a structured Mentorship Insight:
   - "diagnosis": What exactly went wrong (e.g., 'Switched to non-English language', 'Vague on React Hooks dependency array').
   - "gold_standard": The optimized, English-only architectural response they SHOULD have given.
   - "growth_plan": A practical mentor tip (e.g., 'Practice explaining state cycles in English', 'Study the difference between useEffect and useMemo').
   - "timestamp": The exact second this happened.
4. "selection_probability": 0-100 realistic readiness score.
5. "summary": 3-sentence mentor summary highlighting the path to excellence.

JSON SCHEMA:
{{
    "match_percentage": number,
    "selection_probability": number,
    "scorecard": {{
        "technical_depth": number,
        "communication_clarity": number,
        "requirement_relevance": number,
        "confidence": number
    }},
    "technical_events": [
        {{
            "timestamp": number,
            "type": "positive" | "negative",
            "category": "technical" | "language" | "confidence",
            "description": string, (Use for POSITIVE events)
            "diagnosis": string, (MANDATORY for NEGATIVE events)
            "gold_standard": string, (MANDATORY for NEGATIVE events)
            "growth_plan": string (MANDATORY for NEGATIVE events)
        }}
    ],
    "summary": string
}}
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
            "selection_probability": 0,
            "scorecard": {
                "technical_depth": 0,
                "communication_clarity": 0,
                "requirement_relevance": 0,
                "confidence": 0
            },
            "technical_events": [],
            "summary": "AI evaluation failed. Please check backend logs."
        }
