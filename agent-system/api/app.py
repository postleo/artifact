"""
api/app.py — FastAPI application factory.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Artifact Agent System",
    description="Standalone service: one hero prop from brief to build-ready asset package.",
    version="1.0.0",
)

# CORS middleware for standalone frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup_event():
    logging.getLogger(__name__).info("Artifact Agent System starting up.")
