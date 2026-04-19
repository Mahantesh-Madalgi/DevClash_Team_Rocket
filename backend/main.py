from dotenv import load_dotenv
import os

# FFmpeg Configuration for Mac environment mapping
# This must happen BEFORE importing moviepy to override default path lookups
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    os.environ["FFMPEG_BINARY"] = ffmpeg_exe
    print(f"DEBUG: Manually mapped FFMPEG_BINARY to: {ffmpeg_exe}")
except ImportError:
    print("WARNING: imageio-ffmpeg not found. Video extraction may fail.")

from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from moviepy import VideoFileClip
import httpx
from supabase import create_client, Client
import uuid

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

def identify_interviewer(utterances):
    """
    Analyzes the first few utterances to find the person asking questions.
    """
    for u in utterances[:15]:
        text = u.get("transcript", "").lower()
        if "?" in text or any(k in text for k in ["tell me", "how", "what", "can you", "explain", "why"]):
            return u.get("speaker", 0)
    return 0

def group_exchanges(utterances, interviewer_id):
    """
    Pairs Interviewer Questions with Candidate Answers.
    """
    exchanges = []
    if not utterances: return []
    
    current_exchange = {"interviewer": "", "candidate": "", "timestamp": 0.0}
    last_speaker = None
    
    for u in utterances:
        speaker = u.get("speaker", 0)
        text = u.get("transcript", "")
        
        if speaker == interviewer_id:
            # If we were previously collecting a candidate's answer, push the old exchange
            if last_speaker is not None and last_speaker != interviewer_id:
                exchanges.append(current_exchange)
                current_exchange = {"interviewer": "", "candidate": "", "timestamp": u.get("start", 0.0)}
            
            current_exchange["interviewer"] = (current_exchange["interviewer"] + " " + text).strip()
            if not current_exchange["timestamp"]:
                current_exchange["timestamp"] = u.get("start", 0.0)
        else:
            current_exchange["candidate"] = (current_exchange["candidate"] + " " + text).strip()
            
        last_speaker = speaker
        
    if current_exchange["interviewer"] or current_exchange["candidate"]:
        exchanges.append(current_exchange)
        
    return exchanges

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
        from analyzer import count_silent_gaps, count_filler_words, analyze_energy_timeline, extract_confidence_events, calculate_success_probability
        filler_word_count = count_filler_words(response_dict)
    except Exception as e:
        print(f"DEBUG: Analyzer filler error: {e}")
        
    # Analyze Time-Series Energy & Confidence Gaps (Moved up to inform probability)
    energy_timeline = []
    confidence_events = []
    try:
        energy_timeline = analyze_energy_timeline(audio_path)
        confidence_events = extract_confidence_events(energy_timeline)
    except Exception as e:
        print(f"DEBUG: Timeline error: {e}")
        
    # Build Transcripts & Exchanges
    utterances = response_dict.get("results", {}).get("utterances", [])
    interviewer_id = identify_interviewer(utterances)
    exchanges = group_exchanges(utterances, interviewer_id)
    
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
        
        # Check for Critical LLM Failures
        if "error" in comparison_report or comparison_report.get("match_percentage") == 0 and comparison_report.get("summary", "").startswith("Critical"):
            msg = comparison_report.get("message", comparison_report.get("summary", "LLM Evaluation Failed"))
            print(f"CRITICAL: Aborting analysis due to LLM error: {msg}")
            raise HTTPException(status_code=403, detail=msg)

        technical_events = comparison_report.get("technical_events", [])
        
        # Merge Events early
        unified_events = confidence_events + language_events + technical_events
        
        # --- METRIC MAPPING: PRIORITIZE GROQ RATINGS FOR UI ---
        # Resilient extraction to handle varying LLM response formats
        print(f"\n--- [STAGE] DATA EXTRACTION & PROBABILITY CALCULATION ---")
        
        def extract_score(data, key):
            # Check in ratings nested object
            nested = data.get("ratings", {})
            if key in nested: return nested[key]
            # Check in top level
            if key in data: return data[key]
            # Fallback variations
            if key == "technical_depth":
                for alt in ["tech_depth", "technical"]:
                    if alt in nested: return nested[alt]
                    if alt in data: return data[alt]
            return 0

        groq_tech = extract_score(llm_response, "technical_depth")
        groq_conf = extract_score(llm_response, "confidence")
        groq_comm = extract_score(llm_response, "communication")
        
        # Calculate dynamic probability using the new advanced algorithm
        final_prob = calculate_success_probability(
            confidence=groq_conf,
            tech_depth=groq_tech,
            events=unified_events,
            energy_timeline=energy_timeline
        )
        print(f"DEBUG: Calculated Final Probability: {final_prob}%")
        
        # Update llm_feedback for UI and Supabase storage
        llm_feedback["is_jd_analysis"] = bool(job_description and job_description.strip())
        llm_feedback["match_percentage"] = comparison_report.get("match_percentage", 0)
        llm_feedback["scorecard"] = {
            "technical_depth": groq_tech,
            "communication_clarity": groq_comm,
            "confidence": groq_conf
        }
        llm_feedback["summary"] = comparison_report.get("summary", "")
        llm_feedback["selection_probability"] = final_prob
        llm_feedback["exchanges_json"] = exchanges # Carry forward for the UI
        print(f"DEBUG: LLM Feedback object prepared.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR in Dual-LLM Pipeline: {e}")
        # We don't raise here, we try to salvaging what we can
        
    finally:
        # Clean up audio file
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except OSError:
            pass

    # Store results in Supabase
    print(f"--- [STAGE] DATABASE PERSISTENCE ---")
    transcript_json = response_dict
    video_name = file.filename
    try:
        results_resp = supabase.table("analysis_results").insert({
            "id": interview_id,
            "video_name": video_name,
            "transcript_json": transcript_json,
            "exchanges_json": exchanges,
            "gap_count": gap_count,
            "filler_word_count": filler_word_count,
            "llm_feedback_json": llm_feedback,
            "energy_timeline": energy_timeline,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        print(f"DEBUG: analysis_results insert successful.")
        
        # Store Events
        if unified_events:
            push_events = []
            for ev in unified_events:
                push_events.append({
                    "interview_id": interview_id,
                    "timestamp": ev.get("timestamp", 0.0),
                    "type": ev.get("type", "negative"),
                    "category": ev.get("category", "language"),
                    "description": ev.get("description", ""),
                    "diagnosis": ev.get("diagnosis", ""),
                    "gold_standard": ev.get("gold_standard", ""),
                    "growth_plan": ev.get("growth_plan", "")
                })
            ev_resp = supabase.table("analysis_events").insert(push_events).execute()
            print(f"DEBUG: analysis_events ({len(push_events)} events) insert successful.")
            
    except Exception as e:
        print(f"CRITICAL SUPABASE ERROR: {e}")
        # Detailed diagnostic: check if it's a specific missing column or credential error
        raise HTTPException(status_code=500, detail=f"Database Persistence Failed: {str(e)}")

    print(f"--- [COMPLETE] ANALYSIS SUCCESSFUL ---")
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
