"""
config.py — single source of truth for all model IDs, budgets, and SLAs.
Swap model names here without touching any other file.

Model IDs confirmed against official Google documentation:
  Gemini text        — https://ai.google.dev/gemini-api/docs/models
  Nano Banana (image) — https://ai.google.dev/gemini-api/docs/image-generation
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
# Image generation models (Nano Banana — Gemini image models, via the
# google-genai `generate_content` API with response_modalities=["IMAGE"]).
#   "Nano Banana 2"   → Gemini 3.1 Flash Image  (fast, minor/draft jobs)
#   "Nano Banana Pro" → Gemini 3 Pro Image      (high fidelity, main/final jobs)
# NOTE: These are Gemini image models invoked with client.models.generate_content.
#       They are NOT Imagen models and must not be called via generate_images.
# ---------------------------------------------------------------------------
# Nano Banana 2 — fast, low-cost; used for concept-option drafts (minor jobs).
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
# Vertex AI Agent Engine (Agent Builder) — deployment & runtime
# ---------------------------------------------------------------------------
# Full resource name of a deployed Agent Engine, e.g.
#   projects/PROJECT_NUMBER/locations/us-central1/reasoningEngines/1234567890
# When set (and USE_STUBS is false), the service routes reasoning to the deployed
# Agent Engine. When empty, it runs the ADK agents in-process (LocalADKAdapter).
AGENT_ENGINE_RESOURCE_NAME: str = os.environ.get("AGENT_ENGINE_RESOURCE_NAME", "")

# GCS staging bucket used when deploying to Agent Engine (gs://... or bare name).
VERTEX_STAGING_BUCKET: str = os.environ.get("VERTEX_STAGING_BUCKET", "")

# When "true"/"1", the Gen AI SDK and ADK use Vertex AI (ADC) instead of the
# Gemini API key. Required for Agent Engine / production GCP deployments.
GOOGLE_GENAI_USE_VERTEXAI: str = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "")
