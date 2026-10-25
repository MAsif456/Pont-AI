## Pont AI

An AI-powered tool that helps patients leave hospital with social care
already in place, built around dementia discharge pathways.

**The problem:** discharge into social care was tracked on manual
spreadsheets, and staff had to visit wards for updates. This was slow,
so patients waited too long for care, and information was spread
across social care, clinical and family sources.

**The solution:** Pont AI brings those three domains into one
coordinated, MCP-style system.
- **Social care:** what care is available and what suits the patient.
- **Clinical:** the patient's condition and how much care they need.
- **Family:** what the family wants, such as living with family, a care
  home or home-based care.

The AI assesses all three, using ward notes and other records, and
produces a recommendation. A social worker reviews and approves it, as
the AI never gives the final approval. It also watches for new notes
and family updates, and reassesses when a change could affect
discharge, such as increased medication, so a patient is not
discharged when it is not yet safe.

**How it developed:** the first version only summarised patient notes,
such as doctor notes, and suggested what care a patient might need. It
worked, but it was a simple tool. On my supervisor's advice to go
further, and after hearing social workers describe how poorly
information is coordinated, I rebuilt it as a coordination system. It
now treats social care, clinical and family information as separate
inputs, takes ward nursing updates into account, and follows an
MCP-style design that brings everything into one place.

Built solo during the 8-week Google DeepMind Research Ready internship,
working with social workers and Caerphilly Council, under the
supervision of an academic at Cardiff Metropolitan University. It is a
working prototype and has not been deployed in a hospital. I
demonstrated it to Caerphilly Council and to university staff,
including the head of computer science.

**Solo project** | **Tech:** Python, FastAPI, Pydantic, Next.js,
TypeScript, Tailwind CSS

## My contribution

I designed and built the whole system, from the backend and AI layer
to the interface.

### AI and agent architecture
- Built the core AI infrastructure: an LLM abstraction layer,
  embeddings and a persistent vector store.
- Built MCP-style agent tools and a Social Care Agent loop that
  generates assessment reports.
- Built Dynamic Care Plan synthesis, which reconciles the output of
  all three domains into one plan.
- Showed the coordination architecture in the app, tagging each
  reasoning step by domain, and added a plain-English coordination
  timeline for non-technical users.

### Referral coordination and reassessment
- Built referral intake and a coordination API, with screening that
  cross-checks referrals against clinical notes.
- Modelled external clinical updates in an append-only store, and built
  reassessment that runs when new clinical updates arrive.
- Extended reassessment so it can be driven by ward and family
  updates, with a family-context endpoint.
- Added service contact details and used them to enrich the
  recommendations.

### Data and documents
- Created synthetic datasets for all three domains, sample referral
  PDFs and a seed script, so the system can be demonstrated without
  real patient data.
- Built extraction of patient details from uploaded assessment
  documents, which fills an editable patient summary.

### Frontend and user experience
- Built the interface in Next.js, TypeScript and Tailwind: intake form,
  upload and agent-progress screen, results and referral report,
  coordination board, case dashboard and patient history.
- Built a staff-interactions panel with per-actor analytics, a caseload
  dashboard with derived workflow status, and a reports page.
- Added role-based portals for ward nurses ("My Patients") and
  families ("My Relative"), with a demo-mode role switcher.
- Applied an NHS-style colour palette and design system across the
  app.

### Testing and documentation
- Wrote a backend test suite covering the coordination, reassessment,
  Dynamic Care Plan, staff-interaction and caseload features.
- Documented the coordination layer, reactive reassessment and
  orchestration layer.

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
| POST | `/care-plan` | Synthesise a Dynamic Care Plan for a case (reconciles all 3 domains) |

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

## Dynamic Care Plan (orchestration layer)

The headline output: `POST /care-plan {case_id}` runs a single bounded synthesis (`synthesise_care_plan`, one LLM call — no agent mesh) that **reconciles all three domains** — the Social Care Agent's assessment and recommendations, the clinical discharge-readiness/tasks/updates, and the family preferences/consent — into **one plan** with a clear discharge recommendation and explicit **cross-domain flags** (e.g. "clinical indicates readiness but no package is in place", "family prefers home care but a safety risk is flagged").

It is **dynamic**: the plan is versioned by assessment count and fetches *fresh* clinical context, so when a nurse posts a clinical update → reassess → re-run, the plan visibly moves from e.g. "Ready for discharge" (v1) to "Discharge delayed pending a medication review" (v2). It renders as the prominent card at the top of the referral detail view.

> **Architecture note:** the full three-agent mesh (autonomous Clinical/Family agents + A2A inter-agent messaging) is deliberately *not* built. Current evidence (Anthropic's multi-agent research; Cognition's "Don't build multi-agents"; the 2026 healthcare-AI ethics literature) shows multi-agent is a poor fit for shared-context reconciliation tasks like this one — it adds ~15× token cost, fragility, and accountability/opacity risks. A single well-orchestrated agent plus a bounded synthesis is the sound choice here.

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
