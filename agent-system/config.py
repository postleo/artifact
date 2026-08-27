"""
config.py — single source of truth for all model IDs, budgets, and SLAs.
Swap model names here without touching any other file.

Model IDs confirmed against official Google documentation (2025):
  Gemini text  — https://ai.google.dev/gemini-api/docs/models
  Imagen image — https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
"""
import os

# ---------------------------------------------------------------------------
# Gemini reasoning models (GA, confirmed June 2025)
# ---------------------------------------------------------------------------
# Fast tier: routine steps — parsing, brief writing, spec text, orchestration.
# gemini-2.0-flash is the current stable fast-tier GA model.
GEMINI_FAST_MODEL: str = os.environ.get("GEMINI_FAST_MODEL", "gemini-2.0-flash")

# Pro/strong tier: escalate only for genuinely hard reasoning.
# gemini-2.5-pro is the current stable high-capability GA model.
GEMINI_PRO_MODEL: str = os.environ.get("GEMINI_PRO_MODEL", "gemini-2.5-pro")

# ---------------------------------------------------------------------------
# Image generation models
# "Nano Banana 2"  → fast, cheap concept drafts.
# "Nano Banana Pro" → high-fidelity final hero assets.
# ---------------------------------------------------------------------------
# Nano Banana 2 — fast, low-cost; used for concept-option drafts.
NB2_MODEL: str = os.environ.get("NB2_MODEL", "gemini-3.1-flash-image")

# Nano Banana Pro — high fidelity; used only for the selected prop's final assets.
NBPRO_MODEL: str = os.environ.get("NBPRO_MODEL", "gemini-3-pro-image")

# ---------------------------------------------------------------------------
# Image resolution settings
# ---------------------------------------------------------------------------
NB2_RESOLUTION: str = os.environ.get("NB2_RESOLUTION", "512x512")      # draft quality
NBPRO_RESOLUTION: str = os.environ.get("NBPRO_RESOLUTION", "1024x1024") # final quality

# ---------------------------------------------------------------------------
# Options defaults
# ---------------------------------------------------------------------------
DEFAULT_OPTIONS_COUNT: int = int(os.environ.get("DEFAULT_OPTIONS_COUNT", "4"))
MIN_OPTIONS_COUNT: int = 1
MAX_OPTIONS_COUNT: int = 10

# ---------------------------------------------------------------------------
# Budget guardrail (USD per prop)
# ---------------------------------------------------------------------------
DEFAULT_BUDGET_CEILING_USD: float = float(
    os.environ.get("DEFAULT_BUDGET_CEILING_USD", "5.0")
)

# Approximate cost estimates (USD) — update as pricing changes.
COST_PER_NB2_IMAGE_USD: float = float(os.environ.get("COST_PER_NB2_IMAGE_USD", "0.02"))
COST_PER_NBPRO_IMAGE_USD: float = float(os.environ.get("COST_PER_NBPRO_IMAGE_USD", "0.04"))

# ---------------------------------------------------------------------------
# SLAs (hours)
# ---------------------------------------------------------------------------
# How long a prop may sit at "awaiting_options_review" before a flag is raised.
OPTIONS_REVIEW_SLA_HOURS: int = int(os.environ.get("OPTIONS_REVIEW_SLA_HOURS", "48"))

# How long after selection_confirmed before finalize must start.
SELECTION_SLA_HOURS: int = int(os.environ.get("SELECTION_SLA_HOURS", "24"))

# ---------------------------------------------------------------------------
# Google Cloud project / infrastructure
# ---------------------------------------------------------------------------
GCP_PROJECT_ID: str = os.environ.get("GCP_PROJECT_ID", "")
GCP_REGION: str = os.environ.get("GCP_REGION", "us-central1")
GCS_BUCKET_NAME: str = os.environ.get("GCS_BUCKET_NAME", "artifact-assets")
SIGNED_URL_EXPIRY_SECONDS: int = int(os.environ.get("SIGNED_URL_EXPIRY_SECONDS", "3600"))

# ---------------------------------------------------------------------------
# Gemini Enterprise Agent Platform
# ---------------------------------------------------------------------------
AGENT_PLATFORM_ENDPOINT: str = os.environ.get(
    "AGENT_PLATFORM_ENDPOINT", "https://dialogflow.googleapis.com"
)
