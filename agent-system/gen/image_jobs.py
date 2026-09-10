"""
gen/image_jobs.py — image generation job runner.
Triggers Nano Banana 2 (options) and Nano Banana Pro (finals) via the Google Gen AI SDK.
Generated images are written to Cloud Storage; refs are stored in the DB, never returned inline.
"""
from __future__ import annotations

import abc
import asyncio
import logging
import os
import uuid
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Global image-generation rate limiter.
# Image models (esp. Nano Banana Pro) have a low PER-MINUTE quota. To avoid 429s
# we serialize all image calls across the process and space them by a minimum
# interval, so generation happens ~1-2 at a time rather than in a burst.
# Tune with IMAGE_GEN_MIN_INTERVAL_SEC (default 30s ≈ 2 images/min).
# ---------------------------------------------------------------------------
_IMAGE_GEN_MIN_INTERVAL_SEC = float(os.environ.get("IMAGE_GEN_MIN_INTERVAL_SEC", "30"))
_image_rate_lock = asyncio.Lock()
_image_last_call = 0.0


async def _image_rate_limit() -> None:
    """Block until at least the min interval has elapsed since the last image call."""
    global _image_last_call
    async with _image_rate_lock:
        import time
        wait = _IMAGE_GEN_MIN_INTERVAL_SEC - (time.monotonic() - _image_last_call)
        if wait > 0:
            logger.info("Rate-limiting image generation: waiting %.1fs to stay under quota", wait)
            await asyncio.sleep(wait)
        _image_last_call = time.monotonic()


# ---------------------------------------------------------------------------
# Abstract interface — keeps the image generation backend swappable
# ---------------------------------------------------------------------------

class ImageJobRunner(abc.ABC):

    @abc.abstractmethod
    async def enqueue_options_job(
        self,
        prop_id: str,
        job_id: str,
        options: list[Any],
    ) -> dict[str, list[str]]:
        """Enqueue a Nano Banana 2 generation job for all concept options."""
        ...

    @abc.abstractmethod
    async def enqueue_final_job(
        self,
        prop_id: str,
        job_id: str,
        chosen_option_id: str,
    ) -> dict[str, list[str]]:
        """Enqueue a Nano Banana Pro generation job for the selected option's final assets."""
        ...


# ---------------------------------------------------------------------------
# Google Cloud implementation
# ---------------------------------------------------------------------------

