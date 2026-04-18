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
                "ratings": {"clarity": 0, "technical_depth": 0, "confidence": 0},
                "strengths": [],
                "improvement_plan": "No transcript found."
            }
            
        transcript_text = channels[0].get("alternatives", [{}])[0].get("transcript", "")
            
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=GROQ_API_KEY)
        
        prompt = f"""
Analyze the following interview response sequence.

Tasks:
1. Rate Clarity, Technical Depth, and Confidence (1-10).
2. Provide 2 strengths and 1 improvement_plan based on speech.

Respond ONLY with a raw JSON object exactly matching this schema:
{{
    "ratings": {{ "clarity": 8, "technical_depth": 7, "confidence": 9 }},
    "strengths": ["...", "..."],
    "improvement_plan": "..."
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
            "ratings": {"clarity": 0, "technical_depth": 0, "confidence": 0},
            "strengths": [],
            "improvement_plan": "Feedback evaluation failed."
        }
