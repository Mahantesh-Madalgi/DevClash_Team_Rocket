import React, { useEffect, useRef, useMemo } from "react";
import { Mic, User } from "lucide-react";

export default function LiveTranscript({ transcript, exchanges, currentTime, highlightedTimestamp }) {
  const containerRef = useRef(null);
  const blockRefs = useRef({});

  // Use pre-grouped exchanges from backend if available, fallback to basic segments
  const displayBlocks = useMemo(() => {
    if (exchanges && exchanges.length > 0) {
      return exchanges.map((ex, i) => ({
        id: `exch-${i}`,
        timestamp: ex.timestamp,
        interviewer: ex.interviewer,
        candidate: ex.candidate
      }));
    }
    
    // Fallback logic using raw utterances if exchanges aren't pre-processed
    const utterances = transcript?.results?.utterances || [];
    return utterances.map((u, i) => ({
      id: `u-${i}`,
      timestamp: u.start,
      speaker: u.speaker,
      text: u.transcript
    }));
  }, [exchanges, transcript]);

  // Handle Scroll-to-Event (when highlightedTimestamp changes)
  useEffect(() => {
    if (highlightedTimestamp !== null) {
      // Find the block closest to the timestamp
      const targetBlock = displayBlocks.reduce((prev, curr) => {
        return (Math.abs(curr.timestamp - highlightedTimestamp) < Math.abs(prev.timestamp - highlightedTimestamp) ? curr : prev);
      });

      if (targetBlock && blockRefs.current[targetBlock.id]) {
        blockRefs.current[targetBlock.id].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightedTimestamp, displayBlocks]);

  // Handle Auto-scroll for Live Playback
  useEffect(() => {
    const activeBlock = displayBlocks.find(b => {
      // For exchanges, we approximate the end as the start of the next block or +10s
      const nextBlock = displayBlocks[displayBlocks.indexOf(b) + 1];
      const end = nextBlock ? nextBlock.timestamp : b.timestamp + 10;
      return currentTime >= b.timestamp && currentTime <= end;
    });

    if (activeBlock && blockRefs.current[activeBlock.id]) {
      blockRefs.current[activeBlock.id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentTime, displayBlocks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Mic size={18} color="var(--brand-500)" />
        <h4 style={{ margin: 0, fontWeight: 700, color: "var(--text-h)" }}>Mentorship Exchange Feed</h4>
      </div>

      <div ref={containerRef} style={{ height: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem", paddingRight: "10px" }}>
        {displayBlocks.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "4rem", fontStyle: "italic" }}>
            Upload an interview to see the mentor-guided transcript.
          </p>
        ) : (
          displayBlocks.map((block) => (
            <div 
              key={block.id} 
              ref={el => blockRefs.current[block.id] = el}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "16px",
                background: Math.abs(block.timestamp - currentTime) < 3 ? "rgba(14, 165, 233, 0.05)" : "transparent",
                border: Math.abs(block.timestamp - highlightedTimestamp) < 0.1 ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                transition: "all 0.3s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text)", opacity: 0.4 }}>
                  T+ {Math.floor(block.timestamp / 60)}:{(block.timestamp % 60).toFixed(0).padStart(2, '0')}
                </span>
              </div>

              {/* Interviewer Question */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--brand-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Mic size={12} color="var(--brand-500)" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "var(--brand-500)", marginBottom: "2px" }}>Interviewer</label>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-h)", lineHeight: 1.5 }}>
                    {block.interviewer || block.text}
                  </p>
                </div>
              </div>

              {/* Candidate Answer (Only if it's an exchange block) */}
              {block.candidate && (
                <div style={{ display: "flex", gap: "10px", paddingLeft: "34px", borderLeft: "2px solid var(--slate-100)" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={12} color="var(--accent)" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", color: "var(--accent)", marginBottom: "2px" }}>Candidate</label>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>
                      {block.candidate}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
