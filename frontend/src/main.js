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
    label: 'Pesan Ride',
    accent: '#3b82f6',
    desc: '<b>Request-Response</b>: Klien menunggu balasan langsung dari server secara terblokir. Sederhana, namun penelepon harus menunggu hingga server selesai merespons.',
    nodes: ['client','server'],
    logClass: 'log-entry--send',
  },
  'pub-sub': {
    label: 'Cari Pengemudi',
    accent: '#22c55e',
    desc: '<b>Publish-Subscribe (MQTT)</b>: Klien memublikasikan pesanan; broker menyebarkannya ke semua pengemudi yang berlangganan secara paralel. Non-blocking — tidak ada yang saling menunggu.',
    nodes: ['client','broker','d1','d2','d3'],
    logClass: 'log-entry--recv',
  },
  'queue': {
    label: 'Bayar Ride',
    accent: '#eab308',
    desc: '<b>Message Queue (MQTT)</b>: Permintaan pembayaran masuk ke antrean; pekerja memprosesnya secara asinkron. Terpisah — produsen dan konsumen berjalan pada kecepatan masing-masing.',
    nodes: ['client','broker','server'],
    logClass: 'log-entry--queue',
  },
  'rpc': {
    label: 'Hitung Rute',
    accent: '#8b5cf6',
    desc: '<b>RPC (Remote Procedure Call)</b>: Klien memanggil fungsi jarak jauh seolah-olah itu lokal. Komunikasi transparan — penelepon langsung menerima objek hasil.',
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
  { key: 'requests',   label: 'Permintaan',  unit: 'total' },
  { key: 'latencyAvg', label: 'Rata RTT',   unit: 'ms'    },
  { key: 'events',     label: 'Event WS', unit: 'total' },
];

// ─── SocketIO ─────────────────────────────────────────────────────────────────
const socket = io(API, { transports: ['websocket'], autoConnect: true });

socket.on('connect', () => {
  setConnected(true);
  log('SocketIO terhubung ✓', 'info');
});

socket.on('disconnect', () => {
  setConnected(false);
  log('SocketIO terputus', 'error');
});

socket.on('order_broadcast', (data) => {
  metrics.events++;
  updateMetrics();
  const model = data.model || 'pub-sub';
  log(`[SIARAN] pesanan dari ${data.user_id} @ ${data.location}`, 'recv');
  animatePacket('broker', 'd1', '#22c55e', 500);
  animatePacket('broker', 'd2', '#22c55e', 600);
  animatePacket('broker', 'd3', '#22c55e', 700);
  pulseNode('broker');
});

socket.on('driver_found', (data) => {
  metrics.events++;
  updateMetrics();
  const driverNum = data.driver_id?.split('-')[1];
  const dNode = `d${driverNum}`;
  log(`[PENGEMUDI DITEMUKAN] ${data.driver_id} ETA ${data.eta_minutes}menit (${data.response_time_ms}ms)`, 'recv');
  if (dNode) pulseNode(dNode);
});

socket.on('payment_processed', (data) => {
  metrics.events++;
  updateMetrics();
  log(`[DIPROSES] order=${data.order_id} status=${data.status}`, 'queue');
  pulseNode('server');
  animatePacket('broker', 'server', '#eab308', 500);
});

// ─── UI event bindings ────────────────────────────────────────────────────────
modelSelect.addEventListener('change', () => {
  const m = modelSelect.value;
  setModel(m);
  setAccent(m);
  btnText.textContent = MODEL_META[m]?.label ?? 'Jalankan';
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
  log(`▶ Menjalankan [${model}] latensi=${latency}ms pengemudi=${drivers}`, 'info');

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
    log(`■ Selesai dalam ${elapsed}ms`, 'info');
  }
}

