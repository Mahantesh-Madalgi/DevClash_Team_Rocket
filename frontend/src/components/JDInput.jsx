import React from "react";

export default function JDInput({ jobDescription, setJobDescription }) {
  return (
    <div className="jd-input" style={{ marginBottom: "1.5rem" }}>
      <h3>Job Description (Optional Context)</h3>
      <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "-10px" }}>
        Paste the JD here. Our AI will analyze the transcript against these specific rules 
        (e.g., checking if non-English languages are strictly prohibited).
      </p>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="E.g., Senior Software Engineer requiring strict English proficiency. Experience with Python, React. Hindi allowed."
        rows={4}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontFamily: "inherit",
          resize: "vertical"
        }}
      />
    </div>
  );
}
