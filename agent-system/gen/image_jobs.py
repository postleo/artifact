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
# Abstract interface — keeps the image generation backend swappable
# ---------------------------------------------------------------------------

class ImageJobRunner(abc.ABC):

    @abc.abstractmethod
    async def enqueue_options_job(
        self,
        prop_id: str,
        job_id: str,
        options: list[Any],
    ) -> None:
        """Enqueue a Nano Banana 2 generation job for all concept options."""
        ...

    @abc.abstractmethod
    async def enqueue_final_job(
        self,
        prop_id: str,
        job_id: str,
        chosen_option_id: str,
    ) -> None:
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
        self._client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        self._repo = repo
        self._storage = storage_client  # google.cloud.storage.Client

    async def enqueue_options_job(
        self,
        prop_id: str,
        job_id: str,
        options: list[Any],
    ) -> None:
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

        # Notify the orchestrator that the job is done.
        from agent.orchestrator import Orchestrator  # imported lazily to avoid cycles
        # In production, the job would POST back to the API; here we call directly.
        logger.info("Options job %s complete for prop %s", job_id, prop_id)
        return image_refs_by_option  # caller (API callback handler) feeds this to complete_stage1

    async def enqueue_final_job(
        self,
        prop_id: str,
        job_id: str,
        chosen_option_id: str,
    ) -> None:
        """
        Generate the full asset package (turnaround, detail callouts, variants)
        with Nano Banana Pro (full-res, seed-locked for consistency).
        """
        from config import GCS_BUCKET_NAME, NBPRO_MODEL, NBPRO_RESOLUTION

        prop = await self._repo.get(prop_id)
        if prop is None:
            raise ValueError(f"Prop {prop_id!r} not found")

        chosen_opt = next(
            (o for o in prop.options if o.id == chosen_option_id), None
        )
        base_prompt = (
            f"High-fidelity prop design for a film: {prop.brief.what}. "
            f"Style: {chosen_opt.rationale if chosen_opt else ''}"
        )

        seed = abs(hash(prop_id)) % (2 ** 31)  # deterministic seed for consistency

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
            )
            asset_refs["turnaround"].append(ref)

        callout_prompts = ["mechanism detail", "surface markings", "wear and patina"]
        for cp in callout_prompts:
            ref = await self._generate_and_store(
                model_id=NBPRO_MODEL,
                prompt=f"{base_prompt}. Detail callout: {cp}.",
                resolution=NBPRO_RESOLUTION,
                prop_id=prop_id,
                label=f"callout_{cp.replace(' ', '_')}",
                seed=seed,
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
    ) -> str:
        """
        Generate one image with the Gen AI SDK, upload to GCS, and return the GCS object path.
        Images are stored as gcs://<bucket>/<prop_id>/<label>/<uuid>.png.
        The API generates signed URLs from these paths — never returns raw bytes.
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

        # Generate the image via the google-genai unified SDK.
        from google.genai import types as genai_types  # type: ignore

        result = self._client.models.generate_images(
            model=model_id,
            prompt=prompt,
            config=genai_types.GenerateImagesConfig(
                number_of_images=1,
                seed=seed,
            ),
        )

        image_data = result.generated_images[0].image.image_bytes
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
