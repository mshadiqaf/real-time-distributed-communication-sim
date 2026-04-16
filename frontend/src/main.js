/**
 * main.js — application orchestrator
 * Wires UI controls → backend API/SocketIO → canvas animations + log
 */
import './style.css';
import { io } from 'socket.io-client';
import { setModel, animatePacket, pulseNode } from './canvas.js';

const API = 'http://localhost:5000';

// ─── DOM refs ──────────────────────────────────────────────────────────────
const modelSelect   = document.getElementById('model-select');
const latencySlider = document.getElementById('latency-slider');
const latencyVal    = document.getElementById('latency-val');
const driverSlider  = document.getElementById('driver-slider');
const driverVal     = document.getElementById('driver-val');
const triggerBtn    = document.getElementById('trigger-btn');
const btnText       = document.getElementById('btn-text');
const btnSpinner    = document.getElementById('btn-spinner');
const connBadge     = document.getElementById('connection-badge');
const modelDesc     = document.getElementById('model-desc');
const sequenceLog   = document.getElementById('sequence-log');
const metricsWidget = document.getElementById('metrics-widget');
const appMain       = document.getElementById('app-main');

// ─── Model metadata ──────────────────────────────────────────────────────────
const MODEL_META = {
  'req-res': {
    label: '🔄 Pesan Ride',
    accent: '#58a6ff',
    desc: '<b>Request-Response</b>: Client blocks waiting for a direct reply from the server. Simple & easy — but the caller is frozen until the server responds.',
    nodes: ['client','server'],
    logClass: 'log-entry--send',
  },
  'pub-sub': {
    label: '📡 Cari Driver',
    accent: '#3fb950',
    desc: '<b>Publish-Subscribe</b>: Client publishes an order; the broker fans it out to all subscribed drivers in parallel. Non-blocking — nobody waits for anyone.',
    nodes: ['client','broker','d1','d2','d3'],
    logClass: 'log-entry--recv',
  },
  'queue': {
    label: '📬 Bayar Ride',
    accent: '#d29922',
    desc: '<b>Message Queue</b>: Payment request is enqueued; workers process it asynchronously. Decoupled — producer and consumer run at their own pace.',
    nodes: ['client','broker','server'],
    logClass: 'log-entry--queue',
  },
  'rpc': {
    label: '🔗 Hitung Rute',
    accent: '#a371f7',
    desc: '<b>RPC (Remote Procedure Call)</b>: Client calls a remote function as if it were local. Transparent communication — caller gets a result object back directly.',
    nodes: ['client','rpc','server'],
    logClass: 'log-entry--send',
  },
};

// ─── State ───────────────────────────────────────────────────────────────────
let metrics = { requests: 0, latencyAvg: 0, latencyTotal: 0, events: 0 };
let isBusy = false;

// ─── Constants (declared early to avoid TDZ) ─────────────────────────────
const LOG_TYPES = { send: 'send', recv: 'recv', queue: 'queue', error: 'error', info: 'info' };

const METRIC_DEFS = [
  { key: 'requests',   label: 'Requests',  unit: 'total' },
  { key: 'latencyAvg', label: 'Avg RTT',   unit: 'ms'    },
  { key: 'events',     label: 'WS Events', unit: 'total' },
];

// ─── SocketIO ─────────────────────────────────────────────────────────────────
const socket = io(API, { transports: ['websocket'], autoConnect: true });

socket.on('connect', () => {
  setConnected(true);
  log('SocketIO connected ✓', 'info');
});

socket.on('disconnect', () => {
  setConnected(false);
  log('SocketIO disconnected', 'error');
});

socket.on('order_broadcast', (data) => {
  metrics.events++;
  updateMetrics();
  const model = data.model || 'pub-sub';
  log(`[BROADCAST] order from ${data.user_id} @ ${data.location}`, 'recv');
  animatePacket('broker', 'd1', '#3fb950', 500);
  animatePacket('broker', 'd2', '#3fb950', 600);
  animatePacket('broker', 'd3', '#3fb950', 700);
  pulseNode('broker');
});

socket.on('driver_found', (data) => {
  metrics.events++;
  updateMetrics();
  const driverNum = data.driver_id?.split('-')[1];
  const dNode = `d${driverNum}`;
  log(`[DRIVER_FOUND] ${data.driver_id} ETA ${data.eta_minutes}min (${data.response_time_ms}ms)`, 'recv');
  if (dNode) pulseNode(dNode);
});

socket.on('payment_processed', (data) => {
  metrics.events++;
  updateMetrics();
  log(`[PROCESSED] order=${data.order_id} status=${data.status}`, 'queue');
  pulseNode('server');
  animatePacket('broker', 'server', '#d29922', 500);
});

// ─── UI event bindings ────────────────────────────────────────────────────────
modelSelect.addEventListener('change', () => {
  const m = modelSelect.value;
  setModel(m);
  setAccent(m);
  btnText.textContent = MODEL_META[m]?.label ?? '🚗 Trigger';
  modelDesc.innerHTML = MODEL_META[m]?.desc ?? '';
});

latencySlider.addEventListener('input', () => {
  latencyVal.textContent = latencySlider.value;
});

driverSlider.addEventListener('input', () => {
  driverVal.textContent = driverSlider.value;
});

