import { useState } from "react";
import { api, ApiError, type AnalysisResult } from "../services/apiClient";
import { badge, card, errorBanner, input, label, primaryButton, sectionHeading } from "../styles";

export default function MeetingCapture() {
  const [relationshipName, setRelationshipName] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [result, setResult] = useState<(AnalysisResult & { retain_status?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-indigo-700 to-fuchsia-700 bg-clip-text text-2xl font-bold text-transparent">
          Meeting Capture
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste a meeting's notes or transcript. The agent extracts what's durable and retains it in
          Hindsight for this relationship.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Relationship (person/client name)</label>
          <input
            className={`mt-1 ${input}`}
            value={relationshipName}
            onChange={(e) => setRelationshipName(e.target.value)}
            placeholder="Priya (Acme Corp)"
            required
          />
        </div>
        <div>
          <label className={label}>Meeting title</label>
          <input
            className={`mt-1 ${input}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kickoff call"
            required
          />
        </div>
        <div>
          <label className={label}>Meeting notes / transcript</label>
          <textarea
            className={`mt-1 h-40 ${input}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste meeting notes or transcript here..."
            required
          />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Processing..." : "Submit meeting"}
        </button>
      </form>

      {error && <p className={errorBanner}>{error}</p>}

      {result && (
        <div className={card}>
          <h2 className={sectionHeading}>What was remembered</h2>
          {!result.had_durable_content && (
            <p className="mt-2 text-slate-500">
              No durable information was found in this meeting — nothing was retained.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {result.items.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 p-3 text-sm"
              >
                <span className={`mr-2 ${badge("indigo")}`}>{item.category}</span>
                {item.text}
                {item.owner && <span className="ml-2 text-slate-500">— owner: {item.owner}</span>}
                {item.deadline && <span className="ml-2 text-slate-500">— by: {item.deadline}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p>
              meeting_id: <span className="font-mono">{meetingId}</span>
            </p>
            <p>
              relationship_id: <span className="font-mono">{relationshipId}</span>
            </p>
            <p className="mt-1">
              retain status: <span className={badge(result.retain_status === "success" ? "green" : "slate")}>{result.retain_status}</span>
            </p>
            <p className="mt-2">
              Copy the relationship_id above into Relationship Memory or Meeting Preparation to see
              it in context.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
