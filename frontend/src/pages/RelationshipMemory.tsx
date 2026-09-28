import { useState } from "react";
import { api, ApiError, type MemoryTimelineItem } from "../services/apiClient";

const CATEGORY_LABEL: Record<string, string> = {
  decision: "Decision",
  commitment: "Commitment",
  concern: "Concern",
  requirement: "Requirement",
  preference: "Preference",
  unresolved_question: "Unresolved question",
  follow_up: "Follow-up",
  context: "Context",
  priority_change: "Priority change",
  outcome: "Outcome",
};

export default function RelationshipMemory() {
  const [relationshipId, setRelationshipId] = useState("");
  const [items, setItems] = useState<MemoryTimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.getRelationshipMemory(relationshipId);
      setItems(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const commitments = items?.filter((i) => i.category === "commitment") ?? [];
  const others = items?.filter((i) => i.category !== "commitment") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          className="w-full rounded border border-slate-300 px-3 py-2"
          value={relationshipId}
          onChange={(e) => setRelationshipId(e.target.value)}
          placeholder="relationship_id (from Meeting Capture)"
        />
        <button
          onClick={load}
          disabled={busy || !relationshipId}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Load
        </button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

      {items && (
        <>
          {commitments.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold">Promise Tracker</h2>
              <ul className="mt-3 space-y-2">
                {commitments.map((item) => (
                  <li key={item.id} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                    <span
                      className={`mr-2 rounded px-2 py-0.5 text-xs font-medium ${
                        item.status === "resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status ?? "unknown"}
                    </span>
                    {item.text}
                    <p className="mt-1 text-xs text-slate-400">
                      from "{item.source_meeting_title}" on{" "}
                      {item.occurred_at && new Date(item.occurred_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold">Memory Timeline</h2>
            <ul className="mt-3 space-y-2">
              {others.map((item) => (
                <li key={item.id} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                  <span className="mr-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </span>
                  {item.text}
                  <p className="mt-1 text-xs text-slate-400">
                    from "{item.source_meeting_title}" on{" "}
                    {item.occurred_at && new Date(item.occurred_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
              {others.length === 0 && commitments.length === 0 && (
                <p className="text-slate-500">No memory retained yet for this relationship.</p>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
