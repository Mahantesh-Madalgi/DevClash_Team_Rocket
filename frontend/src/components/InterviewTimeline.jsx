import React from "react";
import { AlertCircle, CheckCircle, Zap, ShieldCheck, Languages, Box } from "lucide-react";

export default function InterviewTimeline({ events, activeEvent, onEventClick, loading }) {
  const getIcon = (category) => {
    switch (category) {
      case "technical": return <ShieldCheck size={16} />;
      case "language": return <Languages size={16} />;
      case "confidence": return <Zap size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  const getBadgeClass = (category, type) => {
    if (type === "negative") return "badge-error";
    switch (category) {
      case "technical": return "badge-tech";
      case "language": return "badge-lang";
      case "confidence": return "badge-conf";
      default: return "";
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <AlertCircle size={20} color="var(--brand-500)" />
        Interview Timeline
      </h3>
      
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        display: "flex", 
        flexDirection: "column", 
        gap: "0.75rem",
        paddingRight: "0.5rem"
      }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map(i => (
               <div key={i} className="skeleton-loader" style={{ height: "100px", borderRadius: "12px", background: "rgba(14, 165, 233, 0.1)" }}></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", color: "#64748b" }}>
            <Box size={48} opacity={0.3} style={{ marginBottom: "1rem" }} />
            <p>Upload a video and start analysis to generate the AI timeline.</p>
          </div>
        ) : (
          events.sort((a,b) => a.timestamp - b.timestamp).map((ev, idx) => (
            <div 
              key={idx}
              onClick={() => onEventClick(ev)}
              style={{
                cursor: "pointer",
                padding: "1rem",
                borderRadius: "12px",
                border: `1px solid ${activeEvent === ev ? "var(--accent)" : "var(--border)"}`,
                background: activeEvent === ev ? "var(--accent-bg)" : "#fff",
                transition: "all 0.2s",
                boxShadow: activeEvent === ev ? "0 4px 12px rgba(170,59,255,0.1)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${getBadgeClass(ev.category, ev.type)}`} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {getIcon(ev.category)}
                  {ev.category}
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)" }}>
                  {Math.floor(ev.timestamp / 60)}:{(ev.timestamp % 60).toFixed(0).padStart(2, '0')}
                </span>
              </div>
              
              {ev.type === "negative" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <div style={{ 
                    padding: "0.75rem", 
                    background: "rgba(239, 68, 68, 0.05)", 
                    borderRadius: "8px",
                    borderLeft: "3px solid #ef4444",
                    fontSize: "0.85rem"
                  }}>
                    <strong style={{ color: "#b91c1c", display: "block", marginBottom: "4px" }}>⚠️ Issue Detected</strong>
                    <span style={{ color: "#7f1d1d", lineHeight: "1.4", display: "block" }}>{ev.issue || ev.description}</span>
                  </div>
                  
                  {ev.correction && (
                    <div style={{ 
                      padding: "0.75rem", 
                      background: "rgba(16, 185, 129, 0.05)", 
                      borderRadius: "8px",
                      borderLeft: "3px solid #10b981",
                      fontSize: "0.85rem"
                    }}>
                      <strong style={{ color: "#047857", display: "block", marginBottom: "4px" }}>💡 AI Suggestion</strong>
                      <span style={{ color: "#065f46", fontStyle: "italic", lineHeight: "1.4", display: "block" }}>{ev.correction}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-h)", fontWeight: 500 }}>
                  {ev.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
