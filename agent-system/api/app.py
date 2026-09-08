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
    yield
    # Shutdown
    logger.info("Artifact Agent System shutting down.")


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
