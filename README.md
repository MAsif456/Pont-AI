# Pont AI

An AI prototype that automates social-care referral coordination for dementia patients in Cardiff. A social worker provides a patient assessment (form, stored record, or PDF), and Pont extracts a structured needs profile, reconciles conflicting source accounts, retrieves relevant Cardiff services, and drafts a ranked referral report for a care coordinator to review.

> **Decision-support only.** Every report is explicitly marked as requiring human review and approval before any referral is actioned.

## Architecture

Pont is designed around a **multi-agent vision**: a Clinical Agent, a Social Care Agent, and a Family Agent, each backed by its own MCP server, feeding an orchestration layer. **This prototype builds one agent fully — the Social Care Agent** — and represents the Clinical and Family domains as lightweight data sources (queried by tools), not autonomous agents. There is no real MCP server, inter-agent messaging, or orchestration layer in this phase; tools are written in an MCP-compatible style (named, typed, documented) but called directly.

```
Intake (form / stored patient / PDF)
        │
        ▼
Social Care Agent  ── bounded agentic loop, max 5 tool calls, logged reasoning trail
   ├─ extract_needs        → structured needs profile + source discrepancies
   ├─ get_clinical_context → Clinical domain record (represents the Clinical Agent)
   ├─ get_family_context   → Family domain record  (represents the Family Agent)
   └─ search_services      → Cardiff service directory via ChromaDB (RAG)
        │
        ▼
Ranked recommendations (confidence-labelled) → Referral report → Human review
```

- **Backend:** FastAPI (Python 3.11+). Gemini via Google AI Studio. ChromaDB (local, persistent). Layers: `routers/` (HTTP), `agents/` (the loop), `tools/` (MCP-style tools), `core/` (LLM, embeddings, vector store, reporting infra), `models/` (Pydantic).
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind.
- **Mock-first:** every LLM and embedding call sits behind an interface with a `PONT_LLM_MODE=mock|live` switch. **Mock mode (the default) runs the whole app and test suite offline with no API key.** Live mode uses real Gemini.

## Prerequisites

- Python 3.11+ and Node.js 18+.
- (Live mode only) A free Google AI Studio API key: https://aistudio.google.com/apikey

## Setup & running

### Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env              # then edit .env (see below)

python scripts/ingest_services.py # build the vector store for the current mode
uvicorn main:app --reload         # serves http://localhost:8000  (/health, /docs)
```

`.env` configuration:
- `PONT_LLM_MODE=mock` — offline, no key needed (default). Great for a guaranteed, instant demo.
- `PONT_LLM_MODE=live` + `GEMINI_API_KEY=AIza...` — real Gemini output (richer, ~20–30s per referral).

Re-run `ingest_services.py` after switching modes (mock and live embeddings differ in size and live in their own `data/chroma/<mode>` directory).

### Frontend
```bash
cd frontend
npm install
npm run dev                        # serves http://localhost:3000
```
Set `NEXT_PUBLIC_API_BASE` if the backend is not on `http://localhost:8000`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness + current LLM mode |
| GET | `/patients` | Synthetic patients for the demo picker |
| POST | `/extract-needs` | Needs profile + discrepancies from input |
| POST | `/run-social-care-agent` | Run the full agentic loop (profile, context, recommendations, reasoning trail) |
| POST | `/generate-report` | Referral report (structured + plain text) from an agent result |
| POST | `/upload-document` | Extract text from a PDF and run needs extraction |
| POST | `/cases` | Persist a completed run as an assessment on a patient's case |
| GET | `/cases` | List all cases (dashboard) |
| GET | `/cases/stats` | Team-level aggregate figures |
| GET | `/cases/{id}` | One case with its full assessment history |
| PATCH | `/cases/{id}/status` | Set the review status of a case's latest assessment |
| POST | `/referrals` | Create a new referral (status `new`) |
| GET | `/referrals` | List all referrals (coordination board) |
| GET | `/referrals/caseload` | Open-referral counts per worker + least-loaded suggestion |
| GET | `/referrals/{id}` | One referral |
| POST | `/referrals/{id}/screen` | Bounded screening call: triage outcome + note cross-check |
| POST | `/referrals/{id}/assign` | Claim a referral for a worker |
| POST | `/referrals/{id}/complete` | Link the agent-generated case (→ `report_ready`) |
| POST | `/referrals/{id}/approve` | Reflect report approval back onto the referral |
| GET | `/clinical-updates/{patient_id}` | A patient's clinical context incl. update history |
| POST | `/clinical-updates/{patient_id}` | Append a (simulated) incoming clinical update |
| POST | `/referrals/{id}/reassess` | Bounded impact check of new clinical updates |

## Case dashboard & history

Every referral run is persisted to a lightweight JSON case store (`backend/data/cases.json`), turning the one-shot tool into something that looks like a real working day:

