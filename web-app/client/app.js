/**
 * app.js — Artifact web app (plain JavaScript, no build step).
 * Talks to the Node/Express backend which proxies the agent API.
 */
'use strict';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  props:       [],       // list of prop summaries
  activeProp:  null,     // full prop record currently shown
  view:        'welcome',// 'welcome' | 'prop' | 'new'
  loading:     false,
  eventSource: null,
};

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch('/api' + path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  return data;
}

const get  = (path)        => api('GET',  path);
const post = (path, body)  => api('POST', path, body);

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── SSE ───────────────────────────────────────────────────────────────────────
function watchProp(propId) {
  if (state.eventSource) state.eventSource.close();
  const es = new EventSource(`/api/props/${propId}/events`);
  state.eventSource = es;
  es.onmessage = async (e) => {
    const data = JSON.parse(e.data);
    if (data.error) return;
    appendChat(`Status → ${data.status}`, 'system');
    // Refresh the prop record when status changes
    try {
      const fresh = await get(`/props/${propId}`);
      state.activeProp = fresh;
      renderContent();
      refreshSidebar();
    } catch (_) {}
    const terminal = ['assets_ready','exported','failed_options','failed_final','failed_export'];
    if (terminal.includes(data.status)) es.close();
  };
  es.onerror = () => es.close();
}

