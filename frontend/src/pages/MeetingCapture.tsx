import { useState, useEffect, useRef } from "react";
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

export const DEMO_MEETING_1 = {
  relationshipName: "Sarah Chen",
  title: "Q3 Product Strategy & Renewal Sync",
  notes: `Speaker: Sarah Chen (VP of Engineering, Acme Corp)
Speaker: Alex (Account Lead)

Alex: Hi Sarah, great catching up. Let's discuss where things stand for the upcoming Q4 renewal.

Sarah: Overall we like the platform, but reporting dashboard latency is unacceptable for our analytics team. We need sub-2-second load times before we renew in November. That is a hard requirement.

Alex: Understood. I will have our engineering team run database indexing tests, and I promise to send you an updated benchmark report by next Wednesday.

Sarah: Perfect. Also, we decided today to completely drop legacy CSV exports. Nobody on our team uses them. But we strictly require Okta SSO integration before December.

Alex: Got it. I'll make sure Okta SSO is scheduled for Q4 delivery.

Sarah: One last thing — please send all future slide decks in PDF format instead of PPTX. Our internal security policy blocks PPTX attachments.`,
};

export const DEMO_MEETING_2 = {
  relationshipName: "Sarah Chen",
  title: "Sprint Review & Security Check",
  notes: `Speaker: Sarah Chen (VP of Engineering, Acme Corp)
Speaker: Alex (Account Lead)

Alex: Hi Sarah! As promised last Wednesday, here is the updated benchmark report showing our query optimization results. Load times are down to 1.4 seconds.

Sarah: Wow, excellent job Alex. That resolves our latency concern completely.

Alex: Glad to hear it! Also wanted to verify our rollout plan for Okta SSO.

Sarah: Great. Our IT team has already set up the SAML endpoints. We decided to begin rollout with the beta group on October 15th.`,
};

