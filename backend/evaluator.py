import os
import json
import re
from groq import Groq

def evaluate_transcript(deepgram_json: dict) -> dict:
    """
    Extracts the combined plain text transcript from Deepgram and asks Groq to analyze it.
    Returns a strict JSON format.
    """
    try:
        channels = deepgram_json.get("results", {}).get("channels", [])
        if not channels:
            transcript_text = "No transcript found."
        else:
            transcript_text = channels[0].get("alternatives", [{}])[0].get("transcript", "")
            
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        client = Groq(api_key=GROQ_API_KEY)
        
        prompt = f"""
Analyze the following interview response sequence.
Rate it on a scale of 1-10 for the following attributes: Clarity, Technical Depth, and Confidence.
Provide 2 specific strengths and 1 actionable weakness based on their speech.

Respond ONLY with a raw JSON object exactly matching this schema:
{{
    "ratings": {{
        "clarity": 8,
        "technical_depth": 7,
        "confidence": 9
    }},
    "strengths": ["string", "string"],
    "weakness": "string"
}}

TRANSCRIPT:
{transcript_text}
"""
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192", 
            temperature=0.2,
        )
        
        raw_response = completion.choices[0].message.content
        
        # Safely extract JSON blocks if markdown is present
        match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(raw_response)
        
    except Exception as e:
        print(f"DEBUG: Error evaluating transcript with Groq: {e}")
        return {
            "ratings": {"clarity": 0, "technical_depth": 0, "confidence": 0},
            "strengths": [],
            "weakness": "Feedback evaluation failed."
        }
