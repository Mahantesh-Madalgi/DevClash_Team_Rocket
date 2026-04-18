import React from "react";

export default function InterviewTimeline({ events, activeEvent, onEventClick }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="interview-timeline" style={{
      marginTop: "1rem", 
      padding: "1rem", 
      background: "var(--bg)", 
      border: "1px solid var(--border)", 
      borderRadius: "8px",
      maxHeight: "400px",
      overflowY: "auto"
    }}>
      <h3 style={{ margin: "0 0 1rem 0" }}>Event Timeline</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {events.map((ev, i) => {
          const isPositive = ev.type === "positive";
          const isActive = activeEvent && activeEvent.timestamp === ev.timestamp && activeEvent.description === ev.description;
          const statusColor = isPositive ? "#10b981" : "#e11d48"; // Emerald vs Rose
          
          return (
            <div 
              key={`event-${i}`}
              onClick={() => onEventClick(ev)}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "12px",
                borderLeft: `4px solid ${statusColor}`,
                backgroundColor: isActive ? "var(--code-bg)" : "transparent",
                cursor: "pointer",
                borderRadius: "0 6px 6px 0",
                transition: "background 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{ev.category.toUpperCase()}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{ev.timestamp}s</span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>{ev.description}</p>
              
              {isActive && !isPositive && ev.correction && (
                <div style={{ 
                  marginTop: "8px", 
                  padding: "8px", 
                  backgroundColor: "rgba(225, 29, 72, 0.1)", 
                  border: `1px solid rgba(225, 29, 72, 0.3)`,
                  borderRadius: "4px",
                  fontSize: "0.85rem" 
                }}>
                  <strong>AI Correction:</strong> {ev.correction}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
