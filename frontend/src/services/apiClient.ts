const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "unknown_error", body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface Meeting {
  id: string;
  relationship_id: string;
  title: string;
  occurred_at: string;
  transcript_status: string;
  analysis_status: string;
}

export interface AnalysisResult {
  meeting_id: string;
  items: MemoryCandidate[];
  commitment_resolutions: unknown[];
  had_durable_content: boolean;
}

export interface MemoryCandidate {
  category: string;
  text: string;
  speaker: string;
  owner?: string | null;
  deadline?: string | null;
}

export interface MemoryTimelineItem {
  id: string;
  category: string;
  text: string;
  source_meeting_id: string;
  source_meeting_title: string;
  occurred_at: string;
  status?: "outstanding" | "resolved" | "unknown" | null;
}

export interface CitedClaim {
  text: string;
  source_meeting_id: string | null;
  source_meeting_title: string | null;
  source_date: string | null;
  category: string;
}

export interface CitedCommitment extends CitedClaim {
  owner: string;
  deadline: string | null;
  status: "outstanding" | "resolved" | "unknown";
}

export interface PreparationBrief {
  mode: "stateless" | "memory_enabled";
  relationship_summary: string | null;
  confirmed: {
    what_matters: CitedClaim[];
    previous_concerns: CitedClaim[];
    prior_decisions: CitedClaim[];
    user_commitments: CitedCommitment[];
    participant_commitments: CitedCommitment[];
    unresolved_issues: CitedClaim[];
    recent_changes: CitedClaim[];
  };
  suggested: {
    talking_points: string[];
    follow_up_questions: string[];
  };
  conflicts: {
    topic: string;
    earlier_claim: CitedClaim;
    later_claim: CitedClaim;
    recommendation: string;
  }[];
}

export interface Answer {
  text: string;
  grounded: boolean;
  citations: CitedClaim[];
}

export const api = {
  createMeeting: (body: {
    relationship_name: string;
    title: string;
    occurred_at: string;
  }): Promise<Meeting> => request("/meetings", { method: "POST", body: JSON.stringify(body) }),

  getMeeting: (id: string): Promise<Meeting> => request(`/meetings/${id}`),

  uploadTranscript: (meetingId: string, transcriptText: string) =>
    request<{ meeting_id: string; transcript_status: string }>("/transcripts/upload", {
      method: "POST",
      body: JSON.stringify({ meeting_id: meetingId, transcript_text: transcriptText }),
    }),

  processTranscript: (meetingId: string): Promise<AnalysisResult & { retain_status: string }> =>
    request("/transcripts/process", {
      method: "POST",
      body: JSON.stringify({ meeting_id: meetingId }),
    }),

  previewMemory: (meetingId: string): Promise<AnalysisResult> =>
    request("/memory/preview", { method: "POST", body: JSON.stringify({ meeting_id: meetingId }) }),

  retainMemory: (
    meetingId: string,
  ): Promise<{ retained_item_count: number; resolved_commitment_count: number }> =>
    request("/memory/retain", { method: "POST", body: JSON.stringify({ meeting_id: meetingId }) }),

  getRelationshipMemory: (relationshipId: string): Promise<MemoryTimelineItem[]> =>
    request(`/relationships/${relationshipId}/memory`),

  prepare: (
    meetingId: string,
    mode: "stateless" | "memory_enabled",
    question?: string,
  ): Promise<PreparationBrief | Answer> =>
    request(`/meetings/${meetingId}/prepare`, {
      method: "POST",
      body: JSON.stringify({ mode, question: question ?? null }),
    }),
};
