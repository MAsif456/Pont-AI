"""Pont AI backend application entry point.

Wires the FastAPI app together: CORS for the Next.js frontend and the set of
routers that make up the referral-matching pipeline. Business logic lives in
``services/`` -- this module only assembles the application.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors

from config import get_settings
from routers import (
    agent,
    care_plan,
    cases,
    clinical,
    extract,
    health,
    interactions,
    patients,
    referrals,
    report,
    upload,
)

settings = get_settings()

app = FastAPI(
    title="Pont AI",
    description="Automated social-care referral matching for dementia patients in Cardiff.",
    version="0.1.0",
)

# Allow the local Next.js dev server (and any configured origins) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(patients.router)
app.include_router(extract.router)
app.include_router(agent.router)
app.include_router(report.router)
app.include_router(upload.router)
app.include_router(cases.router)
app.include_router(referrals.router)
app.include_router(clinical.router)
app.include_router(care_plan.router)
app.include_router(interactions.router)


@app.exception_handler(genai_errors.APIError)
def handle_gemini_error(_request: Request, _error: genai_errors.APIError) -> JSONResponse:
    """Map an upstream Gemini failure to a clean 503 with an actionable message.

    Without this, a transient model outage surfaces as an opaque 500. A 503 lets
    the frontend tell the user the AI service is busy and to try again.
    """
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "The AI service is temporarily unavailable (the model may be "
                "busy). Please try again in a moment."
            )
        },
    )
