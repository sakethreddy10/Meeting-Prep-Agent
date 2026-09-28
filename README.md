# Meeting Continuity Agent

An AI agent that acts as long-term memory for professional relationships across meetings. It
remembers decisions, commitments, concerns, preferences, and unresolved issues from past meetings,
using [Hindsight](https://vectorize.io/hindsight) as its persistent memory layer, and uses that
accumulated memory to prepare you for future meetings with the same person, client, or team.

> Most meeting tools remember what was said. This agent remembers what matters between meetings.

## Project layout

- `backend/` — FastAPI backend: meeting ingestion, a Meeting Analyzer agent, a Preparation Agent,
  and the Hindsight retain/recall adapter.
- `frontend/` — React + TypeScript + Tailwind UI (Upcoming Meetings, Meeting Capture, Relationship
  Memory, Meeting Preparation).
- `specs/001-meeting-continuity-agent/` — the full spec-driven design: `spec.md`, `plan.md`,
  `research.md`, `data-model.md`, `contracts/`, `tasks.md`, and `quickstart.md`.
- `.specify/` — project constitution and the Spec Kit templates/scripts this project was built
  with.

## Getting started

See [`specs/001-meeting-continuity-agent/quickstart.md`](specs/001-meeting-continuity-agent/quickstart.md)
for environment setup, run commands, and a step-by-step validation script that demonstrates the
before/after memory-enabled behavior end to end.

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in HINDSIGHT_API_KEY, GROQ_API_KEY, etc.
uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Status

The MVP core (project setup, foundational infrastructure, and all five user stories — capture and
retain meeting memory, personalized preparation briefs, stateless vs. memory-enabled comparison,
commitment tracking, and ad hoc continuity Q&A) is implemented and tested. See
[`tasks.md`](specs/001-meeting-continuity-agent/tasks.md) for the full task breakdown, including the
optional Google Calendar/Meet and Sarvam STT integrations that are not yet built.
