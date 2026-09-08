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

    signing_kwargs: dict = {
        "version": "v4",
        "expiration": datetime.timedelta(seconds=SIGNED_URL_EXPIRY_SECONDS),
        "method": "GET",
    }

    # On Cloud Run / GCE the ambient credentials are token-only (no private key),
    # so V4 signing must go through the IAM signBlob API. Pass the service account
    # email + access token to let google-cloud-storage sign remotely. This requires
    # the runtime service account to hold roles/iam.serviceAccountTokenCreator on
    # itself. Falls back to local key-based signing when a private key is available.
    try:
        from google.auth import default as _default
        from google.auth.transport.requests import Request as _Request

        creds, _ = _default()
        if not getattr(creds, "token", None):
            creds.refresh(_Request())
        sa_email = getattr(creds, "service_account_email", None)
        token = getattr(creds, "token", None)
        if sa_email and sa_email != "default" and token:
            signing_kwargs["service_account_email"] = sa_email
            signing_kwargs["access_token"] = token
    except Exception:
        # Best effort: fall back to default signing behavior.
        pass

    return blob.generate_signed_url(**signing_kwargs)


def resolve_signed_urls(refs: list[str]) -> list[str]:
    """Convert a list of GCS object paths to signed URLs."""
    return [make_signed_url(r) for r in refs]