class GCSImageJobRunner(ImageJobRunner):
    """
    Generates images via the Google Gen AI SDK and stores them in GCS.
    Long renders run as Cloud Run Jobs so the API stays responsive.
    Env vars: GCP_PROJECT_ID, GCS_BUCKET_NAME, NB2_MODEL, NBPRO_MODEL
    """

    def __init__(self, repo: Any, storage_client: Any) -> None:
        from google import genai  # type: ignore  (google-genai unified SDK)

        # Honor Vertex AI mode (consistent with the rest of the system) when
        # GOOGLE_GENAI_USE_VERTEXAI is set; otherwise use a Gemini API key.
        use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in ("1", "true", "yes")
        if use_vertex:
            self._client = genai.Client(
                vertexai=True,
                project=os.environ.get("GCP_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT"),
                location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
            )
        else:
            self._client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        self._repo = repo
        self._storage = storage_client  # google.cloud.storage.Client

    async def enqueue_options_job(
        self,
        prop_id: str,
        job_id: str,
        options: list[Any],
    ) -> dict[str, list[str]]:
        """
        For each option, generate one draft image with Nano Banana 2 (low-res).
        Writes image to GCS and updates the prop record with refs.
        In production this should run as a Cloud Run Job; here it runs inline
        for simplicity and can be replaced by a job dispatch call.
        """
        from config import GCS_BUCKET_NAME, NB2_MODEL, NB2_RESOLUTION

        image_refs_by_option: dict[str, list[str]] = {}

        for opt in options:
            try:
                ref = await self._generate_and_store(
                    model_id=NB2_MODEL,
                    prompt=f"Concept art for a film hero prop: {opt.rationale}",
                    resolution=NB2_RESOLUTION,
                    prop_id=prop_id,
                    label=f"option_{opt.id}",
                )
                image_refs_by_option[opt.id] = [ref]
            except Exception as exc:
                logger.error("NB2 generation failed for option %s: %s", opt.id, exc)
                image_refs_by_option[opt.id] = []

        # In production, the job would POST back to the API; here we call directly.
        logger.info("Options job %s complete for prop %s", job_id, prop_id)
        return image_refs_by_option  # caller (API callback handler) feeds this to complete_stage1

    async def enqueue_final_job(
        self,
        prop_id: str,
        job_id: str,
        chosen_option_id: str,
    ) -> dict[str, list[str]]:
        """
        Generate the full asset package (turnaround, detail callouts, variants)
        with Nano Banana Pro (full-res, seed-locked for consistency).
        """
        import hashlib
        from config import GCS_BUCKET_NAME, NBPRO_MODEL, NBPRO_RESOLUTION

        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        chosen_opt = next(
            (o for o in prop.options if o.id == chosen_option_id), None
        )

        # Load the SELECTED option's approved concept image and pass it into every
        # final-asset generation call as an image-to-image reference, so the
        # turnarounds / callouts / variants stay faithful to the concept the team
        # actually approved at Gate 1 (rather than being re-imagined from text alone).
        reference_image_bytes: bytes | None = None
        if chosen_opt and getattr(chosen_opt, "image_refs", None):
            try:
                ref_blob = self._storage.bucket(GCS_BUCKET_NAME).blob(chosen_opt.image_refs[0])
                reference_image_bytes = ref_blob.download_as_bytes()
                logger.info(
                    "Loaded selected option %s image as Stage 3 reference (%d bytes)",
                    chosen_option_id, len(reference_image_bytes),
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Could not load selected option image %r as reference "
                    "(continuing text-only): %s",
                    (chosen_opt.image_refs[0] if chosen_opt.image_refs else None), exc,
                )

        style_txt = chosen_opt.rationale if chosen_opt else ""
        base_prompt = (
            f"High-fidelity prop design for a film: {prop.brief.what}. Style: {style_txt}."
        )
        if reference_image_bytes:
            base_prompt += (
                " Use the attached approved concept image as the definitive visual"
                " reference — keep the same silhouette, materials, colour, and key"
                " design details; only change the camera angle / view as described."
            )

        seed = int(hashlib.sha256(prop_id.encode()).hexdigest(), 16) % (2 ** 31)  # deterministic seed for consistency

        asset_refs: dict[str, list[str]] = {
            "turnaround": [],
            "detail_callouts": [],
            "variants": [],
        }

        views = ["front", "side", "back", "three-quarter"]
        for view in views:
            ref = await self._generate_and_store(
                model_id=NBPRO_MODEL,
                prompt=f"{base_prompt}. View: {view} turnaround.",
                resolution=NBPRO_RESOLUTION,
                prop_id=prop_id,
                label=f"turnaround_{view}",
                seed=seed,
                reference_image_bytes=reference_image_bytes,
            )
            asset_refs["turnaround"].append(ref)

        # Full detail-callout + variant set. The global rate limiter spaces every image
        # call to stay under the per-minute quota, so we keep the complete asset package.
        callout_prompts = ["mechanism detail", "surface markings", "wear and patina"]
        for cp in callout_prompts:
            ref = await self._generate_and_store(
                model_id=NBPRO_MODEL,
                prompt=f"{base_prompt}. Detail callout: {cp}.",
                resolution=NBPRO_RESOLUTION,
                prop_id=prop_id,
                label=f"callout_{cp.replace(' ', '_')}",
                seed=seed,
                reference_image_bytes=reference_image_bytes,
            )
            asset_refs["detail_callouts"].append(ref)

        for variant in ["hero", "stunt"]:
            ref = await self._generate_and_store(
                model_id=NBPRO_MODEL,
                prompt=f"{base_prompt}. Variant: {variant} version.",
                resolution=NBPRO_RESOLUTION,
                prop_id=prop_id,
                label=f"variant_{variant}",
                seed=seed,
                reference_image_bytes=reference_image_bytes,
            )
            asset_refs["variants"].append(ref)

        logger.info("Final job %s complete for prop %s", job_id, prop_id)
        return asset_refs  # caller feeds this to complete_stage3

    async def _generate_and_store(
        self,
        model_id: str,
        prompt: str,
        resolution: str,
        prop_id: str,
        label: str,
        seed: int = 0,
        reference_image_bytes: bytes | None = None,
    ) -> str:
        """
        Generate one image with the Gen AI SDK, upload to GCS, and return the GCS object path.
        Images are stored as gcs://<bucket>/<prop_id>/<label>/<uuid>.png.
        The API generates signed URLs from these paths — never returns raw bytes.

        When ``reference_image_bytes`` is provided it is attached alongside the text
        prompt so the model performs image-to-image generation, keeping the output
        faithful to the approved reference concept.
        """
        from config import GCS_BUCKET_NAME

        # Check cache: reuse if a matching object already exists (idempotency).
        cache_key = f"{prop_id}/{label}"
        bucket = self._storage.bucket(GCS_BUCKET_NAME)
        blobs = list(bucket.list_blobs(prefix=cache_key))
        if blobs:
            existing = blobs[0].name
            logger.debug("Cache hit for %s: reusing %s", cache_key, existing)
            return existing

        # Generate the image via the google-genai unified SDK using a Nano Banana
        # (Gemini image) model. Gemini image models generate through generate_content
        # with response_modalities including IMAGE — NOT the Imagen generate_images API.
        from google.genai import types as genai_types  # type: ignore

        # A deterministic seed keeps multi-view final turnarounds visually consistent.
        # SynthID watermarking is always applied to Nano Banana output.
        config = genai_types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            **({"seed": seed} if seed else {}),
        )

        # Build the request contents: text prompt, plus the approved reference image
        # (image-to-image) when one was supplied.
        contents: list[Any] = [prompt]
        if reference_image_bytes:
            contents.append(
                genai_types.Part.from_bytes(data=reference_image_bytes, mime_type="image/png")
            )

        # Generate with retry + backoff on 429 / RESOURCE_EXHAUSTED. Final-asset jobs
        # fire several image calls in sequence, and image models can have a low
        # per-minute quota — so we back off and retry rather than fail the whole stage.
        result = None
        last_err: Exception | None = None
        for attempt in range(6):
            await _image_rate_limit()  # space calls to stay under the per-minute quota
            try:
                result = self._client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as exc:  # noqa: BLE001
                msg = str(exc)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    wait = min(60, 8 * (2 ** attempt))
                    logger.warning(
                        "Image quota 429 for %s (attempt %d/6) — backing off %ss",
                        label, attempt + 1, wait,
                    )
                    last_err = exc
                    await asyncio.sleep(wait)
                    continue
                raise
        if result is None:
            raise RuntimeError(f"Image generation exhausted retries for {label!r}: {last_err}")

        # Extract the first inline image part from the response.
        image_data = None
        for candidate in (result.candidates or []):
            content = getattr(candidate, "content", None)
            for part in (getattr(content, "parts", None) or []):
                inline = getattr(part, "inline_data", None)
                if inline is not None and getattr(inline, "data", None):
                    image_data = inline.data
                    break
            if image_data is not None:
                break
        if image_data is None:
            raise RuntimeError(f"No image returned by model {model_id!r} for label {label!r}")

        object_name = f"{cache_key}/{uuid.uuid4().hex}.png"
        blob = bucket.blob(object_name)
        blob.upload_from_string(image_data, content_type="image/png")

        logger.info("Stored image %s (%d bytes)", object_name, len(image_data))
        return object_name


# ---------------------------------------------------------------------------
# Stub implementation (tests / local dev — no GCP required)
# ---------------------------------------------------------------------------

class StubImageJobRunner(ImageJobRunner):

    def __init__(self) -> None:
        self._results: dict[str, Any] = {}

    async def enqueue_options_job(
        self,
        prop_id: str,
        job_id: str,
        options: list[Any],
    ) -> dict[str, list[str]]:
        refs = {opt.id: [f"stubs/{prop_id}/{opt.id}/draft.png"] for opt in options}
        self._results[job_id] = {"type": "options", "refs": refs}
        return refs

    async def enqueue_final_job(
        self,
        prop_id: str,
        job_id: str,
        chosen_option_id: str,
    ) -> dict[str, list[str]]:
        refs = {
            "turnaround": [f"stubs/{prop_id}/turnaround_{v}.png" for v in ["front", "side", "back", "3q"]],
            "detail_callouts": [f"stubs/{prop_id}/callout_{i}.png" for i in range(2)],
            "variants": [f"stubs/{prop_id}/variant_hero.png", f"stubs/{prop_id}/variant_stunt.png"],
        }
        self._results[job_id] = {"type": "final", "refs": refs}
        return refs