// ─── req-res ──────────────────────────────────────────────────────────────────
async function runReqRes(latency) {
  log('<strong>→ POST /api/req-res/find-price</strong>', 'send');
  pulseNode('client');
  animatePacket('client', 'server', '#3b82f6', Math.max(300, latency * 0.6));

  const res  = await apiFetch('/api/req-res/find-price', { origin: 'Sudirman', destination: 'Blok M', latency });
  animatePacket('server', 'client', '#3b82f6', Math.max(300, latency * 0.6));
  pulseNode('server');

  log(`<strong>← HARGA CALC</strong> Rp ${res.price?.toLocaleString('id-ID')} (${res.response_time_ms}ms)`, 'recv');
}

// ─── pub-sub ──────────────────────────────────────────────────────────────────
async function runPubSub(latency, drivers) {
  log(`<strong>→ EMIT find_driver</strong> (drivers=${drivers})`, 'send');
  pulseNode('client');
  animatePacket('client', 'broker', '#22c55e', 300);
  socket.emit('find_driver', {
    user_id:  'rider-001',
    location: 'Sudirman',
    latency,
    drivers,
  });
  // Responses arrive via socket.on('order_broadcast') and 'driver_found'
  log('  ⋯ menunggu siaran / broadcast respons…', 'info');
  await sleep(latency * drivers * 1.5 + 1000);
}

// ─── queue ────────────────────────────────────────────────────────────────────
async function runQueue(latency) {
  log('<strong>→ POST /api/queue/pay</strong>', 'queue');
  pulseNode('client');
  animatePacket('client', 'broker', '#eab308', 300);

  const res = await apiFetch('/api/queue/pay', {
    order_id: `ord-${Date.now()}`,
    amount:   25000,
    latency,
  });

  pulseNode('broker');
  log(`  masuk antrean pada posisi ${res.queue_position} (${res.status})`, 'queue');
  log('  ⋯ pekerja memproses asinkron…', 'info');
}

// ─── rpc ──────────────────────────────────────────────────────────────────────
async function runRpc(latency) {
  log('<strong>→ POST /api/rpc/calculate-route</strong>', 'send');
  pulseNode('client');
  animatePacket('client', 'rpc', '#8b5cf6', Math.max(200, latency * 0.4));

  const res = await apiFetch('/api/rpc/calculate-route', {
    origin:      'Sudirman',
    destination: 'Blok M',
    latency,
  });

  animatePacket('rpc', 'server', '#8b5cf6', 200);
  pulseNode('rpc');
  await sleep(200);
  animatePacket('server', 'rpc', '#8b5cf6', 200);
  animatePacket('rpc', 'client', '#8b5cf6', Math.max(200, latency * 0.4));
  pulseNode('server');

  const r = res.result;
  log(`← Jarak ${r.distance_km}km ETA ${r.eta_minutes}menit (${res.response_time_ms}ms)`, 'recv');
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
  connBadge.innerHTML = connected ? '<i data-lucide="check-circle" style="width:12px;height:12px;margin-bottom:-2px;"></i> Terhubung' : '<i data-lucide="circle-slash" style="width:12px;height:12px;margin-bottom:-2px;"></i> Terputus';
  connBadge.className   = `badge badge--${connected ? 'connected' : 'disconnected'}`;
  lucide.createIcons();
}

function setAccent(model) {
  appMain.setAttribute('data-model', model);
}

// ─── Log ──────────────────────────────────────────────────────────────────────

function log(msg, type = 'info') {
  const ts  = new Date().toISOString().slice(11, 23);
  const div = document.createElement('div');
  div.className = `log-entry log-entry--${LOG_TYPES[type] ?? 'info'}`;
  
  const meta = document.createElement('div');
  meta.className = 'log-meta';
  meta.innerHTML = `<span class="log-time">${ts}</span>`;
  
  const content = document.createElement('div');
  content.className = 'log-content';
  content.innerHTML = msg; // Allows us to use strong tags

  div.appendChild(meta);
  div.appendChild(content);

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