export default function MeetingCapture() {
  const [activeTab, setActiveTab] = useState<"live" | "paste">("live");

  // Form states
  const [relationshipName, setRelationshipName] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("https://meet.google.com/qxr-mkop-zxt");
  const [platform, setPlatform] = useState<"google_meet" | "zoom" | "teams">("google_meet");

  // Live simulation states
  const [isBotConnected, setIsBotConnected] = useState(false);
  const [liveTranscriptLines, setLiveTranscriptLines] = useState<string[]>([]);
  const transcriptTimerRef = useRef<any>(null);

  // Result states
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [result, setResult] = useState<(AnalysisResult & { retain_status?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"meeting" | "rel" | null>(null);

  // Save to localStorage so Prepare page can immediately suggest it
  function saveToRecent(mId: string, relName: string, mTitle: string) {
    try {
      const existing = JSON.parse(localStorage.getItem("recent_meetings") || "[]");
      const updated = [
        { id: mId, relationshipName: relName, title: mTitle, date: new Date().toISOString() },
        ...existing.filter((m: any) => m.id !== mId),
      ].slice(0, 10);
      localStorage.setItem("recent_meetings", JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }

  // Load preset demo
  function loadDemo(demo: typeof DEMO_MEETING_1) {
    setRelationshipName(demo.relationshipName);
    setTitle(demo.title);
    setNotes(demo.notes);
  }

  // Live call simulation flow
  function startLiveBot() {
    if (!relationshipName.trim() || !title.trim()) {
      setError("Please provide a Contact Name and Meeting Title before connecting the bot.");
      return;
    }
    setError(null);
    setIsBotConnected(true);
    setLiveTranscriptLines([
      "🔴 [00:01] MeetPrep Bot joined audio stream.",
      `🎙️ [00:03] Sarah Chen: "Hi Alex, thanks for hopping on. Let's discuss where we stand for Q4."`,
    ]);

    // Stream lines into live transcript
    let step = 0;
    const additionalLines = [
      `🎙️ [00:12] Alex: "Great to connect! I want to address the performance feedback you gave last week."`,
      `🎙️ [00:25] Sarah Chen: "Yes, reporting dashboard latency is unacceptable. We need sub-2-second load times before November renewal."`,
      `🎙️ [00:38] Alex: "Understood. I promise to deliver a benchmark performance report by next Wednesday."`,
      `🎙️ [00:52] Sarah Chen: "Also, we decided to drop legacy CSV exports, but Okta SSO is strictly required by Q4."`,
      `🎙️ [01:05] Sarah Chen: "And please send decks in PDF only — our security team strictly blocks PPTX files."`,
    ];

    transcriptTimerRef.current = setInterval(() => {
      if (step < additionalLines.length) {
        setLiveTranscriptLines((prev) => [...prev, additionalLines[step]]);
        step++;
      } else {
        if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
      }
    }, 2500);
  }

  useEffect(() => {
    return () => {
      if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
    };
  }, []);

  async function executeCapture(textToProcess: string) {
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
      saveToRecent(meeting.id, relationshipName, title);

      await api.uploadTranscript(meeting.id, textToProcess);
      const processed = await api.processTranscript(meeting.id);
      setResult(processed);
      setIsBotConnected(false);
      if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    await executeCapture(notes);
  }

  async function handleEndLiveCall() {
    const rawTranscript = liveTranscriptLines
      .filter((l) => l.startsWith("🎙️"))
      .map((l) => l.replace(/🎙️\s*\[\d+:\d+\]\s*/, ""))
      .join("\n\n");
    await executeCapture(rawTranscript || DEMO_MEETING_1.notes);
  }

  function copyId(type: "meeting" | "rel", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Capture & Ingest Meeting</h1>
          <p className="page-subtitle">
            Join a live call with the AI Notetaker Bot or paste notes. Hindsight extracts and commits key context to memory.
          </p>
        </div>

        {/* Demo Data Quick Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Quick Demo:</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px", background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}
            onClick={() => {
              loadDemo(DEMO_MEETING_1);
              setActiveTab("paste");
            }}
          >
            ⚡ Meeting 1 (Initial Sync)
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px", background: "rgba(168,85,247,0.1)", borderColor: "rgba(168,85,247,0.3)", color: "#c084fc" }}
            onClick={() => {
              loadDemo(DEMO_MEETING_2);
              setActiveTab("paste");
            }}
          >
            ⚡ Meeting 2 (Follow-up)
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("live")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "live" ? "rgba(99,102,241,0.15)" : "transparent",
            color: activeTab === "live" ? "#a5b4fc" : "#64748b",
            border: activeTab === "live" ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} className="pulse-dot" />
          Join Live Call (AI Notetaker)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("paste")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: activeTab === "paste" ? "rgba(99,102,241,0.15)" : "transparent",
            color: activeTab === "paste" ? "#a5b4fc" : "#64748b",
            border: activeTab === "paste" ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          Paste Notes & Transcript
        </button>
      </div>

      {/* Main Form & Work Area */}
      <div style={{ display: "grid", gridTemplateColumns: activeTab === "live" && isBotConnected ? "1fr 1fr" : "1fr", gap: 20 }}>
        <div>
          {/* TAB 1: JOIN LIVE CALL */}
          {activeTab === "live" && (
            <div className="card card-glow" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div className="section-heading" style={{ margin: 0 }}>Live Call Ingestion Bot</div>
                <span className="badge badge-purple">Google Meet · Zoom · Teams</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                    Platform
                  </label>
                  <select
                    className="field"
                    value={platform}
                    onChange={(e: any) => setPlatform(e.target.value)}
                    disabled={isBotConnected}
                  >
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom Call</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                    Meeting URL / Conference ID
                  </label>
                  <input
                    className="field"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="e.g. meet.google.com/qxr-mkop-zxt or Zoom ID"
                    disabled={isBotConnected}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                    Contact / Relationship Name
                  </label>
                  <input
                    className="field"
                    value={relationshipName}
                    onChange={(e) => setRelationshipName(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    disabled={isBotConnected}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                    Meeting Title / Topic
                  </label>
                  <input
                    className="field"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Strategy & Renewal Sync"
                    disabled={isBotConnected}
                    required
                  />
                </div>
              </div>

              {!isBotConnected ? (
                <button
                  type="button"
                  onClick={startLiveBot}
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} className="pulse-dot" />
                  Connect Agent Bot & Start Live Transcribing
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleEndLiveCall}
                    disabled={busy}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center", background: "linear-gradient(135deg, #10b981, #059669)" }}
                  >
                    {busy ? (
                      <>
                        <span className="spinner" /> Retaining into Hindsight…
                      </>
                    ) : (
                      <>
                        ⏹️ End Meeting & Retain in Memory
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBotConnected(false);
                      if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
                    }}
                    className="btn-ghost"
                    style={{ color: "#ef4444" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE NOTES / TRANSCRIPT */}
          {activeTab === "paste" && (
            <form onSubmit={handlePasteSubmit}>
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
                      placeholder="e.g. Sarah Chen"
                      required
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
                      placeholder="e.g. Q3 Product Strategy Sync"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-heading">Notes / Transcript</div>
                <p style={{ fontSize: 12, color: "#475569", marginBottom: 10, marginTop: -4 }}>
                  Paste raw bullet points, chat logs, or call transcript. Hindsight will extract decisions, promises, and preferences.
                </p>
                <textarea
                  className="field"
                  style={{ height: 210, marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.6 }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste meeting text here..."
                  required
                />
              </div>

              <button type="submit" disabled={busy} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {busy ? (
                  <>
                    <span className="spinner" /> Analyzing & Storing in Hindsight…
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
          )}
        </div>

        {/* Live Audio / Transcribing Sidebar View */}
        {activeTab === "live" && isBotConnected && (
          <div className="card card-glow fade-up" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} className="pulse-dot" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Live Call Active</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
                <div className="wave-bar" style={{ animationDelay: "0.1s" }} />
                <div className="wave-bar" style={{ animationDelay: "0.3s" }} />
                <div className="wave-bar" style={{ animationDelay: "0.2s" }} />
                <div className="wave-bar" style={{ animationDelay: "0.4s" }} />
                <div className="wave-bar" style={{ animationDelay: "0.15s" }} />
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              Streaming Audio & Transcribing in Real-Time:
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 220,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 10,
                padding: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: "#94a3b8",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {liveTranscriptLines.map((line, idx) => (
                <div key={idx} style={{ color: line.startsWith("🎙️") ? "#cbd5e1" : "#a5b4fc" }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-banner fade-up" style={{ marginTop: 16 }}>{error}</div>}

      {/* Extraction Results */}
      {result && (
        <div className="fade-up" style={{ marginTop: 28 }}>
          <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: result.had_durable_content ? "rgba(52,211,153,0.15)" : "rgba(100,116,139,0.15)",
                border: "1px solid rgba(52,211,153,0.3)",
              }}>
                {result.had_durable_content ? "✅" : "📭"}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                  {result.had_durable_content ? `${result.items.length} Durable Memories Extracted & Retained` : "No durable content found"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Retained into Hindsight bank for <strong>{relationshipName}</strong>
                </div>
              </div>
            </div>
            <span className={`badge ${result.retain_status === "success" ? "badge-green" : "badge-slate"}`}>
              hindsight retain: {result.retain_status ?? "success"}
            </span>
          </div>

          {result.items.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="section-heading">Memories Retained in Hindsight</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                {result.items.map((item, i) => (
                  <div key={i} className="memory-item" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span className={`badge ${CATEGORY_COLORS[item.category] ?? "badge-slate"}`}>
                          {item.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#f1f5f9", lineHeight: 1.5 }}>{item.text}</div>
                    </div>
                    {(item.owner || item.deadline) && (
                      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
                        {item.owner && <span>👤 Owner: {item.owner}</span>}
                        {item.deadline && <span>📅 Deadline: {item.deadline}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IDs for quick copy */}
          <div className="card" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="section-heading" style={{ margin: 0 }}>Reference Identifiers</div>
              <span style={{ fontSize: 12, color: "#a5b4fc" }}>Saved to recent meetings list</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Meeting ID", value: meetingId, type: "meeting" as const },
                { label: "Relationship ID", value: relationshipId, type: "rel" as const },
              ].map(({ label, value, type }) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748b", width: 100, flexShrink: 0 }}>{label}:</div>
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
