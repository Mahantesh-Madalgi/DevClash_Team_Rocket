import React from "react";
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
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

export default function EnergyAnalytics({ data, activeEvent }) {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map(d => `${d.time}s`),
    datasets: [
      {
        label: "Voice Intensity (Energy Score)",
        data: data.map(d => d.score),
        borderColor: "rgba(170, 59, 255, 1)", // Using var(--accent) #aa3bff
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(170, 59, 255, 0.4)");
          gradient.addColorStop(1, "rgba(170, 59, 255, 0)");
          return gradient;
        },
        fill: true,
        cubicInterpolationMode: "monotone",
        tension: 0.4,
        pointRadius: 0, // Clean line without markers
        pointHoverRadius: 0
      }
    ]
  };

  const annotations = {};

  if (activeEvent) {
    // Find closest timeline X-value for accurate annotation placement
    const closest = data.reduce((prev, curr) => 
      Math.abs(curr.time - activeEvent.timestamp) < Math.abs(prev.time - activeEvent.timestamp) ? curr : prev
    );
    
    const isPositive = activeEvent.type === "positive";

    annotations.activeLine = {
      type: 'line',
      xMin: `${closest.time}s`,
      xMax: `${closest.time}s`,
      borderColor: isPositive ? '#10b981' : '#f43f5e',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        display: true,
        content: activeEvent.category,
        position: 'start',
        backgroundColor: isPositive ? '#10b981' : '#f43f5e',
        color: '#fff',
        font: { size: 10 }
      }
    };
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Acoustic Energy Analytics" },
      annotation: {
        annotations
      }
    },
    scales: {
      y: { min: 0 }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="energy-analytics" style={{ marginTop: "2rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--code-bg)" }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
