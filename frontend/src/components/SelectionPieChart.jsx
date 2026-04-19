import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function SelectionPieChart({ selectionProbability = 0 }) {
  const prob = Math.min(100, Math.max(0, Math.round(selectionProbability)));
  const notProb = 100 - prob;

  const color = prob >= 70 ? "#10b981" : prob >= 45 ? "#f59e0b" : "#ef4444";
  const label = prob >= 70 ? "High Chance" : prob >= 45 ? "Moderate Chance" : "Low Chance";

  const data = [
    { name: "Selection Likelihood", value: prob },
    { name: "Gap", value: notProb },
  ];

  const customLabel = ({ cx, cy }) => (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill={color} style={{ fontSize: "2rem", fontWeight: 900 }}>
        {prob}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#6b6375" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
        {label}
      </text>
    </g>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {prob >= 50 ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#ef4444" />}
        <h4 style={{ margin: 0, fontWeight: 700, color: "var(--text-h)" }}>Selection Probability</h4>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text)", margin: 0 }}>
        Gemini's estimate of candidate selection likelihood for the next round.
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            labelLine={false}
            label={customLabel}
          >
            <Cell fill={color} />
            <Cell fill="#e5e4e7" />
          </Pie>
          <Tooltip
            formatter={(value, name) => name !== "Gap" ? [`${value}%`, "Probability"] : null}
            contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {[
          { label: "High (70–100%)", c: "#10b981", active: prob >= 70 },
          { label: "Moderate (45–69%)", c: "#f59e0b", active: prob >= 45 && prob < 70 },
          { label: "Low (0–44%)", c: "#ef4444", active: prob < 45 },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", fontWeight: item.active ? 700 : 400, opacity: item.active ? 1 : 0.4 }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.c, flexShrink: 0 }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
