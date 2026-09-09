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
        For each GCS object ref, download the image bytes and call the Gemini vision model
        to detect trademark-resembling content. Returns the worst risk level seen.
        """
        if not image_refs:
            return "none"

        from google import genai  # type: ignore
        from google.genai import types as genai_types  # type: ignore
        from google.cloud import storage  # type: ignore
        from config import GCS_BUCKET_NAME, GEMINI_FAST_MODEL

        client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", ""))
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(GCS_BUCKET_NAME)
        except Exception:
            bucket = None

        worst = "none"

        for ref in image_refs:
            try:
                if bucket:
                    blob = bucket.blob(ref)
                    image_bytes = blob.download_as_bytes()
                    content_part = genai_types.Part.from_bytes(data=image_bytes, mime_type="image/png")
                else:
                    gcs_uri = f"gs://{GCS_BUCKET_NAME}/{ref}"
                    content_part = genai_types.Part.from_uri(file_uri=gcs_uri, mime_type="image/png")

                response = client.models.generate_content(
                    model=GEMINI_FAST_MODEL,
                    contents=[
                        content_part,
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
    # Image moderation (Cloud Vision SafeSearch with Gemini Fallback)
    # ------------------------------------------------------------------

    async def moderate_images(self, image_refs: list[str]) -> str:
        """
        Run Cloud Vision SafeSearch or Gemini Vision on each image.
        Returns 'flagged' if any image has unsafe content, 'clean' otherwise.
        """
        if not image_refs:
            return "clean"

        from config import GCS_BUCKET_NAME

        vision_client = None
        try:
            from google.cloud import vision  # type: ignore
            vision_client = vision.ImageAnnotatorClient()
        except Exception as auth_exc:
            logger.info("Cloud Vision client not available (%s); will use Gemini vision", auth_exc)

        for ref in image_refs:
            try:
                if vision_client:
                    gcs_uri = f"gs://{GCS_BUCKET_NAME}/{ref}"
                    image = vision.Image(source=vision.ImageSource(gcs_image_uri=gcs_uri))
                    result = vision_client.safe_search_detection(image=image)
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
                else:
                    # Fallback to Gemini Vision check if available
                    from google import genai  # type: ignore
                    from google.cloud import storage  # type: ignore
                    from google.genai import types as genai_types  # type: ignore
                    from config import GEMINI_FAST_MODEL
                    storage_client = storage.Client()
                    bucket = storage_client.bucket(GCS_BUCKET_NAME)
                    blob = bucket.blob(ref)
                    image_bytes = blob.download_as_bytes()
                    ai_client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", ""))
                    resp = ai_client.models.generate_content(
                        model=GEMINI_FAST_MODEL,
                        contents=[
                            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                            "Inspect this film hero prop image. Does it contain sexually explicit or graphic real violence content? Reply with exactly CLEAN or FLAGGED.",
                        ],
                    )
                    if "FLAGGED" in resp.text.strip().upper():
                        return "flagged"

                logger.debug("Moderation clean for image %s", ref)
            except Exception as exc:
                logger.error("Moderation check failed for %s: %s", ref, exc)
                # Fail safe: an unverifiable image is treated as flagged so unsafe
                # content cannot slip through on error. Requires explicit human
                # acknowledgement to export (see /export acknowledge_risk).
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
