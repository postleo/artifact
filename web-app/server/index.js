/**
 * server/index.js — Express backend for the Artifact web app.
 * Proxies all /api/* calls to the agent service and serves the React client.
 */
'use strict';

const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const AGENT_URL   = (process.env.AGENT_URL || 'http://localhost:8080').replace(/\/$/, '');
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

function agentHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (AGENT_TOKEN) h['Authorization'] = `Bearer ${AGENT_TOKEN}`;
  return h;
}

// SSE — pipe the event stream straight through to the browser
app.get('/api/props/:id/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  try {
    const upstream = await fetch(
      `${AGENT_URL}/v1/props/${req.params.id}/events`,
      { headers: agentHeaders() }
    );
    upstream.body.on('data', chunk => res.write(chunk));
    upstream.body.on('end',  () => res.end());
    req.on('close', () => upstream.body.destroy());
  } catch (err) {
    res.write(`data: {"error":"${err.message}"}\n\n`);
    res.end();
  }
});

// Generic proxy — /api/* → /v1/*
app.all('/api/*', async (req, res) => {
  const agentPath = req.path.replace(/^\/api/, '/v1');
  const url       = `${AGENT_URL}${agentPath}`;

  const options = { method: req.method, headers: agentHeaders() };
  if (req.headers['idempotency-key'])
    options.headers['Idempotency-Key'] = req.headers['idempotency-key'];
  if (['POST','PUT','PATCH'].includes(req.method) && req.body)
    options.body = JSON.stringify(req.body);

  try {
    const upstream = await fetch(url, options);
    const text     = await upstream.text();
    res.status(upstream.status).set('Content-Type', 'application/json').send(text);
  } catch (err) {
    res.status(502).json({ error: 'Agent service unreachable', detail: err.message });
  }
});

// Catch-all → SPA
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../client/index.html'))
);

app.listen(PORT, () => console.log(`Artifact web app on port ${PORT}`));
