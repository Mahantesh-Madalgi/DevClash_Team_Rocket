# Project Log

All actions are logged with timestamps.

2026-04-18T16:09:00+05:30 - Created backend folder and added .env and requirements.txt.
2026-04-18T16:09:10+05:30 - Installed backend Python dependencies.
2026-04-18T16:09:20+05:30 - Applied Supabase migration to create analysis_results table.
2026-04-18T16:09:30+05:30 - Created FastAPI main.py with /upload endpoint.
2026-04-18T18:36:00+05:30 - Phase 2 Initialization: Added groq, librosa, and soundfile dependencies.
2026-04-18T19:30:00+05:30 - Groq Integration: Successfully implemented evaluator.py using llama-3.1-8b-instant. Tested and verified raw JSON output with debug logging.
2026-04-18T23:00:00+05:30 - Optimized Graph Rendering and Data Smoothing: Integrated fixed 30-point timelines, simple moving average, Min-Max scaling, and high-fidelity conditional styling in Chart.js with bezier curves.

### Phase 4: Timestamped Event Engine
- **Timestamp**: 2026-04-19 00:15:00 UTC
- **Architecture**: Created `analysis_events` relational table. Extracted JD string directly to the Groq LLM module capable of analyzing contextual adherence, pushing mapped array events alongside acoustic triggers dynamically to Supabase.

### Phase 5: Dual-LLM Orchestrator
- **Timestamp**: 2026-04-19 00:20:00 UTC
- **Architecture**: Developed `backend/brain.py` establishing a two-tiered system. Deployed Groq strictly for ultra-fast, single-purpose heuristic scanning (e.g., Language switches). Integrated Google Gemini 1.5 Flash for deep-context Technical vs Job Description comparison analysis, funneling unified metadata structures into Supabase efficiently.

### Phase 6: Interactive Event Timeline UI
- **Timestamp**: 2026-04-19 00:25:00 UTC
- **Architecture**: Overhauled `VideoUpload.jsx` using Flexbox layout. Bound the `URL.createObjectURL(file)` to a native HTML5 video player hook. Installed `chartjs-plugin-annotation` and mapped SQL array points directly onto the curve. Added `onClick` interaction seeking via React `useRef` rendering the dynamically generated Gemini Match Report concurrently in the right-pane view.
