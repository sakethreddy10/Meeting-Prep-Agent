import { NavLink, Route, HashRouter, Routes } from "react-router-dom";
import UpcomingMeetings from "./pages/UpcomingMeetings";
import MeetingCapture from "./pages/MeetingCapture";
import RelationshipMemory from "./pages/RelationshipMemory";
import MeetingPreparation from "./pages/MeetingPreparation";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    desc: "Upcoming meetings",
  },
  {
    to: "/capture",
    label: "Capture Meeting",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>
    ),
    desc: "Log notes & transcripts",
  },
  {
    to: "/memory",
    label: "Relationship Memory",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    desc: "What was promised & said",
  },
  {
    to: "/prepare",
    label: "Prepare Brief",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    desc: "AI-powered prep with memory",
  },
];

export default function App() {
  return (
    <HashRouter>
      <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
        {/* Ambient orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Sidebar */}
        <aside style={{
          width: 260,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(8,12,20,0.9)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          padding: "28px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 10,
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36, paddingLeft: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "white",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              flexShrink: 0,
            }}>M</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", lineHeight: 1.2 }}>Meeting Prep Agent</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>AI Continuity & Memory</div>
            </div>
          </div>

          {/* Nav label */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#334155", textTransform: "uppercase", paddingLeft: 8, marginBottom: 8 }}>
            Navigation
          </div>

          {/* Nav links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all 0.18s",
                  background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  color: isActive ? "#a5b4fc" : "#64748b",
                })}
                className={({ isActive }) => isActive ? "nav-active" : "nav-item"}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 1 }}>{item.desc}</div>
                </div>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 4 }}>💡 Pro tip</div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                Capture a meeting first, then use Prepare Brief to see the memory difference.
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "36px 40px", position: "relative", zIndex: 1, overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<UpcomingMeetings />} />
            <Route path="/capture" element={<MeetingCapture />} />
            <Route path="/memory" element={<RelationshipMemory />} />
            <Route path="/prepare" element={<MeetingPreparation />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
