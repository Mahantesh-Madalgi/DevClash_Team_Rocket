import React, { useEffect, useRef } from "react";
import { Mic, User } from "lucide-react";

const SPEAKER_COLORS = [
  { bg: "rgba(170,59,255,0.1)", border: "#aa3bff", label: "#aa3bff", chip: "rgba(170,59,255,0.15)" },
  { bg: "rgba(59,130,246,0.1)", border: "#3b82f6", label: "#3b82f6", chip: "rgba(59,130,246,0.15)" },
  { bg: "rgba(16,185,129,0.1)", border: "#10b981", label: "#10b981", chip: "rgba(16,185,129,0.15)" },
  { bg: "rgba(251,146,60,0.1)",  border: "#f97316", label: "#f97316", chip: "rgba(251,146,60,0.15)"  },
];

function getColor(speakerId) {
  return SPEAKER_COLORS[speakerId % SPEAKER_COLORS.length];
}

function getLabel(speakerId, totalSpeakers) {
  if (totalSpeakers === 2) return speakerId === 0 ? "Interviewer" : "Candidate";
  return `Speaker ${speakerId + 1}`;
}

export default function LiveTranscript({ transcript, currentTime }) {
  const activeRef = useRef(null);
  const containerRef = useRef(null);

  // --- Primary: use Deepgram utterances (pre-grouped by speaker) ---
  const utterances = transcript?.results?.utterances || [];

  // --- Fallback: manually group words by speaker if utterances is empty ---
  const fallbackWords = transcript?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  const segments = [];

  if (utterances.length > 0) {
    for (const u of utterances) {
      segments.push({
        speaker: u.speaker ?? 0,
        start:   u.start,
        end:     u.end,
        text:    u.transcript,
      });
    }
  } else {
    // Manual grouping fallback
    let chunk = [];
    for (let i = 0; i < fallbackWords.length; i++) {
      const w = fallbackWords[i];
      const prevSpeaker = chunk.length > 0 ? chunk[0].speaker : undefined;
      const speakerChanged = prevSpeaker !== undefined && w.speaker !== prevSpeaker;
      const sentenceEnd = chunk.length > 0 && /[.?!]$/.test(chunk[chunk.length - 1].word);
      const tooLong = chunk.length >= 15;

      if ((speakerChanged || sentenceEnd || tooLong) && chunk.length > 0) {
        segments.push({ speaker: chunk[0].speaker ?? 0, start: chunk[0].start, end: chunk[chunk.length - 1].end, text: chunk.map(w => w.word).join(" ") });
        chunk = [];
      }
      chunk.push(w);
    }
    if (chunk.length > 0) {
      segments.push({ speaker: chunk[0].speaker ?? 0, start: chunk[0].start, end: chunk[chunk.length - 1].end, text: chunk.map(w => w.word).join(" ") });
    }
  }

  const uniqueSpeakers = [...new Set(segments.map(s => s.speaker))].sort();
  const totalSpeakers  = uniqueSpeakers.length;

  // Active segment by timestamp
  const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);

  // Auto-scroll to active
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
        <Mic size={18} color="var(--accent)" />
        <h4 style={{ margin: 0, fontWeight: 700, color: "var(--text-h)" }}>Live Transcription Feed</h4>
        {totalSpeakers > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "99px", padding: "2px 10px" }}>
            {totalSpeakers} Speaker{totalSpeakers !== 1 ? "s" : ""} Detected
          </span>
        )}
      </div>

      {/* Speaker legend */}
      {totalSpeakers > 1 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {uniqueSpeakers.map(id => {
            const c = getColor(id);
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "99px", background: c.chip, border: `1px solid ${c.border}`, fontSize: "0.78rem", fontWeight: 700, color: c.label }}>
                {id === 0 ? <Mic size={11} /> : <User size={11} />}
                {getLabel(id, totalSpeakers)}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable feed */}
      <div ref={containerRef} style={{ height: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
        {segments.length === 0 ? (
          <p style={{ color: "#999", fontStyle: "italic", textAlign: "center", marginTop: "2rem" }}>
            No transcript available. Upload an interview video to begin.
          </p>
        ) : (
          segments.map((s, idx) => {
            const c        = getColor(s.speaker);
            const isActive = idx === activeIndex;
            const label    = getLabel(s.speaker, totalSpeakers);
            const ts       = `${Math.floor(s.start / 60)}:${Math.floor(s.start % 60).toString().padStart(2, "0")}`;
            const showChip = idx === 0 || segments[idx - 1].speaker !== s.speaker;

            return (
              <div key={idx} ref={isActive ? activeRef : null} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {/* Speaker label — only when speaker changes */}
                {showChip && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: idx > 0 ? "0.6rem" : 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", fontWeight: 800, color: c.label, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {s.speaker === 0 ? <Mic size={11} /> : <User size={11} />}
                      {label}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text)", opacity: 0.55 }}>{ts}</span>
                    <div style={{ flex: 1, height: "1px", background: c.border, opacity: 0.2 }} />
                  </div>
                )}

                {/* Utterance bubble */}
                <div style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  borderLeft: `3px solid ${isActive ? c.border : "transparent"}`,
                  background: isActive ? c.bg : "transparent",
                  transition: "all 0.25s ease",
                  fontSize: isActive ? "0.97rem" : "0.88rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--text-h)" : "var(--text)",
                  opacity: isActive ? 1 : 0.5,
                  lineHeight: 1.5,
                }}>
                  {s.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
