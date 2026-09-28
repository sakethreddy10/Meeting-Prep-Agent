import { useState } from "react";
import { api, ApiError, type Answer, type PreparationBrief } from "../services/apiClient";
import { badge, card, errorBanner, input, label, primaryButton, sectionHeading } from "../styles";

function isBrief(x: PreparationBrief | Answer): x is PreparationBrief {
  return (x as PreparationBrief).confirmed !== undefined;
}

function ClaimList({
  title,
  claims,
}: {
  title: string;
  claims: { text: string; source_meeting_title: string | null }[];
}) {
  if (claims.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <ul className="mt-1 space-y-1">
        {claims.map((c, i) => (
          <li key={i} className="text-sm text-slate-600">
            {c.text}
            {c.source_meeting_title && (
              <span className="ml-2 text-xs text-slate-400">— from "{c.source_meeting_title}"</span>
            )}
          </li>
        ))}
      </ul>
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

  async function handlePrepare() {
    setError(null);
    setBusy(true);
    try {
      const [stateless, memoryEnabled] = await Promise.all([
        api.prepare(meetingId, "stateless", question || undefined),
        api.prepare(meetingId, "memory_enabled", question || undefined),
      ]);
      setStatelessResult(stateless);
      setMemoryResult(memoryEnabled);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function renderResult(result: PreparationBrief | Answer, kind: "stateless" | "memory") {
    const isMemory = kind === "memory";
    return (
      <div
        className={`${card} ${isMemory ? "ring-2 ring-indigo-300/60" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className={sectionHeading}>{isMemory ? "Memory-enabled" : "Stateless"}</h2>
          <span className={badge(isMemory ? "indigo" : "slate")}>
            {isMemory ? "Hindsight memory used" : "no memory used"}
          </span>
        </div>

        {isBrief(result) ? (
          <div className="space-y-3">
            {result.relationship_summary && (
              <p className="rounded-lg bg-gradient-to-r from-indigo-50 to-fuchsia-50 p-3 text-sm italic text-slate-600">
                {result.relationship_summary}
              </p>
            )}
            <ClaimList title="What matters" claims={result.confirmed.what_matters} />
            <ClaimList title="Previous concerns" claims={result.confirmed.previous_concerns} />
            <ClaimList title="Prior decisions" claims={result.confirmed.prior_decisions} />
            <ClaimList title="Your outstanding commitments" claims={result.confirmed.user_commitments} />
            <ClaimList
              title="Their outstanding commitments"
              claims={result.confirmed.participant_commitments}
            />
            <ClaimList title="Unresolved issues" claims={result.confirmed.unresolved_issues} />
            <ClaimList title="Recent changes" claims={result.confirmed.recent_changes} />
            {result.suggested.talking_points.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Suggested talking points{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (agent inference, not history)
                  </span>
                </h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                  {result.suggested.talking_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3">
                <h3 className="text-sm font-semibold text-amber-800">Conflicting information</h3>
                {result.conflicts.map((c, i) => (
                  <p key={i} className="mt-1 text-sm text-amber-700">
                    {c.topic}: "{c.earlier_claim.text}" vs. "{c.later_claim.text}" — {c.recommendation}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-700">{result.text}</p>
            <span className={`mt-2 inline-block ${badge(result.grounded ? "green" : "slate")}`}>
              {result.grounded ? "grounded in memory" : "not enough information"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-indigo-700 to-fuchsia-700 bg-clip-text text-2xl font-bold text-transparent">
          Meeting Preparation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate a stateless response and a Hindsight memory-enabled response side by side, for the
          same request.
        </p>
      </div>

      <div className={`${card} space-y-3`}>
        <div>
          <label className={label}>Meeting ID</label>
          <input
            className={`mt-1 ${input}`}
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="meeting_id (from Meeting Capture)"
          />
        </div>
        <div>
          <label className={label}>
            Optional question{" "}
            <span className="text-xs font-normal text-slate-400">
              (e.g. "What did I promise last time?")
            </span>
          </label>
          <input
            className={`mt-1 ${input}`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Leave blank for a full preparation brief"
          />
        </div>
        <button onClick={handlePrepare} disabled={busy || !meetingId} className={primaryButton}>
          {busy ? "Preparing..." : "Prepare (stateless vs. memory-enabled)"}
        </button>
      </div>

      {error && <p className={errorBanner}>{error}</p>}

      {(statelessResult || memoryResult) && (
        <div className="grid gap-6 md:grid-cols-2">
          {statelessResult && renderResult(statelessResult, "stateless")}
          {memoryResult && renderResult(memoryResult, "memory")}
        </div>
      )}
    </div>
  );
}
