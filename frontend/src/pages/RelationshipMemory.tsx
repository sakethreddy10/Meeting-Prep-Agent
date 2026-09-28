import { useState } from "react";
import { api, ApiError, type MemoryTimelineItem } from "../services/apiClient";
import { badge, card, errorBanner, input, primaryButton, sectionHeading } from "../styles";

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
      <div>
        <h1 className="bg-gradient-to-r from-indigo-700 to-fuchsia-700 bg-clip-text text-2xl font-bold text-transparent">
          Relationship Memory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything Hindsight has retained for a relationship, with the Promise Tracker surfaced up
          top.
        </p>
      </div>

      <div className={`${card} flex gap-2`}>
        <input
          className={input}
          value={relationshipId}
          onChange={(e) => setRelationshipId(e.target.value)}
          placeholder="relationship_id (from Meeting Capture)"
        />
        <button onClick={load} disabled={busy || !relationshipId} className={primaryButton}>
          Load
        </button>
      </div>

      {error && <p className={errorBanner}>{error}</p>}

      {items && (
        <>
          {commitments.length > 0 && (
            <div className={card}>
              <h2 className={sectionHeading}>Promise Tracker</h2>
              <ul className="mt-3 space-y-2">
                {commitments.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 p-3 text-sm"
                  >
                    <span className={`mr-2 ${badge(item.status === "resolved" ? "green" : "amber")}`}>
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

          <div className={card}>
            <h2 className={sectionHeading}>Memory Timeline</h2>
            <ul className="mt-3 space-y-2">
              {others.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 p-3 text-sm"
                >
                  <span className={`mr-2 ${badge("indigo")}`}>
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
