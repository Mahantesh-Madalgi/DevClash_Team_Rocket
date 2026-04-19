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
    
    # We use Flash because it handles heavy technical context windows elegantly while remaining snappy
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    jd_context = job_description if job_description and job_description.strip() else "NO JOB DESCRIPTION PROVIDED. Perform a 'General Professional Conduct Evaluation' against standard interview benchmarks for clarity, technical soundness, and professional poise."
    
    prompt = f"""
You are an Senior Technical Interviewer & Auditor. 
Analyze the candidate's transcript against the Job Description or General Professional Standards with extreme precision.

JOB DESCRIPTION CONTEXT:
{jd_context}

TRANSCRIPT:
{transcript_text}

TASK:
1. "match_percentage": 
   - If JD is provided: A strict percentage calculation based on alignment with specific JD requirements.
   - If NO JD is provided: A "General Interview Readiness" score based on articulation, logical flow, and professional conduct.
2. "scorecard": 0-10 ratings for:
   - "technical_depth": Ability to explain 'how' and 'why'.
   - "communication_clarity": Conciseness and lack of ambiguity.
   - "requirement_relevance": (If NO JD, rate this as "Professionalism/Poise").
   - "confidence": Rated from hesitation, filler words, and assertion.
3. "technical_events": Extract critical moments where the candidate either EXCELLED (positive) or showed a GAP (negative) in professionalism or technical knowledge.
   - For POSITIVE events: Provide a "description".
   - For NEGATIVE events: Provide an "issue" (quote the exact full statement the candidate said poorly/wrongly) and a "correction" (provide the completely rewritten, ideal way they should have said it).
4. "selection_probability": A number 0-100 representing the probability this candidate would be selected for the next round based on their performance.
5. "summary": A 3-sentence high-signal summary.
   - If NO JD: Focus on general strengths and the single biggest communication or technical risk.

CRITICAL CONSTRAINTS:
- Do NOT use generic praise. Use evidence. 
- NO sentiment analysis or emotional tone checking.
- Output MUST be a raw, parsable JSON object.

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
            "category": "technical",
            "description": string,
            "issue": string,
            "correction": string
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
            "technical_events": []
        }
