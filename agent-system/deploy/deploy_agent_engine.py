"""
deploy/deploy_agent_engine.py — deploy the root ADK agent to Vertex AI Agent Engine
(part of Agent Builder).

Usage:
    export GCP_PROJECT_ID=your-project
    export GCP_REGION=us-central1
    export VERTEX_STAGING_BUCKET=gs://your-staging-bucket
    export GOOGLE_GENAI_USE_VERTEXAI=1
    python -m deploy.deploy_agent_engine

Prints the deployed Agent Engine resource name. Set that value as
AGENT_ENGINE_RESOURCE_NAME on the API service so it routes reasoning to the
deployed agent.

Requires (install alongside requirements.txt for deployment):
    pip install "google-cloud-aiplatform[agent_engines,adk]>=1.95.0"
"""
from __future__ import annotations

import os
import sys


def main() -> int:
    project = os.environ.get("GCP_PROJECT_ID", "")
    location = os.environ.get("GCP_REGION", "us-central1")
    staging_bucket = os.environ.get("VERTEX_STAGING_BUCKET", "")

    if not project or not staging_bucket:
        print(
            "ERROR: set GCP_PROJECT_ID and VERTEX_STAGING_BUCKET (gs://...) before deploying.",
            file=sys.stderr,
        )
        return 2

    # Imported lazily so the rest of the app never requires the (heavy) Vertex SDK.
    import vertexai
    from vertexai import agent_engines
    from vertexai.preview.reasoning_engines import AdkApp

    from agent.adk.root_agent import build_root_agent

    vertexai.init(project=project, location=location, staging_bucket=staging_bucket)

    app = AdkApp(agent=build_root_agent(), enable_tracing=True)

    print(f"Deploying Artifact root agent to Agent Engine in {project}/{location} ...")
    remote_agent = agent_engines.create(
        agent_engine=app,
        display_name="artifact-orchestrator",
        requirements=[
            "google-adk>=1.0.0",
            "google-genai>=2.20.0",
            "pydantic>=2.12.0",
        ],
        # Package the local agent code so the deployed runtime can import it.
        extra_packages=["agent", "config.py"],
    )

    print("\nDeployed Agent Engine resource name:")
    print(remote_agent.resource_name)
    print(
        "\nSet this on the API service:\n"
        f"  export AGENT_ENGINE_RESOURCE_NAME={remote_agent.resource_name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
