"""
api/app.py — FastAPI application factory.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Artifact Agent System starting up.")
    # Initialise the shared prop-event producer (no-op unless KAFKA_ENABLED).
    # Import is local so the events package is only touched at app startup.
    from events.producer import get_producer

    producer = get_producer()
    app.state.prop_event_producer = producer
    logger.info("Prop-event backbone enabled=%s", producer.enabled)
    try:
        yield
    finally:
        # Shutdown — flush and release the producer gracefully.
        logger.info("Artifact Agent System shutting down.")
        try:
            producer.close()
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("Error closing prop-event producer: %s", exc, exc_info=True)


app = FastAPI(
    title="Artifact Agent System",
    description="Standalone service: one hero prop from brief to build-ready asset package.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration.
# Origins are configurable via CORS_ALLOW_ORIGINS (comma-separated). Default is the
# local frontend/backend dev origins. Credentials are only enabled when origins are
# NOT the "*" wildcard, since browsers reject wildcard + credentials.
_origins_env = os.environ.get(
    "CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5000"
).strip()
_allow_origins = ["*"] if _origins_env == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]
_allow_credentials = _allow_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
