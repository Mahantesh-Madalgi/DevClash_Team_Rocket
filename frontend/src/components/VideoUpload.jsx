import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  Play,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  Users
} from "lucide-react";

import JDInput from "./JDInput";
import EnergyAnalytics from "./EnergyAnalytics";
import InterviewTimeline from "./InterviewTimeline";
import LiveTranscript from "./LiveTranscript";
import SelectionPieChart from "./SelectionPieChart";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef(null);
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

      const resp = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("Analysis failed. Please check your backend connection.");
      const data = await resp.json();

      // Use the API response data directly for immediate UI updates
      if (data.analysis) {
        setTranscript(data.transcript);
        setFeedback(data.analysis.feedback);
        setTimeline(data.analysis.timeline);
        if (data.analysis.events) {
          setEvents(data.analysis.events);
        }
      } else {
        setError("Analysis data was not returned correctly from the backend.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (ev) => {
    setActiveEvent(ev);
    if (videoRef.current) {
      videoRef.current.currentTime = ev.timestamp;
      videoRef.current.play().catch(e => console.log("Playback error:", e));
    }
  };

  const updateTime = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const isInitialState = !loading && !feedback;

  if (isInitialState) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", padding: "2.5rem", boxSizing: "border-box" }}>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: "1rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, width: "100%" }}
          >
            <AlertTriangle size={18} /> {error}
          </motion.div>
        )}

        {/* Full-width drag box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ width: "100%" }}
        >
          <div
            className={`drag-box-professional glass-card ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              setFile(e.dataTransfer.files[0]);
            }}
            onClick={() => document.getElementById("video-upload-initial").click()}
            style={{
              width: "100%",
              height: "220px",
              padding: "2rem 3rem",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "2.5rem",
              boxSizing: "border-box",
              cursor: "pointer"
            }}
          >
            <input
              type="file"
              id="video-upload-initial"
              hidden
              accept="video/*"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {/* Left: Icon */}
            <div className="animate-bounce-slow" style={{ color: "var(--accent-purple)", flexShrink: 0 }}>
              <CloudUpload size={72} />
            </div>

            {/* Vertical Divider */}
            <div style={{ width: "1px", height: "80px", background: "var(--slate-300)", flexShrink: 0 }} />

            {/* Right: Text */}
            <div style={{ textAlign: "left" }}>
              <h3 style={{ color: "var(--brand-800)", margin: "0 0 0.5rem 0", fontWeight: "800", fontSize: "1.5rem" }}>
                {file ? `Selected: ${file.name}` : "Drag & Drop your files here, or click to browse"}
              </h3>
              <span style={{ color: "var(--brand-500)", fontSize: "0.875rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                SUPPORTS MP4 (MAX 5 MIN)
              </span>
            </div>
          </div>

          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "2rem" }}>
              <div className="glass-card" style={{ padding: "1.5rem", background: "#fff", border: "1px solid var(--slate-200)", borderRadius: "0px" }}>
                <JDInput jobDescription={jobDescription} setJobDescription={setJobDescription} />
              </div>
              <button
                className="btn-primary"
                onClick={handleUpload}
                style={{ borderRadius: "0px", padding: "1.25rem", fontSize: "1.1rem", display: "flex", justifyContent: "center", width: "100%", fontWeight: "700", boxShadow: "0 10px 20px rgba(14, 165, 233, 0.2)" }}
              >
                Analyze Interview
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "4rem" }}>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: "1rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "8px", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}
        >
          <AlertTriangle size={18} /> {error}
        </motion.div>
      )}

      {/* DASHBOARD HEADER */}
      <header className="dashboard-header">
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Interview Overview</h1>
          <p style={{ margin: 0, color: "var(--text)", fontSize: "0.95rem" }}>Review your latest performance metrics.</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn-primary" style={{ background: "transparent", color: "var(--brand-500)", border: "2px solid var(--brand-500)" }}>
            Start Interview
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Upload Interview
          </button>
        </div>
      </header>

      {/* TIER 1: Timeline, Selection Pie, Stats */}
      <div className="tier-1-grid" style={{ marginBottom: "2rem" }}>
        {/* TIMELINE ISSUES */}
        <div className="glass-card" style={{ height: "400px" }}>
          <InterviewTimeline events={events} activeEvent={activeEvent} onEventClick={handleEventClick} loading={loading} />
        </div>

        {/* SELECTION PROBABILITY */}
        <div className="glass-card" style={{ height: "400px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>Selection Probability</h3>
          <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {feedback ? <SelectionPieChart feedback={feedback} /> : <div className="skeleton-loader" style={{ width: "200px", height: "200px", borderRadius: "50%", background: "rgba(14, 165, 233, 0.1)" }}></div>}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="stat-card glass-card">
            <span className="stat-label">Confidence</span>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span className="stat-value">
                {feedback ? (feedback.scorecard?.confidence ?? feedback.ratings?.confidence ?? 0) + "/10" : "-/10"}
              </span>
              <Zap size={32} color="var(--brand-500)" opacity={0.5} />
            </div>
          </div>
          <div className="stat-card glass-card">
            <span className="stat-label">Technical Depth</span>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span className="stat-value">
                {feedback ? (feedback.scorecard?.technical_depth ?? feedback.ratings?.technical_depth ?? 0) + "/10" : "-/10"}
              </span>
              <FileText size={32} color="var(--accent-purple)" opacity={0.5} />
            </div>
          </div>
          <div className="stat-card glass-card">
            <span className="stat-label">Detected Events</span>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span className="stat-value">{events.length}</span>
              <Users size={32} color="var(--text)" opacity={0.5} />
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: AI Insights Banner */}
      <div className="tier-2-insights" style={{ marginBottom: "2rem" }}>
        <div style={{ padding: "2rem 2.5rem", color: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>AI Analysis & Insights</h2>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>Actionable intelligence to perfect your next response.</p>
        </div>
        <div className="tier-2-inner">
          {transcript ? (
            <LiveTranscript transcript={transcript} currentTime={currentTime} />
          ) : (
            <div className="skeleton-loader" style={{ height: "100px", background: "rgba(14, 165, 233, 0.1)", borderRadius: "8px" }}></div>
          )}
        </div>
      </div>

      {/* TIER 3: Analytics & Video */}
      <div className="tier-3-grid">
        <div className="glass-card">
          <h3 style={{ margin: "0 0 1rem 0" }}>Energy Over Time</h3>
          {timeline && timeline.length > 0 ? (
            <EnergyAnalytics data={timeline} activeEvent={activeEvent} />
          ) : (
            <div className="skeleton-loader" style={{ height: "250px", background: "rgba(14, 165, 233, 0.1)", borderRadius: "8px" }}></div>
          )}
        </div>
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onTimeUpdate={updateTime}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ height: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff" }}>
              <Play size={48} opacity={0.3} />
              <p style={{ marginTop: "1rem", opacity: 0.5, fontSize: "0.9rem" }}>No video loaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
