import os
import json
import re
from groq import Groq

def evaluate_transcript(deepgram_json: dict) -> dict:
    """
    Extracts the combined plain text transcript from Deepgram and asks Groq to analyze it.
    Returns general metric JSON format.
    """
    try:
        channels = deepgram_json.get("results", {}).get("channels", [])
        if not channels:
            return {
                "ratings": {"communication": 0, "technical_depth": 0, "confidence": 0},
                "strengths": [],
                "improvement_plan": "No transcript found."
            }
            
        transcript_text = channels[0].get("alternatives", [{}])[0].get("transcript", "")
            
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=GROQ_API_KEY)
        
        prompt = f"""
You are a Senior Technical Mentor & Interviewer. Analyze the following interview transcript for professional communication and core depth.

TASKS:
1. Rate "communication", "technical_depth", and "confidence" on a balanced and growth-oriented 1-10 scale.
2. Provide two "strengths": recognize valid technical logic and specific professional wins.
3. Provide one "improvement_plan": this MUST be a single plain-text string. Focus on actionable growth.

OUTPUT FORMAT:
Respond ONLY with a raw JSON object matching this schema:
{{
  "ratings": {{
    "communication": number,
    "technical_depth": number,
    "confidence": number
  }},
  "strengths": [string, string],
  "improvement_plan": string
}}

EXAMPLE:
{{
  "ratings": {{
    "communication": 8,
    "technical_depth": 7,
    "confidence": 9
  }},
  "strengths": ["Excellent handling of React state", "Strong understanding of SQL joins"],
  "improvement_plan": "Focus on reducing filler words during complex technical explanations."
}}

TRANSCRIPT:
{transcript_text}
"""
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant", 
            temperature=0.2,
        )
        
        raw_response = completion.choices[0].message.content
        match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(raw_response)
        
    except Exception as e:
        print(f"DEBUG: Error evaluating transcript with Groq: {e}")
        return {
            "ratings": {"communication": 0, "technical_depth": 0, "confidence": 0},
            "strengths": [],
            "improvement_plan": "Feedback evaluation failed."
        }
