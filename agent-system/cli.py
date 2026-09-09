#!/usr/bin/env python3
"""
cli.py — standalone command-line interface for the Artifact Agent System.
Allows executing the entire prop design pipeline interactively or via options,
running completely independent of any web server or database stubs.
"""
from __future__ import annotations

import asyncio
import os
import sys

# Ensure we can import from local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent.asset_finisher import AssetFinisherAgent
from agent.options_generator import OptionsGeneratorAgent
from agent.orchestrator import Orchestrator
from agent.platform_adapter import StubAgentPlatformAdapter, GeminiAgentPlatformAdapter
from agent.safety_service import StubSafetyService, GeminiSafetyService
from agent.selection_recorder import SelectionRecorderAgent
from gen.cost_service import CostService
from gen.image_jobs import StubImageJobRunner, GCSImageJobRunner
from store.models import Brief, PropRecord, PropStatus
from store.repository import InMemoryPropRepository


def print_banner():
    print("=" * 80)
    print("                🎨  ARTIFACT HERO PROP DESIGN CLI SYSTEM  🎨")
    print("      Take a single hero prop from brief to a build-ready asset package")
    print("=" * 80)


async def run_interactive_cli():
    print_banner()

    # Determine Stub mode based on environment variables
    use_stubs = os.environ.get("USE_STUBS", "true").lower() == "true"
    print(f"[*] Running with USE_STUBS = {use_stubs}")
    if use_stubs:
        print("[!] Using local stubs (In-memory DB, canned agent rationales, mocked image outputs).")
    else:
        print("[*] Running with production adapters (Gemini reasoning + Nano Banana image models).")
    print("-" * 80)

    # 1. Initialize services
    repo = InMemoryPropRepository()
    
    if use_stubs:
        adapter = StubAgentPlatformAdapter()
        safety = StubSafetyService()
        image_runner = StubImageJobRunner()
    else:
        # Check required production credentials
        if not os.environ.get("GOOGLE_API_KEY") and not os.environ.get("API_BEARER_TOKEN"):
            print("[!] Warning: GOOGLE_API_KEY or API_BEARER_TOKEN is not set. Google GenAI calls may fail.")
        adapter = GeminiAgentPlatformAdapter()
        safety = GeminiSafetyService(adapter)
        try:
            from google.cloud import storage
            storage_client = storage.Client()
            image_runner = GCSImageJobRunner(repo, storage_client)
        except Exception:
            print("[!] GCP Storage client not available. Falling back to Stub Image Runner.")
            image_runner = StubImageJobRunner()

    cost = CostService(repo)
    options_agent = OptionsGeneratorAgent(adapter, None)
    selection_agent = SelectionRecorderAgent(adapter)
    asset_agent = AssetFinisherAgent(adapter, None)

    orch = Orchestrator(
        repo=repo,
        options_agent=options_agent,
        selection_agent=selection_agent,
        asset_agent=asset_agent,
        image_job_runner=image_runner,
        cost_service=cost,
        safety_service=safety,
    )

    # 2. Gather Brief Interactively
    print("\n[Step 1] Enter the Prop Brief Details:")
    what = input("👉 What is the hero prop? (e.g. 'Golden key'): ").strip()
    if not what:
        what = "Golden key"
        print(f"Using default: '{what}'")

    on_screen = input("👉 On-screen moments (comma-separated, e.g. 'studied closely, unlocked chest'): ").strip()
    on_screen_list = [m.strip() for m in on_screen.split(",") if m.strip()] if on_screen else ["close-up lock insert"]

    era = input("👉 Era / world setting? (e.g. '17th Century pirate era'): ").strip() or "17th Century"
    
    constraints = input("👉 Constraints / build rules (comma-separated, e.g. 'must be lightweight, brass material'): ").strip()
    constraints_list = [c.strip() for c in constraints.split(",") if c.strip()] if constraints else ["brass material"]

    budget_input = input("👉 Enter budget ceiling in USD (default $5.0): ").strip()
    budget = float(budget_input) if budget_input else 5.0

    prop = PropRecord(
        brief=Brief(
            what=what,
            on_screen=on_screen_list,
            era=era,
            constraints=constraints_list,
        ),
        budget_ceiling_usd=budget,
    )
    await repo.create(prop)
    print(f"\n✅ Prop record successfully created: ID = '{prop.id}'")

    # 3. Stage 1 — Generate Options
    print("\n" + "-" * 80)
    print("[Step 2] Stage 1: Running Concept Directions & Draft Options Generation...")
    print("-" * 80)

    try:
        job_id = await orch.start_stage1(prop.id, n_options=3)
        print(f"[*] Initialized generation. Job ID: {job_id}")
        
        # In CLI, we synchronously run the background pipeline for options
        print("[*] Generating concept rationales and draft images...")
        await orch.run_stage1_pipeline(prop.id, n_options=3, job_id=job_id)
    except Exception as e:
        print(f"❌ Error during Stage 1: {e}")
        return

    # Fetch updated prop details
    prop = await repo.get(prop.id)
    print(f"\n🎯 Concept Directions Generated (Status: {prop.status.value}):")
    for i, opt in enumerate(prop.options, 1):
        print(f"\n  Option #{i} [ID: {opt.id}]")
        print(f"  Rationale: {opt.rationale}")
        print(f"  Draft Image References: {opt.image_refs}")

    # 4. Stage 2 — Human Gate Selection
    print("\n" + "-" * 80)
    print("[Step 3] Stage 2: Selection Review Gate")
    print("-" * 80)

    valid_ids = [opt.id for opt in prop.options]
    chosen_id = ""
    while chosen_id not in valid_ids:
        chosen_id = input(f"👉 Enter the ID of the option you want to select {valid_ids}: ").strip()

    chosen_by = input("👉 Enter your role/identifier (e.g. 'Production Designer'): ").strip() or "Lead Designer"
    why = input("👉 Why are you choosing this direction? ").strip() or "Strongest silhouette and alignment with narrative."

    print("\n[*] Saving selection and transitioning state...")
    try:
        await orch.record_selection(prop.id, chosen_id, chosen_by, why)
        prop = await repo.get(prop.id)
        print(f"✅ Selection recorded successfully. Current Status: {prop.status.value}")
    except Exception as e:
        print(f"❌ Selection failed: {e}")
        return

    # 5. Stage 3 — Finalization & Specs
    print("\n" + "-" * 80)
    print("[Step 4] Stage 3: Asset Finalization and Spec Sheet Generation")
    print("-" * 80)
    print("[*] Launching sub-agent to draft build sheets and generating high-res seed-locked turnarounds...")

    try:
        final_job_id = await orch.start_stage3(prop.id)
        await orch.run_stage3_pipeline(prop.id, final_job_id)
        prop = await repo.get(prop.id)
    except Exception as e:
        print(f"❌ Finalization failed: {e}")
        return

    print("\n" + "=" * 80)
    print(" 🎉 SUCCESS! FINAL BUILD-READY ASSET PACKAGE DELIVERED 🎉")
    print("=" * 80)
    print(f"📦 Prop ID: {prop.id}")
    print(f"📊 Status: {prop.status.value.upper()}")
    print(f"💵 Cumulative Accrued Cost: ${prop.cost.est_usd:.4f} / Ceiling: ${prop.budget_ceiling_usd:.2f}")
    print("-" * 80)
    print("\n📝 MATERIAL SPECIFICATIONS:")
    print(prop.final_assets.material_spec)
    print("\n🛠️ BUILD SPECIFICATIONS & LAYOUT:")
    print(prop.final_assets.build_spec)
    print("-" * 80)
    print("\n🖼️ FINAL TURNAROUND IMAGE REFERENCES:")
    for ref in prop.final_assets.turnaround:
        print(f"  • {ref}")
    print("\n🔍 DETAIL CALLOUT IMAGE REFERENCES:")
    for ref in prop.final_assets.detail_callouts:
        print(f"  • {ref}")
    print("\n🎭 VARIANT IMAGE REFERENCES:")
    for ref in prop.final_assets.variants:
        print(f"  • {ref}")
    print("=" * 80)


if __name__ == "__main__":
    try:
        asyncio.run(run_interactive_cli())
    except KeyboardInterrupt:
        print("\n[!] CLI terminated by user.")
        sys.exit(0)
