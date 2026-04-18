import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Supabase credentials (using environment variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default function VideoUpload() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // 1. Upload to backend
      const resp = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
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
  
  const EnergyChart = ({ data }) => {
    // Generate warning stamps for >40% drops
    const warnings = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i-1].score;
      const curr = data[i].score;
      if (prev > 0 && curr < prev * 0.6) {
        warnings.push(data[i].time);
      }
    }

    const chartData = {
      labels: data.map(d => `${d.time}s`),
      datasets: [
        {
          label: "Confidence Energy Score",
          data: data.map(d => d.score),
          borderColor: "rgba(138, 43, 226, 1)", 
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, "rgba(138, 43, 226, 0.4)");
            gradient.addColorStop(1, "rgba(138, 43, 226, 0)");
            return gradient;
          },
          fill: true,
          cubicInterpolationMode: "monotone",
          tension: 0.4,
          pointRadius: data.map(d => (d.score >= 0.9 || d.score <= 0.1) ? 5 : 0),
          pointBackgroundColor: "rgba(138, 43, 226, 1)",
          pointHoverRadius: 7
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Biometric Confidence Over Time" }
      },
      scales: {
        y: { min: 0 }
      }
    };

    return (
      <div style={{ marginTop: "2rem" }}>
        <Line data={chartData} options={options} />
        {warnings.length > 0 && (
          <div style={{ marginTop: "1rem", color: "#d9534f", fontSize: "0.9rem" }}>
            <strong>⚠ Warning Markers:</strong> Confidence Dips spotted at {warnings.map(w => `${w}s`).join(", ")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="video-upload" style={{ maxWidth: "600px", margin: "auto", padding: "2rem" }}>
      <h2>Upload Video for Transcription</h2>
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
      {renderTranscript()}
    </div>
  );
}
