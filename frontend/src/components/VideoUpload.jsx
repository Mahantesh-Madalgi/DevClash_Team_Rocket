import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import JDInput from "./JDInput";
import EnergyAnalytics from "./EnergyAnalytics";
import InterviewTimeline from "./InterviewTimeline";

// Supabase credentials (using environment variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default function VideoUpload() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [transcript, setTranscript] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const videoRef = React.useRef(null);
  const videoUrl = file ? URL.createObjectURL(file) : null;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jobDescription) {
        formData.append("job_description", jobDescription);
      }
      
      // 1. Upload to backend
      const resp = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      
      if (data.analysis && data.analysis.events) {
         setEvents(data.analysis.events);
      }
      
      const videoName = file.name;
      
      // 2. Fetch transcript from Supabase using the SDK
      const { data: rows, error: supErr } = await supabase
        .from("analysis_results")
        .select("transcript_json, llm_feedback_json, energy_timeline")
        .eq("video_name", videoName)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (supErr) {
        throw new Error(supErr.message);
      }
      
      if (rows && rows.length > 0) {
        setTranscript(rows[0].transcript_json);
        setFeedback(rows[0].llm_feedback_json);
        setTimeline(rows[0].energy_timeline);
        console.log("Analysis Feedback from DB:", rows[0].llm_feedback_json);
      } else {
        setError("Transcript not found in Supabase");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTranscript = () => {
    if (!transcript) return null;
    // Deepgram diarized format: transcript.speakers array with utterances
    const speakers = transcript.speakers || [];
    return (
      <div className="transcript">
        {speakers.map((speaker, idx) => (
          <div key={idx} className="speaker-block" style={{ marginBottom: "1rem" }}>
            <strong>{`Speaker ${speaker.speaker}`}</strong>
            <p>{speaker.transcript}</p>
          </div>
        ))}
        {feedback && feedback.improvement_plan && (
          <div className="feedback-box" style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f9f9f9", borderLeft: "4px solid #007bff" }}>
            <h3>AI Feedback</h3>
            <p><strong>Improvement Plan:</strong> {feedback.improvement_plan}</p>
          </div>
        )}
        
        {timeline && timeline.length > 0 && (
          <EnergyChart data={timeline} />
        )}
      </div>
    );
  };
  
  const handleEventClick = (ev) => {
    setActiveEvent(ev);
    if (videoRef.current) {
      videoRef.current.currentTime = ev.timestamp;
      videoRef.current.play().catch(e => console.log("Video Play Error:", e));
    }
  };

  return (
    <div style={{ padding: "2rem", display: "flex", gap: "2rem", maxWidth: "1200px", margin: "auto" }}>
      {/* LEFT COLUMN: UPLOAD, VIDEO, CHART */}
      <div style={{ flex: 2 }}>
        <h2>Interactive Upload Dashboard</h2>
        <JDInput jobDescription={jobDescription} setJobDescription={setJobDescription} />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={loading}
        />
        <button onClick={handleUpload} disabled={!file || loading} style={{ marginLeft: "1rem" }}>
          {loading ? "Processing…" : "Upload"}
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
        
        {videoUrl && (
          <div style={{ marginTop: "1rem" }}>
            <video ref={videoRef} src={videoUrl} controls style={{ width: "100%", borderRadius: "8px" }} />
          </div>
        )}

        {timeline && timeline.length > 0 && <EnergyAnalytics data={timeline} activeEvent={activeEvent} />}
      </div>

      {/* RIGHT COLUMN: TIMELINE & MATCH REPORT SIDEBAR */}
      <div style={{ flex: 1, paddingLeft: "1rem", borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <InterviewTimeline events={events} activeEvent={activeEvent} onEventClick={handleEventClick} />
        
        <div style={{ marginTop: "2rem" }}>
          <h3>Gemini Match Report</h3>
          {feedback ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                 <h1 style={{ fontSize: "3rem", margin: 0, color: "rgba(138, 43, 226, 1)" }}>{feedback.ratings.technical_depth * 10}%</h1>
                 <p style={{ margin: 0 }}><strong>Match Alignment</strong></p>
              </div>
              <h4>Strengths</h4>
              <ul>
                {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <h4>Improvement Plan</h4>
              <p>{feedback.improvement_plan}</p>
            </div>
          ) : (
            <p style={{ color: "#999" }}>Awaiting Deep Analysis...</p>
          )}
        </div>
      </div>
    </div>
  );
}