- **Dashboard (`/cases`)** — every patient assessed, with the top recommendation, confidence, flagged discrepancies, and a review status (pending / approved / changes requested). A stat strip across the top gives team-level figures (cases assessed this month, pending review, discrepancies this week).
- **Patient history (`/cases/{id}`)** — the full assessment history for a patient. Re-assessing the same patient adds a new assessment to their case, and a **"what changed"** panel highlights how the picture has moved over time (stage, risks, discrepancies, top recommendation) — the "dynamic care plan" view.
- **Approval** writes back to the case, so the dashboard reflects real review decisions.

Pre-populate the dashboard for a demo (runs instantly in mock mode):
```bash
cd backend
python scripts/seed_cases.py     # seeds ~6 cases incl. one patient with a follow-up assessment
```

## Referral intake & coordination layer

A coordination layer sits *in front of* the Social Care Agent, modelling how referrals actually arrive on the ward (multiple sources, currently a manual colour-coded spreadsheet). The existing agent is unchanged — it is now triggered by an *accepted* referral rather than a standalone "new assessment".

- **Coordination board (`/board`)** — every incoming referral as a card, grouped into four colour-coded columns by status (Incoming → Active → Ready/Approved → Closed), replacing the spreadsheet. Each card shows source, reason, screening outcome, assigned worker, age, and a note-conflict warning where present.
- **Screening** — a single, bounded LLM call (not agentic, no tools) triages each referral into **information only**, **redirect**, or **proportionate assessment**, and — where an electronic note and a paper/handover note both exist — cross-checks them and flags any factual disagreement (e.g. "electronic says independent mobility; handover says a walking frame is now used"). Info-only/redirect referrals close immediately; proportionate ones proceed.
- **Referral detail (`/referrals/{id}`)** — screen → assign → **Run Social Care Agent** (calls the unchanged `/run-social-care-agent`, links the resulting case back, → `report_ready`) → approve (reflected onto the referral and the case).

Seed the board for a demo (instant in mock mode):
```bash
cd backend
python scripts/seed_referrals.py  # 17 referrals across all sources/outcomes, incl. 4 note conflicts
```

## Reactive reassessment on clinical updates

Clinical updates (a nurse changing medication, an OT noting reduced mobility) are modelled as **externally-sourced** data arriving from the hospital side — not fields the social worker authors. The system can notice such a change and reason about whether it warrants re-assessing discharge readiness.

- **Simulated, not monitored** — there is no webhook or polling. Updates are added via `POST /clinical-updates/{patient_id}` (UI: "Simulate incoming clinical update", limited to clinical roles), appended to the patient's history without overwriting the baseline snapshot.
- **Bounded impact check** — `POST /referrals/{id}/reassess` runs `assess_update_impact` (a single LLM call, no tools, no loop) comparing what changed against the existing assessment. It returns a plain-language summary, whether discharge readiness is affected, and whether the recommendations still hold or should be re-generated. **If there are no new updates, it returns early without re-running the expensive pipeline.**
- **Optional full re-run** — only when the impact check recommends it, a button re-triggers the **unchanged** `/run-social-care-agent` (which now sees the updated clinical context), adding a fresh assessment to the patient's case history.

This appears on the referral detail view as a muted "Clinical updates" timeline (the same external-context styling used for the clinical/family panels), with the impact summary shown in the warning-card style used elsewhere.

## Demo scenarios

Three synthetic patients chosen to show the system's strengths (select them on the intake page's **Demo patient** tab):

1. **Gwendoline Pritchard (PT-001)** — three sources *disagree on personal-care needs* (family says she needs hands-on help; ward record says she is independent). Shows discrepancy detection plus home-care and telecare recommendations.
2. **Beryl Watkins (PT-003)** — severe dementia; family says she *eats well* while the ward record documents *weight loss and malnutrition*. Clinical context shows discharge **pending an OT assessment** and a dietitian referral — context that visibly shapes the agent's framing.
3. **Marian Hughes (PT-007)** — a safeguarding-level crisis: discharged home alone with no care package, no family contact, consent not on file. Shows the crisis path (REACT crisis team) and the human-review flags.

## Testing & quality

```bash
cd backend
python -m pytest --cov            # 44 tests, ~93% coverage (runs in mock mode, no key)
python -m ruff check .            # lint

cd ../frontend
npm run build && npm run lint
```

## Synthetic data

All data in `backend/data/` is fictional and illustrative — no real patient information. It is organised by domain to mirror the target architecture:
- `social_care_patients.json` — 12 patients (5 with deliberately conflicting source notes).
- `services.json` — 18 Cardiff-style services.
- `clinical_context.json` / `family_context.json` — lightweight Clinical/Family domain records.
- `sample_pdfs/` — two generated referral letters for testing PDF upload.

## Scope

This prototype is deliberately scoped to the single Social Care Agent loop. It does **not** include a real MCP server, inter-agent messaging, an orchestration layer, authentication, or persistence beyond the vector store.
