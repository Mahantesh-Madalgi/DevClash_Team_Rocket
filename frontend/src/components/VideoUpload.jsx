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

  const fetchLatestInterview = async () => {
    setLoading(true);
    try {
      // 1. Get the latest analysis result
      const { data: results, error: resError } = await supabase
        .from("analysis_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (resError) throw resError;
      if (!results || results.length === 0) return;

      const latest = results[0];
      
      // 2. Get associated events
      const { data: eventData, error: evError } = await supabase
        .from("analysis_events")
        .select("*")
        .eq("interview_id", latest.id);

      if (evError) throw evError;

      // 3. Update state
      setTranscript(latest.transcript_json);
      setFeedback(latest.llm_feedback_json);
      setTimeline(latest.energy_timeline);
      if (eventData) {
        setEvents(eventData);
      }
    } catch (e) {
      console.error("Error fetching latest interview:", e);
      // We don't set a hard error here to avoid blocking a new upload
    } finally {
      setLoading(false);
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
            {feedback ? <SelectionPieChart selectionProbability={feedback.selection_probability} /> : <div className="skeleton-loader" style={{ width: "200px", height: "200px", borderRadius: "50%", background: "rgba(14, 165, 233, 0.1)" }}></div>}
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
      <div className="tier-2-insights" style={{ marginBottom: "2rem", position: "relative" }}>
        <div style={{ padding: "2rem 2.5rem", color: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>AI Analysis & Mentor Insights</h2>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9 }}>Actionable intelligence to perfect your next response.</p>
        </div>
        
        <div className="tier-2-inner" style={{ position: "relative" }}>
          {transcript ? (
            <LiveTranscript 
              transcript={transcript} 
              exchanges={feedback?.exchanges_json || transcript?.exchanges}
              currentTime={currentTime} 
              highlightedTimestamp={activeEvent?.timestamp ?? null}
            />
          ) : (
            <div className="skeleton-loader" style={{ height: "100px", background: "rgba(14, 165, 233, 0.1)", borderRadius: "8px" }}></div>
          )}

          {/* MENTOR CARD OVERLAY */}
          <AnimatePresence>
            {activeEvent && activeEvent.type === "negative" && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  width: "380px",
                  zIndex: 100,
                  pointerEvents: "auto"
                }}
              >
                <div className="glass-card" style={{ 
                  background: "rgba(255, 255, 255, 0.95)", 
                  padding: "1.5rem", 
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                  border: "1.5px solid var(--accent)",
                  backdropFilter: "blur(20px)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ padding: "6px", background: "var(--brand-100)", borderRadius: "8px" }}>
                        <Zap size={18} color="var(--brand-500)" />
                      </div>
                      <h4 style={{ margin: 0, color: "var(--brand-800)", fontSize: "1.1rem" }}>Mentor Insight</h4>
                    </div>
                    <button 
                      onClick={() => setActiveEvent(null)}
                      style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", opacity: 0.5 }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {/* Diagnosis */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "var(--brand-500)", marginBottom: "6px", letterSpacing: "0.05em" }}>1. Diagnosis</label>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--brand-900)", fontWeight: 600, lineHeight: 1.4 }}>
                        {activeEvent.diagnosis || activeEvent.description || "Issue identified in technical delivery."}
                      </p>
                    </div>

                    {/* Gold Standard */}
                    <div style={{ padding: "1rem", background: "var(--accent-bg)", borderRadius: "12px", border: "1px dashed var(--accent)" }}>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "var(--accent-purple)", marginBottom: "6px", letterSpacing: "0.05em" }}>2. The Gold Standard</label>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--accent-purple)", fontStyle: "italic", lineHeight: 1.5, fontWeight: 500 }}>
                        "{activeEvent.gold_standard || activeEvent.correction || "Ideal response not generated."}"
                      </p>
                    </div>

                    {/* Growth Plan */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "#10b981", marginBottom: "6px", letterSpacing: "0.05em" }}>3. Growth Plan</label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <Target size={14} color="#10b981" style={{ marginTop: "3px" }} />
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#065f46", lineHeight: 1.4 }}>
                          {activeEvent.growth_plan || "Focus on elaborating core concepts with more technical confidence."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