// ── Chat log (per prop session) ───────────────────────────────────────────────
const chatLog = {};
function chatKey() { return state.activeProp ? state.activeProp.id : '_'; }
function appendChat(text, role = 'agent') {
  const key = chatKey();
  if (!chatLog[key]) chatLog[key] = [];
  chatLog[key].push({ text, role });
  renderChatMsgs();
}
function renderChatMsgs() {
  const el = document.getElementById('chat-msgs');
  if (!el) return;
  const msgs = chatLog[chatKey()] || [];
  el.innerHTML = msgs.map(m =>
    `<div class="msg-${m.role}">${escHtml(m.text)}</div>`
  ).join('');
  el.scrollTop = el.scrollHeight;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function statusBadgeClass(s) {
  if (!s) return '';
  if (s.startsWith('failed') || s === 'budget_exceeded') return 'failed';
  if (s === 'exported') return 'done';
  return '';
}
function imgSrc(url) {
  // Show a placeholder box if URL is empty / stub
  return url && !url.includes('stub') ? url : '';
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
async function loadProps() {
  // Agent API has no list endpoint; we track created props in localStorage.
  const ids = JSON.parse(localStorage.getItem('artifact_props') || '[]');
  const results = await Promise.allSettled(ids.map(id => get(`/props/${id}`)));
  state.props = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  renderSidebar();
}

function saveProps() {
  localStorage.setItem('artifact_props', JSON.stringify(state.props.map(p => p.id)));
}

function refreshSidebar() {
  renderSidebar();
}

function renderSidebar() {
  const list = document.getElementById('prop-list');
  if (!list) return;
  list.innerHTML = state.props.length === 0
    ? `<li style="padding:1rem;font-size:.8rem;color:var(--ink-light)">No props yet.</li>`
    : state.props.map(p => `
        <li class="prop-item ${state.activeProp?.id === p.id ? 'active' : ''}"
            onclick="selectProp('${p.id}')">
          <span class="prop-name">${escHtml(p.brief?.what?.slice(0,38) || p.id)}</span>
          <span class="prop-status">${p.status || ''}</span>
        </li>`).join('');
}

// ── Select prop ───────────────────────────────────────────────────────────────
async function selectProp(id) {
  state.loading = true;
  renderContent();
  try {
    state.activeProp = await get(`/props/${id}`);
    state.view = 'prop';
    watchProp(id);
    appendChat(`Loaded prop: ${state.activeProp.brief?.what}`, 'system');
  } catch (err) {
    toast('Could not load prop: ' + err.message);
  }
  state.loading = false;
  renderApp();
}

// ── Create prop ───────────────────────────────────────────────────────────────
async function createProp(e) {
  e.preventDefault();
  const form = e.target;
  const what        = form.what.value.trim();
  const era         = form.era.value.trim();
  const on_screen   = form.on_screen.value.split('\n').map(s => s.trim()).filter(Boolean);
  const constraints = form.constraints.value.split('\n').map(s => s.trim()).filter(Boolean);
  const n_options   = parseInt(form.n_options.value) || 4;
  const budget      = parseFloat(form.budget.value) || 5;

  if (!what) return toast('Brief "what" is required.');

  const btn = form.querySelector('.btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  try {
    const idem = `create-${Date.now()}`;
    const res  = await api('POST', '/props', {
      brief: { what, era, on_screen, constraints },
      n_options,
      budget_ceiling_usd: budget,
    });
    // Fetch full record
    const prop = await get(`/props/${res.prop_id}`);
    state.props.unshift(prop);
    saveProps();
    state.activeProp = prop;
    state.view = 'prop';
    watchProp(prop.id);
    appendChat(`Created prop "${what}" — generating ${n_options} options…`, 'agent');
    toast('Prop created! Generating options…');
  } catch (err) {
    toast('Error: ' + err.message);
  }

  btn.disabled = false;
  btn.textContent = 'Create prop';
  renderApp();
}

// ── Selection ─────────────────────────────────────────────────────────────────
let selectedOptionId = null;

function selectOption(optId) {
  selectedOptionId = optId;
  document.querySelectorAll('.option-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.optId === optId);
  });
}

async function submitSelection(e) {
  e.preventDefault();
  if (!selectedOptionId) return toast('Pick an option first.');
  const form = e.target;
  const by   = form.by.value.trim() || 'user';
  const why  = form.why.value.trim();
  if (!why) return toast('"Why" is required.');

  const btn = form.querySelector('.btn-primary');
  btn.disabled = true;
  try {
    await post(`/props/${state.activeProp.id}/selection`, {
      chosen_option_id: selectedOptionId,
      chosen_by: by,
      why,
    });
    const fresh = await get(`/props/${state.activeProp.id}`);
    state.activeProp = fresh;
    appendChat(`Selection recorded: ${selectedOptionId} — "${why}"`, 'agent');
    toast('Selection recorded.');
    renderApp();
  } catch (err) {
    toast('Error: ' + err.message);
  }
  btn.disabled = false;
}

// ── Finalize ──────────────────────────────────────────────────────────────────
async function finalizeProp() {
  const btn = document.getElementById('btn-finalize');
  if (btn) btn.disabled = true;
  try {
    const res = await post(`/props/${state.activeProp.id}/finalize`, {});
    state.activeProp = await get(`/props/${state.activeProp.id}`);
    watchProp(state.activeProp.id);
    appendChat(`Finalize started — job ${res.job_id}. Rendering final assets…`, 'agent');
    toast('Generating final assets…');
    renderApp();
  } catch (err) {
    toast('Error: ' + err.message);
    if (btn) btn.disabled = false;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
async function exportProp() {
  const btn = document.getElementById('btn-export');
  if (btn) btn.disabled = true;
  try {
    const res = await post(`/props/${state.activeProp.id}/export`, {});
    state.activeProp = await get(`/props/${state.activeProp.id}`);
    appendChat(`Exported to DAM — ref: ${res.dam_ref}`, 'agent');
    toast('Exported to asset library.');
    renderApp();
  } catch (err) {
    toast('Error: ' + err.message);
    if (btn) btn.disabled = false;
  }
}

// ── Chat send ─────────────────────────────────────────────────────────────────
function handleChat(e) {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const input = e.target;
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  appendChat(text, 'user');

  // Simple command dispatch
  const cmd = text.toLowerCase();
  if (!state.activeProp) {
    appendChat('Select or create a prop first.', 'agent');
    return;
  }
  const p = state.activeProp;
  if (cmd === 'status') {
    appendChat(`Status: ${p.status} | Cost: $${p.cost?.est_usd?.toFixed(4)} | Job: ${p.job_id || 'none'}`, 'agent');
  } else if (cmd === 'brief') {
    appendChat(`Brief: ${p.brief?.what} | Era: ${p.brief?.era || 'unspecified'}`, 'agent');
  } else if (cmd === 'help') {
    appendChat('Commands: status · brief · help  — or use the action buttons above.', 'agent');
  } else {
    appendChat(`(Use the action buttons to progress the prop, or type: status · brief · help)`, 'agent');
  }
}

// ── Render: new prop form ─────────────────────────────────────────────────────
function renderNewPropForm() {
  return `
  <div class="prop-panel">
    <div class="card">
      <div class="card-head">
        <span class="card-num">01</span>
        <span class="card-title">New Hero Prop</span>
      </div>
      <div class="card-body">
        <form id="new-prop-form" onsubmit="createProp(event)" style="display:flex;flex-direction:column;gap:1rem">
          <div class="form-group">
            <label class="form-label">What is it? *</label>
            <input name="what" class="form-input" placeholder="e.g. ceremonial sword that ignites along the blade" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Era / world</label>
              <input name="era" class="form-input" placeholder="e.g. bronze-age myth" />
            </div>
            <div class="form-group">
              <label class="form-label">N options (1–10)</label>
              <input name="n_options" class="form-input" type="number" min="1" max="10" value="4" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">On-screen moments (one per line)</label>
            <textarea name="on_screen" class="form-textarea" placeholder="drawn in sc 7&#10;ignites in sc 41"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Constraints (one per line)</label>
            <textarea name="constraints" class="form-textarea" placeholder="must-open pommel&#10;stunt-safe lightweight variant"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Budget ceiling (USD)</label>
            <input name="budget" class="form-input" type="number" step="0.5" min="0.5" value="5" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="state.view='welcome';renderApp()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create prop</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

// ── Render: prop detail ───────────────────────────────────────────────────────
function renderPropDetail(p) {
  const sections = [];

  // ── Header
  sections.push(`
    <div class="card">
      <div class="card-head">
        <span class="card-num">${escHtml(p.id)}</span>
        <span class="card-title">${escHtml(p.brief?.what || '')}</span>
        <span class="badge ${statusBadgeClass(p.status)}" style="margin-left:auto">${p.status}</span>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:.75rem">
        <div class="brief-grid">
          <span class="brief-label">Era</span>
          <span class="brief-val">${escHtml(p.brief?.era || '—')}</span>
          <span class="brief-label">On screen</span>
          <span class="brief-val">${(p.brief?.on_screen||[]).map(escHtml).join(' · ') || '—'}</span>
          <span class="brief-label">Constraints</span>
          <div class="brief-val tag-list">${(p.brief?.constraints||[]).map(c=>`<span class="tag">${escHtml(c)}</span>`).join('')||'—'}</div>
        </div>
        <div class="cost-row">
          <span>NB2 images: <strong>${p.cost?.nb2_images??0}</strong></span>
          <span>NBPro images: <strong>${p.cost?.nbpro_images??0}</strong></span>
          <span>Est. cost: <strong>$${(p.cost?.est_usd||0).toFixed(4)}</strong></span>
        </div>
        <div class="flags-row">
          <span>Trademark: <span class="${p.flags?.trademark_risk!=='none'?'flag-warn':'flag-ok'}">${p.flags?.trademark_risk||'none'}</span></span>
          <span>Moderation: <span class="${p.flags?.moderation==='flagged'?'flag-warn':'flag-ok'}">${p.flags?.moderation||'clean'}</span></span>
        </div>
      </div>
    </div>`);

  // ── Stage 1: Options
  if (p.options?.length) {
    const canSelect = p.status === 'awaiting_options_review';
    sections.push(`
      <div class="card">
        <div class="card-head">
          <span class="card-num">01</span>
          <span class="card-title">Concept Options</span>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:1rem">
          <div class="options-grid">
            ${p.options.map(o => `
              <div class="option-card ${p.selection?.chosen===o.id?'selected':''}"
                   data-opt-id="${o.id}"
                   onclick="${canSelect?`selectOption('${o.id}')`:''}">
                ${o.image_urls?.[0] && imgSrc(o.image_urls[0])
                  ? `<img src="${escHtml(o.image_urls[0])}" alt="${escHtml(o.id)}" loading="lazy"/>`
                  : `<div style="aspect-ratio:1;background:var(--paper-dark);display:flex;align-items:center;justify-content:center"><span class="spinner"></span></div>`}
                <div class="opt-label">
                  <div class="opt-id">${escHtml(o.id)}</div>
                  <div class="opt-rationale">${escHtml(o.rationale)}</div>
                </div>
              </div>`).join('')}
          </div>
          ${canSelect ? `
          <form class="selection-form" onsubmit="submitSelection(event)">
            <div class="card-head" style="background:none;border:none;padding:0">
              <span class="card-num">02</span>
              <span class="card-title">Record Selection</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Your name / role</label>
                <input name="by" class="form-input" placeholder="prod_designer" />
              </div>
              <div class="form-group">
                <label class="form-label">Why this option? *</label>
                <input name="why" class="form-input" placeholder="silhouette reads on camera" required />
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Confirm selection</button>
            </div>
          </form>` : p.selection ? `
          <div style="font-size:.85rem;color:var(--ink-mid)">
            <strong>Selected:</strong> ${escHtml(p.selection.chosen)} by ${escHtml(p.selection.by)} —
            "${escHtml(p.selection.why)}"
          </div>` : ''}
        </div>
      </div>`);
  } else if (['generating_options','draft'].includes(p.status)) {
    sections.push(`
      <div class="card">
        <div class="card-head"><span class="card-num">01</span><span class="card-title">Concept Options</span></div>
        <div class="card-body" style="display:flex;gap:.75rem;align-items:center;color:var(--ink-light);font-size:.88rem">
          <span class="spinner"></span> Generating options…
        </div>
      </div>`);
  }

  // ── Stage 3: Finalize button
  if (p.status === 'selection_confirmed') {
    sections.push(`
      <div class="card">
        <div class="card-head"><span class="card-num">03</span><span class="card-title">Final Assets</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:.75rem">
          <p style="font-size:.88rem;color:var(--ink-mid)">
            Option <strong>${escHtml(p.selection?.chosen||'')}</strong> confirmed.
            Start final asset generation with Nano Banana Pro.
          </p>
          <div>
            <button id="btn-finalize" class="btn btn-primary" onclick="finalizeProp()">
              Generate final assets
            </button>
          </div>
        </div>
      </div>`);
  }

  // ── Stage 3: Generating
  if (p.status === 'generating_final') {
    sections.push(`
      <div class="card">
        <div class="card-head"><span class="card-num">03</span><span class="card-title">Final Assets</span></div>
        <div class="card-body" style="display:flex;gap:.75rem;align-items:center;color:var(--ink-light);font-size:.88rem">
          <span class="spinner"></span> Rendering final assets…
        </div>
      </div>`);
  }

  // ── Stage 3: Assets ready
  if (['assets_ready','exported'].includes(p.status) && p.final_assets) {
    const fa = p.final_assets;
    sections.push(`
      <div class="card">
        <div class="card-head"><span class="card-num">03</span><span class="card-title">Final Assets</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:1.25rem">
          ${fa.turnaround?.length ? `
          <div>
            <div class="form-label" style="margin-bottom:.5rem">Turnaround</div>
            <div class="assets-grid">
              ${fa.turnaround.map((u,i)=>`
                <div class="asset-thumb">
                  ${imgSrc(u)?`<img src="${escHtml(u)}" loading="lazy"/>`:`<div style="aspect-ratio:1;background:var(--paper-dark)"></div>`}
                  <span>${['front','side','back','3/4'][i]||'view'}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
          ${fa.detail_callouts?.length ? `
          <div>
            <div class="form-label" style="margin-bottom:.5rem">Detail Callouts</div>
            <div class="assets-grid">
              ${fa.detail_callouts.map((u,i)=>`
                <div class="asset-thumb">
                  ${imgSrc(u)?`<img src="${escHtml(u)}" loading="lazy"/>`:`<div style="aspect-ratio:1;background:var(--paper-dark)"></div>`}
                  <span>callout ${i+1}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
          ${fa.variants?.length ? `
          <div>
            <div class="form-label" style="margin-bottom:.5rem">Variants</div>
            <div class="assets-grid">
              ${fa.variants.map((u,i)=>`
                <div class="asset-thumb">
                  ${imgSrc(u)?`<img src="${escHtml(u)}" loading="lazy"/>`:`<div style="aspect-ratio:1;background:var(--paper-dark)"></div>`}
                  <span>${['hero','stunt'][i]||'variant'}</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
          ${fa.material_spec ? `
          <div>
            <div class="form-label" style="margin-bottom:.4rem">Material Spec</div>
            <div class="spec-block">${escHtml(fa.material_spec)}</div>
          </div>` : ''}
          ${fa.build_spec ? `
          <div>
            <div class="form-label" style="margin-bottom:.4rem">Build Spec</div>
            <div class="spec-block">${escHtml(fa.build_spec)}</div>
          </div>` : ''}
          ${p.status === 'assets_ready' ? `
          <div>
            <button id="btn-export" class="btn btn-secondary" onclick="exportProp()">
              Export to asset library
            </button>
          </div>` : `<div class="badge done">Exported to DAM</div>`}
        </div>
      </div>`);
  }

  // ── Chat
  sections.push(`
    <div class="card">
      <div class="card-head"><span class="card-num">—</span><span class="card-title">Chat</span></div>
      <div class="card-body">
        <div class="chat-area">
          <div class="chat-msgs" id="chat-msgs"></div>
          <div class="chat-row">
            <input class="chat-input" id="chat-input" placeholder="Ask about this prop… (Enter to send)" onkeydown="handleChat(event)" />
          </div>
          <span class="form-hint">type: status · brief · help</span>
        </div>
      </div>
    </div>`);

  return `<div class="prop-panel">${sections.join('')}</div>`;
}

// ── Master render ─────────────────────────────────────────────────────────────
function renderContent() {
  const content = document.getElementById('content');
  if (!content) return;

  if (state.loading) {
    content.innerHTML = `<div class="welcome"><span class="spinner" style="width:28px;height:28px;border-width:3px"></span></div>`;
    return;
  }

  if (state.view === 'new') {
    content.innerHTML = renderNewPropForm();
    return;
  }

  if (state.view === 'prop' && state.activeProp) {
    content.innerHTML = renderPropDetail(state.activeProp);
    renderChatMsgs();
    return;
  }

  // welcome
  content.innerHTML = `
    <div class="welcome">
      <h2>Artifact</h2>
      <p>Select a prop from the sidebar or create a new one to begin the concept-to-build pipeline.</p>
      <button class="btn btn-primary" onclick="state.view='new';renderApp()">New hero prop</button>
    </div>`;
}

function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="shell">
      <header class="top-bar">
        <h1><span>Artifact</span> — Hero Prop Pipeline</h1>
      </header>
      <div class="main">
        <nav class="sidebar">
          <div class="sidebar-head">Props</div>
          <ul class="prop-list" id="prop-list"></ul>
          <button class="btn-new" onclick="state.view='new';renderApp()">+ New prop</button>
        </nav>
        <main class="content" id="content"></main>
      </div>
    </div>`;

  renderSidebar();
  renderContent();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
(async function boot() {
  renderApp();
  await loadProps();
})();
