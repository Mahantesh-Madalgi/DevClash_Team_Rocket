from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from moviepy import VideoFileClip
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import uuid

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Deepgram credentials
DG_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    job_description: str = Form(None)
):
    interview_id = str(uuid.uuid4())
    # Save uploaded video to a temporary location
    temp_video_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    with open(temp_video_path, "wb") as buffer:
        buffer.write(await file.read())

    # Extract audio as WAV — stereo + 128k for accurate speaker diarization
    try:
        clip = VideoFileClip(temp_video_path)
        audio_path = f"/tmp/{uuid.uuid4()}.wav"
        # WAV with 128k preserves stereo channel separation, critical for diarization accuracy
        # Deepgram performs much better with stereo: it can acoustically isolate voices per channel
        clip.audio.write_audiofile(
            audio_path,
            fps=16000,        # 16kHz is the optimal sample rate for speech models
            nbytes=2,         # 16-bit PCM
            ffmpeg_params=["-ac", "2"]  # Preserve stereo channels
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {e}")
    finally:
        # Clean up video file
        try:
            os.remove(temp_video_path)
        except OSError:
            pass

    # Read audio bytes
    with open(audio_path, "rb") as audio_file:
        audio_bytes = audio_file.read()

    # Send to Deepgram for diarized transcription with filler words
    try:
        async with httpx.AsyncClient(timeout=300.0) as http_client:
            dg_url = (
                "https://api.deepgram.com/v1/listen"
                "?model=nova-2"            # Best accuracy model
                "&language=en"             # Lock to English
                "&punctuate=true"
                "&diarize=true"            # Speaker diarization
                "&multichannel=false"      # Force single diarized output (not separate channel transcripts)
                "&smart_format=true"       # Format numbers, dates, proper nouns
                "&filler_words=true"       # Detect um/uh
                "&utterances=true"         # Return grouped utterances with speaker IDs
            )
            dg_resp = await http_client.post(
                dg_url,
                content=audio_bytes,
                headers={
                    "Authorization": f"Token {DG_API_KEY}",
                    "Content-Type": "audio/wav"  # WAV for better diarization quality
                }
            )
            if dg_resp.status_code != 200:
                raise Exception(f"Deepgram returned {dg_resp.status_code}: {dg_resp.text}")
            response_dict = dg_resp.json()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG: Deepgram error: {type(e).__name__} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Deepgram request failed: {type(e).__name__} - {str(e)}")
    # --- PHASE 2 PIPELINE ---
    # Analyze silent gaps
    gap_count = 0
    try:
        from analyzer import count_silent_gaps, count_filler_words
        gap_count = count_silent_gaps(audio_path)
    except Exception as e:
        print(f"DEBUG: Analyzer gap error: {e}")
        
    # Analyze filler words
    filler_word_count = 0
    try:
        filler_word_count = count_filler_words(response_dict)
    except Exception as e:
        print(f"DEBUG: Analyzer filler error: {e}")
        
    # Build Transcripts
    channels = response_dict.get("results", {}).get("channels", [])
    transcript_text = channels[0].get("alternatives", [{}])[0].get("transcript", "") if channels else ""
    
    words = channels[0].get("alternatives", [{}])[0].get("words", []) if channels else []
    timed_transcript = ""
    current_chunk = []
    chunk_start = 0.0
    for w in words:
        if not current_chunk:
            chunk_start = w.get("start", 0.0)
        current_chunk.append(w.get("word", ""))
        if w.get("end", 0.0) - chunk_start >= 4.0:
            timed_transcript += f"[{round(chunk_start, 1)}s] {' '.join(current_chunk)}\n"
            current_chunk = []
    if current_chunk:
        timed_transcript += f"[{round(chunk_start, 1)}s] {' '.join(current_chunk)}\n"

    # Evaluate with Dual-LLMs
    llm_feedback = {}
    language_events = []
    comparison_report = {}
    technical_events = []
    try:
        from evaluator import evaluate_transcript
        from brain import groq_scan_language, gemini_comparison_report
        
        # Basic Ratings
        llm_response = evaluate_transcript(response_dict)
        llm_feedback = {
            "ratings": llm_response.get("ratings", {}),
            "strengths": llm_response.get("strengths", []),
            "improvement_plan": llm_response.get("improvement_plan", "Failed fallback.")
        }
        
        # Groq Fast Language Anomaly Scanning
        lang_evts = groq_scan_language(timed_transcript, job_description)
        for evt in lang_evts:
            evt["type"] = "negative"
            evt["category"] = "language"
        language_events = lang_evts
        
        # Gemini Deep JD Comparison
        comparison_report = gemini_comparison_report(transcript_text, job_description)
        tech_evts = comparison_report.get("technical_events", [])
        technical_events = tech_evts
        
        # Fetch raw scores with robust fallbacks
        tech_score = comparison_report.get("scorecard", {}).get("technical_depth", 0)
        comm_score = comparison_report.get("scorecard", {}).get("communication_clarity", 0)
        conf_score = comparison_report.get("scorecard", {}).get("confidence", comm_score) # fallback to comm if conf is completely missing
        
        # Calculate dynamic probability
        pos_events = len([e for e in tech_evts if e.get("type") == "positive"])
        base_prob = (tech_score * 4.5) + (conf_score * 3.5) + (pos_events * 2.0)
        final_prob = min(98, max(5, int(base_prob))) # Bound between 5% and 98%
        
        # Merge comparison report into llm_feedback for Supabase storage
        llm_feedback["is_jd_analysis"] = bool(job_description and job_description.strip())
        llm_feedback["match_percentage"] = comparison_report.get("match_percentage", 0)
        llm_feedback["scorecard"] = {
            "technical_depth": tech_score,
            "communication_clarity": comm_score,
            "confidence": conf_score
        }
        llm_feedback["summary"] = comparison_report.get("summary", "")
        llm_feedback["selection_probability"] = final_prob
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG: Dual-LLM Orchestration error: {e}")
        
    # Analyze Time-Series Energy
    energy_timeline = []
    confidence_events = []
    try:
        from analyzer import analyze_energy_timeline, extract_confidence_events
        energy_timeline = analyze_energy_timeline(audio_path)
        confidence_events = extract_confidence_events(energy_timeline)
    except Exception as e:
        print(f"DEBUG: Timeline error: {e}")

    finally:
        # Clean up audio file
        try:
            os.remove(audio_path)
        except OSError:
            pass

    # Store transcript JSON in Supabase
    transcript_json = response_dict
    video_name = file.filename
    try:
        supabase.table("analysis_results").insert({
            "id": interview_id,
            "video_name": video_name,
            "transcript_json": transcript_json,
            "gap_count": gap_count,
            "filler_word_count": filler_word_count,
            "llm_feedback_json": llm_feedback,
            "energy_timeline": energy_timeline,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        
        # Merge Events & Store Foreign Keys
        unified_events = confidence_events + language_events + technical_events
        if unified_events:
            push_events = []
            for ev in unified_events:
                push_events.append({
                    "interview_id": interview_id,
                    "timestamp": ev.get("timestamp", 0.0),
                    "type": ev.get("type", "negative"),
                    "category": ev.get("category", "language"),
                    "description": ev.get("description", ""),
                    "correction": ev.get("correction", None)
                })
            supabase.table("analysis_events").insert(push_events).execute()
            
    except Exception as e:
        print(f"DEBUG: Supabase error: {e}")
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {e}")

    return JSONResponse(content={
        "status": "success", 
        "transcript": transcript_json,
        "analysis": {
            "gaps": gap_count,
            "fillers": filler_word_count,
            "feedback": llm_feedback,
            "timeline": energy_timeline,
            "events": unified_events
        }
    })
