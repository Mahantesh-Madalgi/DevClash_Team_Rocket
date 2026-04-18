from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
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
DG_API_KEY = "8d57f094bf8e94df278e67b5efd374461c32d84d"

# Initialize Supabase client
SUPABASE_URL = "https://yptzwnbgbimbwczsnaxj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdHp3bmJnYmltYndjenNuYXhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUwMTM5NCwiZXhwIjoyMDkyMDc3Mzk0fQ.AlwiyRK_HTmizHATCkWpt4fteHXAHnr6nydywhPA1CI"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    # Save uploaded video to a temporary location
    temp_video_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    with open(temp_video_path, "wb") as buffer:
        buffer.write(await file.read())

    # Extract audio using moviepy (compress to MP3 to avoid massive file size and network timeout)
    try:
        clip = VideoFileClip(temp_video_path)
        audio_path = f"/tmp/{uuid.uuid4()}.mp3"
        clip.audio.write_audiofile(audio_path, codec="libmp3lame")
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
            dg_url = "https://api.deepgram.com/v1/listen?model=general&punctuate=true&diarize=true&filler_words=true"
            dg_resp = await http_client.post(
                dg_url,
                content=audio_bytes,
                headers={
                    "Authorization": f"Token {DG_API_KEY}",
                    "Content-Type": "audio/mp3"
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
            "video_name": video_name,
            "transcript_json": transcript_json,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        print(f"DEBUG: Supabase error: {e}")
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {e}")

    return JSONResponse(content={"status": "success", "transcript": transcript_json})
