# 🚀 Hirelytics - AI Interview Mentorship & Analytics Platform

Welcome to **Hirelytics**, a next-generation AI-powered platform that transforms raw interview videography into highly structured, actionable mentorship. Built during the *DevClash* hackathon, Hirelytics moves beyond basic transcription to offer true "Real Mentor" insights—analyzing technical depth, acoustic vocal projection, and emotional composure in real-time.

## ✨ Key Features
- **Upload-First Experience:** Seamlessly ingest heavy video files with localized audio extraction to ensure fast, private processing.
- **Deepgram Diarization:** Pinpoint accuracy distinguishing between the Interviewer's questions and the Candidate's answers.
- **Dual-LLM AI Engine:** 
  - **Groq (Llama 3.1):** Performs lightning-fast anomaly detection, instantly catching language switches or basic faults.
  - **Google Gemini (1.5 Flash):** Acts as the "Senior Technical Architect," grading structural logic, emotional composure (Fear, Anger, Hesitation), and generating detailed mentorship pipelines.
- **The "Mentor Card":** A stunning Glassmorphism UI that breaks down every critical moment into three actionable points: *Diagnosis*, *Gold Standard (Correction)*, and a *Growth Plan*.
- **Interactive Timeline Sync:** Click a timeline event to instantly fast-forward the video and auto-scroll the transcript to the exact moment of failure or success.

## 🛠 Tech Stack
- **Frontend:** React + Vite, CSS3 (Custom Glassmorphism Tokens), Lucide React.
- **Backend:** Python + FastAPI.
- **Audio/Video Processing:** MoviePy, FFmpeg.
- **Speech-to-Text:** Deepgram Nova-2 (Diarized & Time-stamped).
- **Core AI:** Groq (Llama), Google Gemini.
- **Database:** Supabase (PostgreSQL).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- Activated API Keys for: Deepgram, Groq, Gemini, and Supabase.

### Environment Setup
Create a `.env` file in the `/backend` folder:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Running the Platform

1. **Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

2. **Start the Backend:**
*(Ensure you use the system Python with dependencies installed, bypassing local Conda loops if applicable)*
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 📖 Deep Architecture
Curious about how the Dual-LLM Orchestration or the Acoustic Probability Engine works? 
Check out the **[Architecture Guide (ARCHITECTURE.md)](./ARCHITECTURE.md)** for detailed data-flow diagrams and schema breakdowns.

---
*Built with ❤️ by Team Rocket for DevClash.*
