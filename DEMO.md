# Demo Script & Data

A copy-paste-ready walkthrough for recording a demo video. Matches the scenario in
[`specs/001-meeting-continuity-agent/quickstart.md`](specs/001-meeting-continuity-agent/quickstart.md),
formatted for screen recording rather than API calls.

**Relationship name to use everywhere below**: `Priya (Acme Corp)`

Run the backend (`uvicorn main:app --reload` in `backend/`) and frontend (`npm run dev` in
`frontend/`) first. Keep a scratch note of each `meeting_id` / `relationship_id` the app shows you
after each step — you'll paste them into later steps.

---

## Meeting 1 — Kickoff call

**Meeting Capture page** → Relationship: `Priya (Acme Corp)` → Title: `Kickoff call`

Paste as notes:

```
Priya: Our budget for this project is strict — we can't go above $50,000.
Priya: We need the deployment live before October, no exceptions.
Priya: Please keep any technical proposals short and concise, not long documents — I don't have time to read 40 pages.
Me: Understood. I'll send over an architecture document by next Friday so you can review it before we lock scope.
```

Expected extraction: a budget requirement, a deployment-deadline requirement, a communication
preference, and a commitment (owner: you, deadline: "next Friday").

Record the `relationship_id` and `meeting_id` shown after submission.

---

## Meeting 2 — Follow-up call

**Meeting Capture page** → same relationship name → Title: `Follow-up call`

```
Priya: Following up on cost — finance is asking if we can trim another 10% off the estimate.
Priya: Also, our security team now requires SOC 2 compliance documentation before go-live.
Me: I can look at the cost again. I'll also put together the SOC 2 documentation and share it next week.
```

Expected extraction: a renewed cost concern, a new compliance requirement, and a second
commitment.

---

## Meeting 3 — Resolution call

**Meeting Capture page** → same relationship name → Title: `Resolution call`

```
Priya: Thanks for sending the architecture document last Friday — that answered our questions.
Priya: The SOC 2 documentation you promised is still outstanding, we need it before we can sign off.
Priya: One more thing — the October deadline has actually moved up. We now need this live by mid-September.
```

Expected: the *first* commitment (architecture document) is detected as resolved
(`resolved_commitment_count: 1` in the response); the *second* commitment (SOC 2 docs) stays
outstanding; the priority-change (September vs. October) becomes a new memory item.

---

## The recording

1. **Meeting Capture** (Meeting 1) — show the "what was remembered" panel populating live. This is
   the hook: "the agent didn't just save a transcript, it extracted structured, categorized memory."
2. **Relationship Memory** — paste the `relationship_id`, click Load. Show the timeline and the
   Promise Tracker with the architecture-document commitment marked outstanding.
3. Submit **Meeting 2** the same way. Reload Relationship Memory — point out the new items
   accumulating for the *same* relationship.
4. **Meeting Preparation** — paste the Meeting 2 `meeting_id`, leave the question blank, click
   Prepare. Two cards render side by side:
   - **Stateless** (left): empty/generic — no historical citations.
   - **Memory-enabled** (right, highlighted ring): budget concern, deployment deadline,
     communication preference, and the outstanding commitment — each citing "Kickoff call."
   This is the core Hindsight before/after moment.
5. Submit **Meeting 3**. Point out `resolved_commitment_count: 1` in the extraction panel.
6. **Relationship Memory** again — the architecture-document commitment now shows **resolved**;
   the SOC 2 commitment is still **outstanding**.
7. **Meeting Preparation** for Meeting 3 with a question typed in: `What did I promise last time?`
   — shows a grounded, cited answer.
8. Ask an out-of-scope question for a *brand-new* relationship name (e.g. `New Client`) — show the
   agent explicitly say it doesn't have enough information, instead of guessing.

Total run time: roughly 3–4 minutes if you move briskly between steps.
