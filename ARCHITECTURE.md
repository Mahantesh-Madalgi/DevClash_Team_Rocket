# Hirelytics Architecture & System Design

This document details the internal data flows, micro-orchestration patterns, and database lifecycles that power **Hirelytics**.

---

## 1. High-Level Data Flow (The Upload Pipeline)

The system relies on an **"Upload-First"** architecture. No heavy video processing happens in the browser; the heavy lifting is delegated entirely to the FastAPI Python backend.

### Stage 1: Ingestion & Extraction
1. The React frontend posts a `multipart/form-data` payload containing the raw `.mp4` and an optional Job Description string to `/upload` in `main.py`.
2. The backend temporarily caches the video in `/tmp`.
3. **MoviePy / FFmpeg** extracts the audio track exclusively as a 128k stereo `.wav` file. Stereo extraction is legally critical to maximize the acoustic channel separation required for accurate speaker diarization.

### Stage 2: Acoustic Pre-Processing & Diarization
1. The `.wav` file is transmitted to **Deepgram (Nova-2)**.
2. Deepgram returns a highly-structured JSON payload containing:
   - Word-level timestamps.
   - Identified filler words (`um`, `uh`).
   - Speaker diarization (Speaker 0 vs Speaker 1).
3. The `analyzer.py` engine computes an **Energy Timeline Proxy**, scanning the raw acoustic peaks using Root Mean Square Energy, charting the candidate's "Vocal Projection" independently of the semantic meaning of their words. 

### Stage 3: The Dual-LLM Orchestration
To prevent hallucinations and reduce latency, task delegation is split across two LLMs.

**A. The Groq/Llama Scanner (Fast Filter):**
- Processes the rough, timed-transcript with `llama-3.1-8b`.
- Operates at high speed to exclusively detect strict language anomalies (e.g., swapping to Hindi/Marathi during a strict English requirement).

**B. The Gemini Semantic Mentor (Deep Analysis):**
- Utilizes `gemini-flash-latest`.
- Absorbs the Job Description and the transcript to act as a **Senior Technical Architect**.
- Returns a structured schema isolating deep technical strengths, and critically mapping "Growth Events" into 8 behavioral categories:
  - *Positives*: `confidence`, `language_fluency`, `voice_clarity`, `technical_keywords`
  - *Negatives*: `hesitation`, `fear`, `underconfidence`, `anger`

### Stage 4: Probability Synthesis & Persistence
1. `calculate_success_probability()` merges technical prowess, chronological event momentum, and acoustic energy into a single realistic `0-100` Selection Score.
2. The final synthesized JSON and all categorized events are pushed to **Supabase** via the Python client.

---

## 2. Real-Time UI Synchronization Pattern

The React frontend operates on an interlocking state pattern to synchronize three heavy UI components without lagging:

1. **The Timeline (`InterviewTimeline.jsx`)**: Renders chronological "Jump List" badges for events.
2. **The Transcript (`LiveTranscript.jsx`)**: Maps raw utterances into unified Q&A "Exchanges".
3. **The Video Player** and **Mentor Card (`VideoUpload.jsx`)**.

### Bi-Directional Binding
When a user clicks an event on the Timeline (e.g., *Fear at 1:23*):
- The parent component (`VideoUpload.jsx`) updates the `activeEvent` state.
- A `useRef` hook commands the Video DOM Element to `currentTime = event.timestamp` and executes `.play()`.
- A synced `useEffect` in the Transcript component maps the timestamp to the exact DOM element holding the spoken word and fires `scrollIntoView({ behavior: "smooth", block: "center" })`.
- The **Mentor Card** overlay actively binds to the `activeEvent` state, revealing the hidden *Diagnosis*, *Gold Standard*, and *Growth Plan* without requiring a second network request.

---

## 3. Database Schema (Supabase PostgreSQL)

### `analysis_results` (The Parent Trace)
Acts as the single point of truth for a session.
- `id` (UUID, Primary Key)
- `video_name` (Text)
- `transcript_json` (JSONB): Raw Deepgram API response.
- `exchanges_json` (JSONB): Pre-computed Q&A Groupings to save frontend cycles.
- `llm_feedback_json` (JSONB): The synthesized Dual-LLM scores.
- `energy_timeline` (JSONB): The acoustic gradient array.
- `created_at` (Timestampz)

### `analysis_events` (The Chronological Edge)
Foreign-keyed to the Parent Trace, holding highly-relational mentor insights.
- `id` (UUID, Primary Key)
- `interview_id` (UUID, FK -> analysis_results.id)
- `timestamp` (Float): Seconds elapsed.
- `type` (Text): 'positive' or 'negative'.
- `category` (Text): (e.g., 'technical_keywords', 'anger', 'fear'). *Note: Postgres Check constraints manually decoupled for dynamic AI scaling.*
- `description` (Text): Summary for positive events.
- `diagnosis` (Text): What went chronologically wrong.
- `gold_standard` (Text): The English-only optimized architectural baseline.
- `growth_plan` (Text): Composure and regulation coaching.
