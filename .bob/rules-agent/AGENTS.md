# AGENTS.md — Agent (coding) mode

This file provides guidance to agents when working with code in this repository.

## Critical coding rules (non-obvious only)

### agent-system
- **Never call `generate_images()`** on Nano Banana models — use `client.models.generate_content(model=..., contents=[...], config=GenerateContentConfig(response_modalities=["IMAGE"]))`. These are Gemini image models, not Imagen.
- **All model IDs live exclusively in `config.py`** — no model string anywhere else. All four models are env-overridable; `config.py` holds defaults.
- **State transitions always go through `repo.transition()`** — never set `prop.status` directly. `transition()` calls `assert_valid_transition()` and fires `publish_prop_event()`.
- **`publish_prop_event()` must never raise** — it swallows all errors by design. Don't add try/except around call sites; they already can't fail the caller.
- **Background pipeline is separate from start**: `start_stage1()` sets up state and returns a job_id; `run_stage1_pipeline()` does the actual image generation and calls `complete_stage1()`. Same pattern for stage 3. The API routes call `start_*`; background workers call `run_*_pipeline()`.
- **ADK agents in `agent/adk/subagents.py`** use the local `core.py` layer (offline-safe). The `agent/adk/root_agent.py` uses `google.adk.agents.LlmAgent` for Vertex deployment only. Don't mix them.
- **`LocalADKAdapter`** runs ADK agents in-process via `InMemoryRunner` (no network). Selected automatically when `AGENT_ENGINE_RESOURCE_NAME` is unset and `USE_STUBS=false`.
- **pytest asyncio mode is STRICT** — every async test must have `@pytest.mark.asyncio`. Import `pytest_asyncio` explicitly when using `pytest_asyncio.fixture`.
- **`events/producer.py` singleton** — use `get_producer()` not `PropEventProducer()` directly in application code. Reset with `reset_producer_singleton()` in tests only.

### app-backend
- **Firestore collection name is `app_props`**, not `props` — the agent-system uses `props` in the same Firestore instance.
- **Use `wrapDoc(ref, data)`** from `db.ts` when returning Firestore documents from route handlers — gives the object a hidden `.update()` method that persists patches without exposing it in JSON responses.
- **`kafkajs` must only be imported via dynamic `import()`** inside the enable path — never at module top-level. Type-only imports (`import type`) are fine at the top.
- **`npm run build` must pass before merging** — `tsc` is strict (`"strict": true`, `"moduleResolution": "NodeNext"`).

### app (frontend)
- **`@/` resolves to the `/app/` root**, not `/app/src/`. Path: `@/src/components/Foo.tsx`.
- **`VITE_BACKEND_URL` is compile-time** — changes require a rebuild. For local dev, set it in your local environment; for Cloud Run, pass as Docker build-arg.
- **All studio state goes through `studioApi.ts`** (`getStudioProfile`, `saveStudioProps`, etc.) — never localStorage directly. The backend persists to Firestore.
- **`auth.ts` + JWT**: `authHeader()` returns the Authorization header; `handleUnauthorized()` clears the token and redirects to login. Always call both together on 401.
