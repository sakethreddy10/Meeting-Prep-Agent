import { useState } from "react";
import { api, ApiError, type Meeting } from "../services/apiClient";

export default function UpcomingMeetings() {
  const [meetingId, setMeetingId] = useState("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setError(null);
    try {
      const result = await api.getMeeting(meetingId);
      setMeeting(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Meeting not found.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Calendar-sourced upcoming meetings are an optional enhancement (Phase 8, not built in this
          MVP core). For now, look up a meeting you already captured to jump straight to
          preparation.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="meeting_id (from Meeting Capture)"
          />
          <button onClick={lookup} className="rounded bg-indigo-600 px-4 py-2 text-white">
            Look up
          </button>
        </div>
        {error && <p className="mt-3 rounded bg-red-50 p-3 text-red-700">{error}</p>}
        {meeting && (
          <div className="mt-4 rounded border border-slate-100 bg-slate-50 p-4 text-sm">
            <p className="font-semibold">{meeting.title}</p>
            <p className="text-slate-500">
              {new Date(meeting.occurred_at).toLocaleString()} · transcript:{" "}
              {meeting.transcript_status} · analysis: {meeting.analysis_status}
            </p>
            <p className="mt-2 text-xs text-slate-400">relationship_id: {meeting.relationship_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
