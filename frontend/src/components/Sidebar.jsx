import React from "react";
import { LayoutDashboard, Video, History, Settings, LogOut, CodeSquare } from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", active: true },
    { icon: <Video size={20} />, label: "Upload Interview", active: false },
    { icon: <History size={20} />, label: "Analysis History", active: false },
    { icon: <Settings size={20} />, label: "Settings", active: false },
  ];

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.jpeg" alt="Hirelytics Logo" />
        <h2>Hirelytics</h2>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", fontWeight: 700, marginBottom: "0.5rem", paddingLeft: "0.5rem" }}>
          Main Menu
        </div>
        {menuItems.map((item, idx) => (
          <button 
            key={idx}
            className={`sidebar-btn ${item.active ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Action */}
      <div style={{ borderTop: "1px solid rgba(14, 165, 233, 0.15)", paddingTop: "1.5rem" }}>
        <button className="sidebar-btn danger">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
