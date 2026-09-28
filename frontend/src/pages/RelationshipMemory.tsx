import { useState } from "react";
import { api, ApiError, type MemoryTimelineItem } from "../services/apiClient";

const CATEGORY_META: Record<string, { label: string; badge: string; icon: string }> = {
  decision:           { label: "Decision",           badge: "badge-purple", icon: "⚖️" },
  commitment:         { label: "Commitment",         badge: "badge-amber",  icon: "🤝" },
  concern:            { label: "Concern",            badge: "badge-red",    icon: "⚠️" },
  requirement:        { label: "Requirement",        badge: "badge-green",  icon: "📌" },
  preference:         { label: "Preference",         badge: "badge-cyan",   icon: "💡" },
  unresolved_question:{ label: "Unresolved",         badge: "badge-red",    icon: "❓" },
  follow_up:          { label: "Follow-up",          badge: "badge-slate",  icon: "📎" },
  context:            { label: "Context",            badge: "badge-slate",  icon: "📝" },
  priority_change:    { label: "Priority Change",    badge: "badge-amber",  icon: "🔄" },
  outcome:            { label: "Outcome",            badge: "badge-green",  icon: "✅" },
};

function fmt(date: string | null | undefined) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RelationshipMemory() {
  const [relationshipId, setRelationshipId] = useState("");
  const [items, setItems] = useState<MemoryTimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!relationshipId.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.getRelationshipMemory(relationshipId.trim());
      setItems(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") load();
  }

  const commitments = items?.filter((i) => i.category === "commitment") ?? [];
  const others = items?.filter((i) => i.category !== "commitment") ?? [];

  const outstanding = commitments.filter((c) => c.status !== "resolved");
  const resolved = commitments.filter((c) => c.status === "resolved");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Relationship Memory Bank</h1>
          <p className="page-subtitle">
            Hindsight long-term memory for every contact — promises made, concerns raised, preferences noted, and decisions taken across calls.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Quick Demo:</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "5px 12px", background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            onClick={() => {
              setRelationshipId("Sarah Chen");
            }}
          >
            ⚡ Sarah Chen
          </button>
        </div>
      </div>

      {/* Lookup */}
      <div className="card card-glow" style={{ marginBottom: 24 }}>
        <div className="section-heading">Query Relationship Memory</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <input
            className="field"
            value={relationshipId}
            onChange={(e) => setRelationshipId(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Enter Contact Name or Relationship ID (e.g. Sarah Chen)…"
            id="relationship-id-input"
          />
          <button onClick={load} disabled={busy || !relationshipId.trim()} className="btn-primary">
            {busy ? <span className="spinner" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            )}
            Recall Memory
          </button>
        </div>
        {error && <div className="error-banner fade-up" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {items && (
        <div className="fade-up">
          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Memories", value: items.length, badge: "badge-purple", icon: "🧠" },
              { label: "Outstanding Commitments", value: outstanding.length, badge: "badge-amber", icon: "⏳" },
              { label: "Resolved Commitments", value: resolved.length, badge: "badge-green", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Promise Tracker */}
          {commitments.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>🤝</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Promise Tracker</span>
                <span className="badge badge-amber" style={{ marginLeft: "auto" }}>{outstanding.length} outstanding</span>
              </div>

              {outstanding.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="section-heading" style={{ marginBottom: 8 }}>Outstanding</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {outstanding.map((item) => (
                      <div key={item.id} className="memory-item" style={{ borderLeft: "3px solid rgba(251,191,36,0.4)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5, flex: 1 }}>{item.text}</div>
                          <span className="badge badge-amber">outstanding</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                          from <em style={{ color: "#64748b" }}>"{item.source_meeting_title}"</em>
                          {item.occurred_at && <> · {fmt(item.occurred_at)}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resolved.length > 0 && (
                <div>
                  <div className="section-heading" style={{ marginBottom: 8 }}>Resolved</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {resolved.map((item) => (
                      <div key={item.id} className="memory-item" style={{ borderLeft: "3px solid rgba(52,211,153,0.4)", opacity: 0.75 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, flex: 1, textDecoration: "line-through" }}>{item.text}</div>
                          <span className="badge badge-green">resolved</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>
                          from "{item.source_meeting_title}"
                          {item.occurred_at && <> · {fmt(item.occurred_at)}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Memory Timeline */}
          {others.length > 0 ? (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>📜</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Memory Timeline</span>
                <span className="badge badge-purple" style={{ marginLeft: "auto" }}>{others.length} items</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {others.map((item) => {
                  const meta = CATEGORY_META[item.category] ?? { label: item.category, badge: "badge-slate", icon: "📝" };
                  return (
                    <div key={item.id} className="memory-item" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 18, marginTop: 1, flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                          <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5, flex: 1 }}>{item.text}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          from <em style={{ color: "#64748b" }}>"{item.source_meeting_title}"</em>
                          {item.occurred_at && <> · {fmt(item.occurred_at)}</>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : commitments.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤔</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>No memories retained yet</div>
              <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>
                Capture a meeting with this contact first.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


