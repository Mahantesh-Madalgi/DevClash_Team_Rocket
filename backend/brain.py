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
        "diagnosis": "Language switch to [Language Name]",
        "gold_standard": "(The fully rewritten correct statement translated to English)",
        "growth_plan": "Maintain English immersion for technical consistency."
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
    
    # Pre-flight format validation
    if not GEMINI_API_KEY or not GEMINI_API_KEY.startswith("AIza"):
        print(f"CRITICAL: Malformed Gemini API Key. Starts with: {str(GEMINI_API_KEY)[:4]}...")
        return {
            "match_percentage": 0,
            "selection_probability": 2,
            "scorecard": {"technical_depth": 0, "communication_clarity": 0, "requirement_relevance": 0, "confidence": 0},
            "technical_events": [],
            "summary": "Critical: Gemini API Key is malformed/invalid in .env."
        }

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-flash-latest')
        
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
3. "technical_events": Extract critical moments.
   - POSITIVE Categorization: "confidence", "language_fluency", "voice_clarity", "technical_keywords".
   - NEGATIVE Categorization: "hesitation", "fear", "underconfidence", "anger".
   - For every NEGATIVE event, provide a structured Mentorship Insight:
     - "diagnosis": What went wrong (e.g., 'Exhibited vocal frustration/anger', 'Hesitated on basic architectural question').
     - "gold_standard": The optimized English-only response or behavioral reframe (e.g., 'I understand the complexity, and here is how I approach it...').
     - "growth_plan": PROFESSIONAL REFRAMING TIP. Instead of just technical fixes, focus on self-control and composure (e.g., 'When feeling fear, pause for 2 seconds to reset your breathing before answering').
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
            "category": "confidence" | "language_fluency" | "voice_clarity" | "technical_keywords" | "hesitation" | "fear" | "underconfidence" | "anger",
            "description": string, (Use for POSITIVE events)
            "diagnosis": string, (MANDATORY for NEGATIVE events)
            "gold_standard": string, (MANDATORY for NEGATIVE events)
            "growth_plan": string (MANDATORY for NEGATIVE events)
        }}
    ],
    "summary": string
}}
"""
        response = model.generate_content(prompt)
        text = response.text
        
        match = re.search(r"\{.*\}", text, re.DOTALL)
        return json.loads(match.group(0)) if match else json.loads(text)
        
    except Exception as e:
        print(f"DEBUG: Gemini evaluation failure: {e}")
        return {
            "match_percentage": 0,
            "selection_probability": 2,
            "scorecard": {"technical_depth": 0, "communication_clarity": 0, "requirement_relevance": 0, "confidence": 0},
            "technical_events": [],
            "summary": f"Evaluation error: {str(e)}"
        }
