import { useState } from "react";
import { api, ApiError, type AnalysisResult } from "../services/apiClient";

const CATEGORY_COLORS: Record<string, string> = {
  commitment: "badge-amber",
  decision: "badge-purple",
  concern: "badge-red",
  preference: "badge-cyan",
  requirement: "badge-green",
  follow_up: "badge-slate",
  context: "badge-slate",
  unresolved_question: "badge-red",
  priority_change: "badge-amber",
  outcome: "badge-green",
};

export default function MeetingCapture() {
  const [relationshipName, setRelationshipName] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [result, setResult] = useState<(AnalysisResult & { retain_status?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"meeting" | "rel" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const meeting = await api.createMeeting({
        relationship_name: relationshipName,
        title,
        occurred_at: new Date().toISOString(),
      });
      setMeetingId(meeting.id);
      setRelationshipId(meeting.relationship_id);
      await api.uploadTranscript(meeting.id, notes);
      const processed = await api.processTranscript(meeting.id);
      setResult(processed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function copyId(type: "meeting" | "rel", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Capture Meeting</h1>
        <p className="page-subtitle">
          Paste notes or a transcript. The agent extracts what matters and commits it to memory for this relationship.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-heading">Meeting Details</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                Contact / Relationship
              </label>
              <input
                className="field"
                value={relationshipName}
                onChange={(e) => setRelationshipName(e.target.value)}
                placeholder="e.g. Priya (Acme Corp)"
                required
                id="relationship-name-input"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                Meeting Title
              </label>
              <input
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Kickoff Call"
                required
                id="meeting-title-input"
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-heading">Notes / Transcript</div>
          <p style={{ fontSize: 12, color: "#334155", marginBottom: 10, marginTop: -4 }}>
            Paste raw notes, bullet points, or a full transcript. The AI will extract decisions, commitments, concerns, and preferences.
          </p>
          <textarea
            className="field"
            style={{ height: 180, marginTop: 4 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting with Acme Corp, 2026-01-10. Client (Priya) says the budget is strict — under $50k. Wants deployment before October. Prefers short, concise technical proposals. I promised to send an architecture document by next Friday…"
            required
            id="meeting-notes-input"
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          {busy ? (
            <>
              <span className="spinner" />
              Analyzing & Storing Memory…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Submit & Capture Memory
            </>
          )}
        </button>
      </form>

      {error && <div className="error-banner fade-up" style={{ marginTop: 16 }}>{error}</div>}

      {/* Results */}
      {result && (
        <div className="fade-up" style={{ marginTop: 24 }}>
          {/* Status bar */}
          <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: result.had_durable_content ? "rgba(52,211,153,0.15)" : "rgba(100,116,139,0.15)",
              }}>
                {result.had_durable_content ? "✅" : "📭"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                  {result.had_durable_content ? `${result.items.length} memories retained` : "No durable content found"}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {result.had_durable_content ? "Stored in Hindsight for this relationship" : "Nothing was retained from this meeting"}
                </div>
              </div>
            </div>
            <span className={`badge ${result.retain_status === "success" ? "badge-green" : "badge-slate"}`}>
              retain: {result.retain_status ?? "—"}
            </span>
          </div>

          {/* Extracted items */}
          {result.items.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-heading">What Was Remembered</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {result.items.map((item, i) => (
                  <div key={i} className="memory-item">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span className={`badge ${CATEGORY_COLORS[item.category] ?? "badge-slate"}`} style={{ marginTop: 1 }}>
                        {item.category.replace(/_/g, " ")}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{item.text}</div>
                        {(item.owner || item.deadline) && (
                          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "#475569" }}>
                            {item.owner && <span>👤 {item.owner}</span>}
                            {item.deadline && <span>📅 by {item.deadline}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IDs */}
          <div className="card" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
            <div className="section-heading">Copy IDs for other pages</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {[
                { label: "Meeting ID", value: meetingId, type: "meeting" as const },
                { label: "Relationship ID", value: relationshipId, type: "rel" as const },
              ].map(({ label, value, type }) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#475569", width: 110, flexShrink: 0 }}>{label}</div>
                  <code className="mono" style={{
                    flex: 1, color: "#a5b4fc",
                    background: "rgba(99,102,241,0.1)", padding: "5px 10px",
                    borderRadius: 7, border: "1px solid rgba(99,102,241,0.2)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {value}
                  </code>
                  <button
                    onClick={() => copyId(type, value!)}
                    className="btn-ghost"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                  >
                    {copied === type ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


