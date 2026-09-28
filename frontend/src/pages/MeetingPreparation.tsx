import { useState, useEffect } from "react";
import { api, ApiError, type Answer, type PreparationBrief } from "../services/apiClient";

function isBrief(x: PreparationBrief | Answer): x is PreparationBrief {
  return (x as PreparationBrief).confirmed !== undefined;
}

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ClaimList({ title, claims, icon }: {
  title: string;
  icon: string;
  claims: { text: string; source_meeting_title: string | null; source_date?: string | null }[];
}) {
  if (claims.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {claims.map((c, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 9, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{c.text}</div>
            {c.source_meeting_title && (
              <div style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>
                📌 from <em style={{ color: "#64748b" }}>"{c.source_meeting_title}"</em>
                {c.source_date && <> · {fmt(c.source_date)}</>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MeetingPreparation() {
  const [meetingId, setMeetingId] = useState("");
  const [question, setQuestion] = useState("");
  const [statelessResult, setStatelessResult] = useState<PreparationBrief | Answer | null>(null);
  const [memoryResult, setMemoryResult] = useState<PreparationBrief | Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState<Array<{ id: string; relationshipName: string; title: string }>>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recent_meetings") || "[]");
      setRecentMeetings(stored);
      if (stored.length > 0 && !meetingId) {
        setMeetingId(stored[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handlePrepare() {
    if (!meetingId.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const [stateless, memoryEnabled] = await Promise.all([
        api.prepare(meetingId.trim(), "stateless", question || undefined),
        api.prepare(meetingId.trim(), "memory_enabled", question || undefined),
      ]);
      setStatelessResult(stateless);
      setMemoryResult(memoryEnabled);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) handlePrepare();
  }

  function renderResult(result: PreparationBrief | Answer, kind: "stateless" | "memory") {
    const isMemory = kind === "memory";
    return (
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: isMemory ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 20,
        boxShadow: isMemory ? "0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.08)" : "none",
        flex: 1, minWidth: 0,
      }}>
        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{isMemory ? "🧠" : "🤖"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
              {isMemory ? "Memory-Enabled" : "Stateless"}
            </span>
          </div>
          <span className={`badge ${isMemory ? "badge-purple" : "badge-slate"}`}>
            {isMemory ? "Hindsight active" : "no memory"}
          </span>
        </div>

        {isBrief(result) ? (
          <div>
            {result.relationship_summary && (
              <div style={{
                background: isMemory ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                border: isMemory ? "1px solid rgba(99,102,241,0.2)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 16,
                fontSize: 13, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.6,
              }}>
                {result.relationship_summary}
              </div>
            )}

            <ClaimList title="What Matters" icon="⭐" claims={result.confirmed.what_matters} />
            <ClaimList title="Previous Concerns" icon="⚠️" claims={result.confirmed.previous_concerns} />
            <ClaimList title="Prior Decisions" icon="⚖️" claims={result.confirmed.prior_decisions} />
            <ClaimList title="Your Commitments" icon="🤝" claims={result.confirmed.user_commitments} />
            <ClaimList title="Their Commitments" icon="📋" claims={result.confirmed.participant_commitments} />
            <ClaimList title="Unresolved Issues" icon="❓" claims={result.confirmed.unresolved_issues} />
            <ClaimList title="Recent Changes" icon="🔄" claims={result.confirmed.recent_changes} />

            {result.suggested.talking_points.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Suggested Talking Points
                  </span>
                  <span className="badge badge-slate" style={{ fontSize: 10 }}>AI inference</span>
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {result.suggested.talking_points.map((p, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.conflicts.length > 0 && (
              <div style={{
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 10, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fcd34d", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  ⚡ Conflicting Information
                </div>
                {result.conflicts.map((c, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#fbbf24", marginBottom: 6, lineHeight: 1.5 }}>
                    <strong>{c.topic}:</strong> "{c.earlier_claim.text}" vs. "{c.later_claim.text}"
                    <div style={{ fontSize: 12, color: "#92400e", marginTop: 3 }}>→ {c.recommendation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.7, marginBottom: 12 }}>{result.text}</div>
            <span className={`badge ${result.grounded ? "badge-green" : "badge-slate"}`}>
              {result.grounded ? "✓ grounded in memory" : "not enough information"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Prepare Brief</h1>
        <p className="page-subtitle">
          Generate a side-by-side comparison: stateless AI vs. memory-enabled AI. See exactly what the agent remembers about this contact.
        </p>
      </div>

      {/* Input card */}
      <div className="card card-glow" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-heading" style={{ margin: 0 }}>Brief Request</div>
          {recentMeetings.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Recent Meetings:</span>
              {recentMeetings.slice(0, 3).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMeetingId(m.id)}
                  className="btn-ghost"
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    background: meetingId === m.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: meetingId === m.id ? "#a5b4fc" : "#94a3b8",
                    borderColor: meetingId === m.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  ⚡ {m.relationshipName}: {m.title.slice(0, 20)}…
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Meeting ID
            </label>
            <input
              className="field"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. paste meeting ID from Capture"
              id="prep-meeting-id-input"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Specific Question <span style={{ fontWeight: 400, color: "#334155" }}>(optional)</span>
            </label>
            <input
              className="field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. What did I promise regarding performance?"
              id="prep-question-input"
            />
          </div>
        </div>

        <button
          onClick={handlePrepare}
          disabled={busy || !meetingId.trim()}
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {busy ? (
            <>
              <span className="spinner" />
              Generating briefs with Hindsight…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              Generate Side-by-Side Preparation Brief
            </>
          )}
        </button>
      </div>

      {error && <div className="error-banner fade-up" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Comparison note */}
      {(statelessResult || memoryResult) && (
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span className="badge badge-purple">Side-by-side comparison</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            {statelessResult && renderResult(statelessResult, "stateless")}
            {memoryResult && renderResult(memoryResult, "memory")}
          </div>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#334155" }}>
            The memory-enabled panel (right, purple border) uses Hindsight to recall everything from past meetings with this contact.
          </div>
        </div>
      )}
    </div>
  );
}


