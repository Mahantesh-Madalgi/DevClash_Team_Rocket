import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase credentials (using environment variables)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default function VideoUpload() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState(null);
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
        .select("transcript_json")
        .eq("video_name", videoName)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (supErr) {
        throw new Error(supErr.message);
      }
      
      if (rows && rows.length > 0) {
        setTranscript(rows[0].transcript_json);
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
