"""
agent/safety_service.py — trademark screening and image moderation.
All safety checks go through this service; results set flags on the prop record.

Production implementation:
  - trademark_screen()        — Gemini (fast tier) text analysis via the platform adapter
  - trademark_screen_images() — Gemini vision model inspects each GCS image for brand/logo resemblance
  - moderate_images()         — Cloud Vision SafeSearch API checks each GCS image for unsafe content

Credentials come from Application Default Credentials (ADC). Requires:
  - GOOGLE_API_KEY env var (for Gemini calls)
  - Cloud Vision API enabled on the GCP project
  - GCS_BUCKET_NAME env var (to resolve object paths into gs:// URIs)
"""
from __future__ import annotations

import abc
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# SafeSearch likelihood levels that we treat as "flagged".
_UNSAFE_LIKELIHOODS = {"LIKELY", "VERY_LIKELY"}

# Trademark risk keywords Gemini vision looks for.
_TM_VISION_PROMPT = (
    "Examine this image for any logos, brand marks, trademarked symbols, or designs that closely "
    "resemble real-world commercial brands or registered trademarks. "
    "Reply with exactly one word: NONE, LOW, or HIGH."
)


class SafetyService(abc.ABC):

    @abc.abstractmethod
    async def trademark_screen(self, description: str) -> str:
        """
        Screen a text description for trademark risk.
        Returns 'none' | 'low' | 'high'.
        """
        ...

    @abc.abstractmethod
    async def trademark_screen_images(self, image_refs: list[str]) -> str:
        """
        Screen generated images for trademark resemblance using Gemini vision.
        Returns 'none' | 'low' | 'high' (worst across all refs).
        """
        ...

    @abc.abstractmethod
    async def moderate_images(self, image_refs: list[str]) -> str:
        """
        Run Cloud Vision SafeSearch content moderation on generated images.
        Returns 'clean' | 'flagged'.
        """
        ...


class GeminiSafetyService(SafetyService):
    """
    Production safety service.
    - Text trademark screen  → Gemini fast tier via platform adapter.
    - Image trademark screen → Gemini vision model (google-genai SDK).
    - Image moderation       → Cloud Vision SafeSearch API.
    """

    def __init__(self, platform_adapter: Any) -> None:
        self._platform = platform_adapter

    # ------------------------------------------------------------------
    # Text trademark screen (Gemini fast tier)
    # ------------------------------------------------------------------

    async def trademark_screen(self, description: str) -> str:
        from config import GEMINI_FAST_MODEL

        response = await self._platform.invoke(
            "trademark_screen",
            {
                "model": GEMINI_FAST_MODEL,
                "description": description,
            },
        )
        risk = response.get("trademark_risk", "none")
        logger.info("Trademark screen (text) result for %r: %s", description[:60], risk)
        return risk if risk in ("none", "low", "high") else "none"

    # ------------------------------------------------------------------
    # Image trademark screen (Gemini vision)
    # ------------------------------------------------------------------

    async def trademark_screen_images(self, image_refs: list[str]) -> str:
        """
        For each GCS object ref, call the Gemini vision model to detect
        trademark-resembling content. Returns the worst risk level seen.
        """
        if not image_refs:
            return "none"

        from google import genai  # type: ignore
        from google.genai import types as genai_types  # type: ignore
        from config import GCS_BUCKET_NAME, GEMINI_FAST_MODEL

        client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        worst = "none"

        for ref in image_refs:
            try:
                gcs_uri = f"gs://{GCS_BUCKET_NAME}/{ref}"
                response = client.models.generate_content(
                    model=GEMINI_FAST_MODEL,
                    contents=[
                        genai_types.Part.from_uri(file_uri=gcs_uri, mime_type="image/png"),
                        _TM_VISION_PROMPT,
                    ],
                )
                answer = response.text.strip().upper()
                if answer == "HIGH":
                    logger.warning("Trademark HIGH risk detected in image %s", ref)
                    return "high"   # short-circuit on worst case
                if answer == "LOW":
                    worst = "low"
                logger.debug("Trademark screen image %s: %s", ref, answer)
            except Exception as exc:
                logger.error("Trademark vision screen failed for %s: %s", ref, exc)
                # Fail safe: treat as low risk rather than silently passing.
                if worst == "none":
                    worst = "low"

        return worst

    # ------------------------------------------------------------------
    # Image moderation (Cloud Vision SafeSearch)
    # ------------------------------------------------------------------

    async def moderate_images(self, image_refs: list[str]) -> str:
        """
        Run Cloud Vision SafeSearch on each GCS image.
        Returns 'flagged' if any image has LIKELY/VERY_LIKELY unsafe content,
        'clean' otherwise.
        """
        if not image_refs:
            return "clean"

        from google.cloud import vision  # type: ignore
        from config import GCS_BUCKET_NAME

        client = vision.ImageAnnotatorClient()

        for ref in image_refs:
            try:
                gcs_uri = f"gs://{GCS_BUCKET_NAME}/{ref}"
                image = vision.Image(source=vision.ImageSource(gcs_image_uri=gcs_uri))
                result = client.safe_search_detection(image=image)
                ss = result.safe_search_annotation

                flagged_categories = {
                    "adult": vision.Likelihood(ss.adult).name,
                    "violence": vision.Likelihood(ss.violence).name,
                    "racy": vision.Likelihood(ss.racy).name,
                }

                for category, likelihood in flagged_categories.items():
                    if likelihood in _UNSAFE_LIKELIHOODS:
                        logger.warning(
                            "Moderation FLAGGED image %s — %s: %s", ref, category, likelihood
                        )
                        return "flagged"

                logger.debug("Moderation clean for image %s", ref)
            except Exception as exc:
                logger.error("Moderation check failed for %s: %s", ref, exc)
                # Fail safe: treat as flagged rather than silently passing.
                return "flagged"

        return "clean"


class StubSafetyService(SafetyService):
    """Always returns clean / no risk. For tests and local dev."""

    async def trademark_screen(self, description: str) -> str:
        return "none"

    async def trademark_screen_images(self, image_refs: list[str]) -> str:
        return "none"

    async def moderate_images(self, image_refs: list[str]) -> str:
        return "clean"
