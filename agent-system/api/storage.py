"""
api/storage.py — signed URL generation for GCS objects.
The API always returns signed URLs, never raw image bytes.
"""
from __future__ import annotations

import datetime
import os
from typing import Optional

from config import GCS_BUCKET_NAME, SIGNED_URL_EXPIRY_SECONDS


def make_signed_url(object_name: str) -> str:
    """
    Generate a signed GCS URL for the given object path.
    Falls back to a stub URL in stub mode.
    """
    if os.environ.get("USE_STUBS", "false").lower() == "true":
        return f"https://storage.stub/{object_name}"

    from google.cloud import storage  # type: ignore

    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(object_name)
    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(seconds=SIGNED_URL_EXPIRY_SECONDS),
        method="GET",
    )
    return url


def resolve_signed_urls(refs: list[str]) -> list[str]:
    """Convert a list of GCS object paths to signed URLs."""
    return [make_signed_url(r) for r in refs]
