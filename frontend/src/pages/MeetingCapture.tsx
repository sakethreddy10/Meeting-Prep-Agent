import { useState } from "react";
import { api, ApiError, type AnalysisResult } from "../services/apiClient";

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
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium">Relationship (person/client name)</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={relationshipName}
            onChange={(e) => setRelationshipName(e.target.value)}
            placeholder="Priya (Acme Corp)"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Meeting title</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kickoff call"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Meeting notes / transcript</label>
          <textarea
            className="mt-1 h-40 w-full rounded border border-slate-300 px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste meeting notes or transcript here..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Processing..." : "Submit meeting"}
        </button>
      </form>

      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold">What was remembered</h2>
          {!result.had_durable_content && (
            <p className="mt-2 text-slate-500">
              No durable information was found in this meeting — nothing was retained.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {result.items.map((item, i) => (
              <li key={i} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                <span className="mr-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {item.category}
                </span>
                {item.text}
                {item.owner && <span className="ml-2 text-slate-500">— owner: {item.owner}</span>}
                {item.deadline && <span className="ml-2 text-slate-500">— by: {item.deadline}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            meeting_id: {meetingId} · relationship_id: {relationshipId} · retain:{" "}
            {result.retain_status}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Copy the relationship_id above into the Relationship Memory or Meeting Preparation page
            to see it in context.
          </p>
        </div>
      )}
    </div>
  );
}