triggerBtn.addEventListener('click', () => {
  if (isBusy) return;
  runSimulation();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  const m = modelSelect.value;
  setModel(m);
  setAccent(m);
  modelDesc.innerHTML = MODEL_META[m].desc;
  latencyVal.textContent = latencySlider.value;
  driverVal.textContent = driverSlider.value;
  renderMetrics();
}

init();

// ─── Simulation dispatcher ───────────────────────────────────────────────────
async function runSimulation() {
  const model    = modelSelect.value;
  const latency  = parseInt(latencySlider.value, 10);
  const drivers  = parseInt(driverSlider.value, 10);

  setBusy(true);
  clearLog();
  log(`▶ Triggering [${model}] latency=${latency}ms drivers=${drivers}`, 'info');

  const t0 = performance.now();

  try {
    switch (model) {
      case 'req-res': await runReqRes(latency); break;
      case 'pub-sub': await runPubSub(latency, drivers); break;
      case 'queue':   await runQueue(latency); break;
      case 'rpc':     await runRpc(latency); break;
    }
  } catch (err) {
    log(`✗ ${err.message}`, 'error');
  } finally {
    const elapsed = Math.round(performance.now() - t0);
    metrics.requests++;
    metrics.latencyTotal += elapsed;
    metrics.latencyAvg = Math.round(metrics.latencyTotal / metrics.requests);
    updateMetrics();
    setBusy(false);
    log(`■ Done in ${elapsed}ms`, 'info');
  }
}

// ─── req-res ──────────────────────────────────────────────────────────────────
async function runReqRes(latency) {
  log('→ POST /api/req-res/find-price', 'send');
  pulseNode('client');
  animatePacket('client', 'server', '#58a6ff', Math.max(300, latency * 0.6));

  const res  = await apiFetch('/api/req-res/find-price', { origin: 'Sudirman', destination: 'Blok M', latency });
  animatePacket('server', 'client', '#58a6ff', Math.max(300, latency * 0.6));
  pulseNode('server');

  log(`← price: Rp ${res.price?.toLocaleString('id-ID')} (${res.response_time_ms}ms)`, 'recv');
}

// ─── pub-sub ──────────────────────────────────────────────────────────────────
async function runPubSub(latency, drivers) {
  log(`→ emit find_driver (drivers=${drivers})`, 'send');
  pulseNode('client');
  animatePacket('client', 'broker', '#3fb950', 300);
  socket.emit('find_driver', {
    user_id:  'rider-001',
    location: 'Sudirman',
    latency,
    drivers,
  });
  // Responses arrive via socket.on('order_broadcast') and 'driver_found'
  log('  ⋯ awaiting broadcast events…', 'info');
  await sleep(latency * drivers * 1.5 + 1000);
}

// ─── queue ────────────────────────────────────────────────────────────────────
async function runQueue(latency) {
  log('→ POST /api/queue/pay', 'queue');
  pulseNode('client');
  animatePacket('client', 'broker', '#d29922', 300);

  const res = await apiFetch('/api/queue/pay', {
    order_id: `ord-${Date.now()}`,
    amount:   25000,
    latency,
  });

  pulseNode('broker');
  log(`  queued at position ${res.queue_position} (${res.status})`, 'queue');
  log('  ⋯ worker processing async…', 'info');
}

// ─── rpc ──────────────────────────────────────────────────────────────────────
async function runRpc(latency) {
  log('→ POST /api/rpc/calculate-route', 'send');
  pulseNode('client');
  animatePacket('client', 'rpc', '#a371f7', Math.max(200, latency * 0.4));

  const res = await apiFetch('/api/rpc/calculate-route', {
    origin:      'Sudirman',
    destination: 'Blok M',
    latency,
  });

  animatePacket('rpc', 'server', '#a371f7', 200);
  pulseNode('rpc');
  await sleep(200);
  animatePacket('server', 'rpc', '#a371f7', 200);
  animatePacket('rpc', 'client', '#a371f7', Math.max(200, latency * 0.4));
  pulseNode('server');

  const r = res.result;
  log(`← ${r.distance_km}km ETA ${r.eta_minutes}min (${res.response_time_ms}ms)`, 'recv');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${path}`);
  return response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setBusy(busy) {
  isBusy = busy;
  triggerBtn.disabled = busy;
  btnText.classList.toggle('hidden', busy);
  btnSpinner.classList.toggle('hidden', !busy);
}

function setConnected(connected) {
  connBadge.textContent = connected ? '🟢 Connected' : '⚫ Disconnected';
  connBadge.className   = `badge badge--${connected ? 'connected' : 'disconnected'}`;
}

function setAccent(model) {
  appMain.setAttribute('data-model', model);
}

// ─── Log ──────────────────────────────────────────────────────────────────────

function log(msg, type = 'info') {
  const ts  = new Date().toISOString().slice(11, 23);
  const div = document.createElement('div');
  div.className = `log-entry log-entry--${LOG_TYPES[type] ?? 'info'}`;
  div.textContent = `${ts}  ${msg}`;
  sequenceLog.appendChild(div);
  sequenceLog.scrollTop = sequenceLog.scrollHeight;
}

function clearLog() {
  sequenceLog.innerHTML = '';
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function renderMetrics() {
  metricsWidget.innerHTML = '';
  METRIC_DEFS.forEach(def => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.id = `metric-${def.key}`;
    card.innerHTML = `
      <div class="metric-label">${def.label}</div>
      <div class="metric-value">${metrics[def.key] ?? 0}</div>
      <div class="metric-unit">${def.unit}</div>
    `;
    metricsWidget.appendChild(card);
  });
}

function updateMetrics() {
  METRIC_DEFS.forEach(def => {
    const card  = document.getElementById(`metric-${def.key}`);
    if (!card) return;
    const valEl = card.querySelector('.metric-value');
    if (valEl) valEl.textContent = metrics[def.key] ?? 0;
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 400);
  });
}

renderMetrics();
