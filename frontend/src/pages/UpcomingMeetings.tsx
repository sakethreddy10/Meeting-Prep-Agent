import { useState } from "react";
import { api, ApiError, type Meeting } from "../services/apiClient";
import { badge, card, errorBanner, input, primaryButton, sectionHeading } from "../styles";

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
      <div>
        <h1 className="bg-gradient-to-r from-indigo-700 to-fuchsia-700 bg-clip-text text-2xl font-bold text-transparent">
          Upcoming Meetings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Jump straight into preparation for a meeting you've already captured.
        </p>
      </div>

      <div className={card}>
        <h2 className={sectionHeading}>Find a meeting</h2>
        <div className="mt-3 flex gap-2">
          <input
            className={input}
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="meeting_id (from Meeting Capture)"
          />
          <button onClick={lookup} className={primaryButton}>
            Look up
          </button>
        </div>
        {error && <p className={`mt-3 ${errorBanner}`}>{error}</p>}
        {meeting && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 p-4 text-sm">
            <p className="font-semibold">{meeting.title}</p>
            <p className="mt-1 text-slate-500">{new Date(meeting.occurred_at).toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              <span className={badge(meeting.transcript_status === "available" ? "green" : "amber")}>
                transcript: {meeting.transcript_status}
              </span>
              <span className={badge(meeting.analysis_status === "completed" ? "green" : "amber")}>
                analysis: {meeting.analysis_status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">relationship_id: {meeting.relationship_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
