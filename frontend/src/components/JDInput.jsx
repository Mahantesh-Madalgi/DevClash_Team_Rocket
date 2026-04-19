import React from "react";

export default function JDInput({ jobDescription, setJobDescription }) {
  return (
    <div className="jd-input" style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1rem" }}>
      <div>
        <h3 style={{ margin: 0 }}>Job Description (Optional Context)</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "0.5rem", marginBottom: 0 }}>
          Paste the JD here. Our AI will analyze the transcript against these specific rules 
          (e.g., checking if non-English languages are strictly prohibited).
        </p>
      </div>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="E.g., Senior Software Engineer requiring strict English proficiency. Experience with Python, React. Hindi allowed."
        style={{
          width: "100%",
          flexGrow: 1,
          padding: "1rem",
          borderRadius: "0px",
          border: "1px solid var(--border)",
          fontFamily: "inherit",
          resize: "none",
          marginTop: 0,
          background: "var(--bg)",
          color: "var(--text-h)"
        }}
      />
    </div>
  );
}
