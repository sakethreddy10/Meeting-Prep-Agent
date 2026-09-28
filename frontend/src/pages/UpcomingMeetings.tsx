import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type Meeting } from "../services/apiClient";

export default function UpcomingMeetings() {
  const [meetingId, setMeetingId] = useState("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState<Array<{ id: string; relationshipName: string; title: string; date: string }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recent_meetings") || "[]");
      setRecentMeetings(stored);
    } catch {
      // ignore
    }
  }, []);

  async function lookup() {
    if (!meetingId.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.getMeeting(meetingId.trim());
      setMeeting(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Meeting not found.");
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") lookup();
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Meeting Prep Agent</h1>
          <p className="page-subtitle">
            Never forget a promise, decision, or preference. Powered by Hindsight long-term memory across meetings.
          </p>
        </div>
        <button
          onClick={() => navigate("/capture")}
          className="btn-primary"
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} className="pulse-dot" />
          Join / Ingest Meeting
        </button>
      </div>

      {/* Hero stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { icon: "🧠", label: "Hindsight Memory Layer", value: "Every Contact", desc: "Retains durable decisions & preferences" },
          { icon: "🤝", label: "Promise Tracker", value: "Zero Missed", desc: "Monitors commitments and resolution" },
          { icon: "⚡", label: "Grounded Briefings", value: "Source Attributed", desc: "Prepares you with exact past context" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: "center", padding: "20px 16px" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{stat.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent / Scheduled Meetings List */}
      {recentMeetings.length > 0 && (
        <div className="card card-glow" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="section-heading" style={{ margin: 0 }}>Recent Ingested Meetings</div>
            <span style={{ fontSize: 12, color: "#a5b4fc" }}>Ready for preparation</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentMeetings.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge badge-purple">{m.relationshipName}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{m.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    ID: <code className="mono">{m.id}</code>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setMeetingId(m.id);
                      lookup();
                    }}
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                  >
                    View Status
                  </button>
                  <button
                    onClick={() => navigate("/prepare")}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "5px 12px" }}
                  >
                    ⚡ Prepare Brief
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lookup card */}
      <div className="card card-glow glow-animate" style={{ marginBottom: 20 }}>
        <div className="section-heading">Find a Meeting</div>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 16, marginTop: -4 }}>
          Enter a meeting ID from Meeting Capture to jump straight into preparation.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="field"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Paste meeting ID here…"
            id="meeting-id-input"
          />
          <button onClick={lookup} disabled={busy || !meetingId.trim()} className="btn-primary">
            {busy ? <span className="spinner" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            )}
            Look up
          </button>
        </div>

        {error && <div className="error-banner fade-up" style={{ marginTop: 12 }}>{error}</div>}

        {meeting && (
          <div className="fade-up" style={{
            marginTop: 16,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 4 }}>{meeting.title}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {new Date(meeting.occurred_at).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric"
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className={`badge ${meeting.transcript_status === "available" ? "badge-green" : "badge-amber"}`}>
                  transcript: {meeting.transcript_status}
                </span>
                <span className={`badge ${meeting.analysis_status === "completed" ? "badge-green" : "badge-amber"}`}>
                  analysis: {meeting.analysis_status}
                </span>
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#334155" }}>relationship_id:</span>
              <code className="mono" style={{ color: "#a5b4fc", background: "rgba(99,102,241,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                {meeting.relationship_id}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card">
        <div className="section-heading">How It Works</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {[
            { step: "01", title: "Capture a meeting", desc: "Paste notes or transcripts — the agent extracts decisions, promises, concerns, and preferences.", icon: "✍️" },
            { step: "02", title: "Memory is retained", desc: "Durable insights are stored in Hindsight, linked to the relationship and source meeting.", icon: "🔗" },
            { step: "03", title: "Get a memory-enabled brief", desc: "Before your next meeting, receive a full brief citing every past interaction — with source attribution.", icon: "📄" },
          ].map((item) => (
            <div key={item.step} className="memory-item" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 20, marginTop: 2 }}>{item.icon}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="badge badge-purple">{item.step}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


