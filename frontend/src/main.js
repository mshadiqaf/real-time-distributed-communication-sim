/*
  main.js adalah pusat dari seluruh aplikasi ini.
  Di sinilah semua bagian disambungkan: kontrol di panel kanan, koneksi ke backend,
  animasi di kanvas, log pesan, dan tabel perbandingan.
*/
import './style.css';
import { io } from 'socket.io-client';
import { setModel, animatePacket, pulseNode, setDriverCount, setNodeStatus, resetView } from './canvas.js';

const API = 'http://localhost:5000';

// Ambil referensi semua elemen HTML yang akan sering dipakai
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
const compTbody     = document.getElementById('comparison-tbody');

// Informasi tiap model komunikasi: label tombol, deskripsi skenario, dan tipe log
const MODEL_META = {
  'req-res': {
    label: 'Cek Tarif (Req-Res)',
    accent: '#3b82f6',
    desc: '<b>Request-Response (REST)</b>: Komunikasi dua arah langsung berjalan secara sinkronus.<hr style="border: 1px solid #ffffff1a; margin: 8px 0;"/><i><b>Skenario:</b> Aplikasi pengguna meminta API Server untuk menghitung tarif perjalanan (Cek Harga). Klien harus menunggu terblokir sejenak hingga Server selesai merespons harga akhir.</i>',
    nodes: ['client', 'server'],
    logClass: 'log-entry--send',
  },
  'pub-sub': {
    label: 'Cari Pengemudi (Pub-Sub)',
    accent: '#22c55e',
    desc: '<b>Publish-Subscribe (MQTT)</b>: Komunikasi satu-ke-banyak yang non-blocking melalui event-driven broker.<hr style="border: 1px solid #ffffff1a; margin: 8px 0;"/><i><b>Skenario:</b> Pengguna mencari pengemudi terdekat. Broker menembakkan siaran order ini ke banyak pengemudi sekaligus secara paralel tanpa membuat aplikasi membeku (freeze).</i>',
    nodes: ['client', 'broker', 'd1', 'd2', 'd3'],
    logClass: 'log-entry--recv',
  },
  'queue': {
    label: 'Bayar Ride (Queue)',
    accent: '#eab308',
    desc: '<b>Message Queue (MQTT)</b>: Pengantrean pesan asinkronus antara Produsen dan Konsumen untuk menahan lonjakan beban.<hr style="border: 1px solid #ffffff1a; margin: 8px 0;"/><i><b>Skenario:</b> Proses pembayaran tagihan diserahkan ke antrean Broker. Server pembayar kemudian mengerjakannya secara berurutan sesuai kapasitasnya sendiri. Klien langsung mendapat tiket antrean.</i>',
    nodes: ['client', 'broker', 'server'],
    logClass: 'log-entry--queue',
  },
  'rpc': {
    label: 'Hitung Rute (RPC)',
    accent: '#8b5cf6',
    desc: '<b>RPC (Remote Procedure Call)</b>: Menjalankan fungsi berat di server lain layaknya memanggil fungsi lokal di aplikasi sendiri.<hr style="border: 1px solid #ffffff1a; margin: 8px 0;"/><i><b>Skenario:</b> Algoritma GPS berat dikalkulasi oleh server khusus RPC (Layanan Rute) di belakang layar untuk memisahkan beban kerja dari Server API Utama.</i>',
    nodes: ['client', 'rpc', 'server'],
    logClass: 'log-entry--send',
  },
};

// State yang berubah selama aplikasi berjalan
let metrics = { requests: 0, latencyAvg: 0, latencyTotal: 0, events: 0 };
let isBusy  = false;           // Mencegah klik ganda saat simulasi sedang berjalan
let comparisonHistory = [];    // Riwayat simulasi untuk tabel perbandingan

// Tipe log yang valid dan definisi kartu metrik yang ditampilkan
const LOG_TYPES = { send: 'send', recv: 'recv', queue: 'queue', error: 'error', info: 'info' };
const METRIC_DEFS = [
  { key: 'requests',   label: 'Permintaan', unit: 'total' },
  { key: 'latencyAvg', label: 'Rata RTT',   unit: 'ms'    },
  { key: 'events',     label: 'Event WS',   unit: 'total' },
];

// Buka koneksi WebSocket ke backend Flask-SocketIO
const socket = io(API, { transports: ['websocket'], autoConnect: true });

socket.on('connect', () => {
  setConnected(true);
  log('SocketIO terhubung ✓', 'info');
});

socket.on('disconnect', () => {
  setConnected(false);
  log('SocketIO terputus', 'error');
});

// Event ini diterima saat broker MQTT menyebarkan order ke pengemudi (Pub-Sub)
socket.on('order_broadcast', (data) => {
  metrics.events++;
  updateMetrics();
  log(`[SIARAN] pesanan dari ${data.user_id} @ ${data.location}`, 'recv');

  // Kirim animasi paket dari broker ke setiap pengemudi secara bertahap
  const drivers = parseInt(driverSlider.value, 10) || 3;
  setNodeStatus('broker', 'Distribusi Broadcast', 1000, '#22c55e');
  for (let i = 1; i <= drivers; i++) {
    animatePacket('broker', `d${i}`, '#22c55e', 400 + i * 100);
  }
  pulseNode('broker');
});

// Event ini diterima saat salah satu pengemudi menerima dan merespons order
socket.on('driver_found', (data) => {
  metrics.events++;
  updateMetrics();

  const driverNum = data.driver_id?.split('-')[1];
  const dNode     = `d${driverNum}`;
  log(`[PENGEMUDI DITEMUKAN] ${data.driver_id} ETA ${data.eta_minutes}menit (${data.response_time_ms}ms)`, 'recv');

  if (dNode) {
    pulseNode(dNode);
    setNodeStatus(dNode, `Menuju Lokasi (${data.eta_minutes}m)`, 2000, '#10b981');
  }
});

// Event ini diterima saat worker di backend selesai memproses pembayaran dari antrean
socket.on('payment_processed', (data) => {
  metrics.events++;
  updateMetrics();
  log(`[DIPROSES] order=${data.order_id} status=${data.status}`, 'queue');
  pulseNode('server');
  setNodeStatus('server', 'Berhasil Diproses', 2000, '#10b981');
  animatePacket('broker', 'server', '#eab308', 500);
});

// Saat model diganti, perbarui tampilan kanvas, warna aksen, label, dan deskripsi
modelSelect.addEventListener('change', () => {
  const m = modelSelect.value;
  setModel(m);
  setAccent(m);
  btnText.textContent                       = MODEL_META[m]?.label ?? 'Jalankan';
  modelDesc.innerHTML                       = MODEL_META[m]?.desc  ?? '';
  driverSlider.parentElement.style.display  = m === 'pub-sub' ? 'block' : 'none';
});

// Perbarui angka latensi yang tampil di samping slider
latencySlider.addEventListener('input', () => {
  latencyVal.textContent = latencySlider.value;
});

// Perbarui angka pengemudi dan rebuild node-nya di kanvas
driverSlider.addEventListener('input', () => {
  driverVal.textContent = driverSlider.value;
  setDriverCount(driverSlider.value);
});

triggerBtn.addEventListener('click', () => {
  if (isBusy) return;
  runSimulation();
});

document.getElementById('reset-view-btn')?.addEventListener('click', () => {
  resetView();
});

// Fungsi ini berguna untuk menyiapkan tampilan awal aplikasi saat halaman pertama dibuka
function init() {
  const m = modelSelect.value;
  setDriverCount(driverSlider.value);
  setModel(m);
  setAccent(m);
  modelDesc.innerHTML                       = MODEL_META[m].desc;
  latencyVal.textContent                    = latencySlider.value;
  driverVal.textContent                     = driverSlider.value;
  driverSlider.parentElement.style.display  = m === 'pub-sub' ? 'block' : 'none';
  renderMetrics();
}
init();

// Fungsi ini berguna untuk menjalankan simulasi yang sesuai berdasarkan model yang dipilih
async function runSimulation() {
  const model   = modelSelect.value;
  const latency = parseInt(latencySlider.value, 10);
  const drivers = parseInt(driverSlider.value, 10);

  setBusy(true);
  clearLog();
  log(`▶ Menjalankan [${model}] latensi=${latency}ms pengemudi=${drivers}`, 'info');

  const t0 = performance.now();

  try {
    switch (model) {
      case 'req-res': await runReqRes(latency);          break;
      case 'pub-sub': await runPubSub(latency, drivers);  break;
      case 'queue':   await runQueue(latency);            break;
      case 'rpc':     await runRpc(latency);              break;
    }
  } catch (err) {
    log(`✗ ${err.message}`, 'error');
  } finally {
    // Blok ini selalu jalan, baik sukses maupun gagal, untuk menutup sesi simulasi
    const elapsed = Math.round(performance.now() - t0);
    metrics.requests++;
    metrics.latencyTotal += elapsed;
    metrics.latencyAvg    = Math.round(metrics.latencyTotal / metrics.requests);
    updateMetrics();
    setBusy(false);
    log(`■ Selesai dalam ${elapsed}ms`, 'info');
    addComparisonEntry(model, latency, drivers, elapsed, 'Selesai');
  }
}

// Fungsi ini berguna untuk mensimulasikan pola Request-Response (blocking)
async function runReqRes(latency) {
  log('<strong>→ POST /api/req-res/find-price</strong>', 'send');
  pulseNode('client');
  setNodeStatus('client', 'Mencari Harga...', latency, '#3b82f6');
  animatePacket('client', 'server', '#3b82f6', Math.max(300, latency * 0.6));

  const res = await apiFetch('/api/req-res/find-price', { origin: 'Sudirman', destination: 'Blok M', latency });

  setNodeStatus('server', 'Ditemukan: Rp 25k', 1500, '#10b981');
  animatePacket('server', 'client', '#3b82f6', Math.max(300, latency * 0.6));
  pulseNode('server');

  log(`<strong>← HARGA CALC</strong> Rp ${res.price?.toLocaleString('id-ID')} (${res.response_time_ms}ms)`, 'recv');
}

// Fungsi ini berguna untuk mensimulasikan pola Publish-Subscribe (non-blocking, fan-out)
async function runPubSub(latency, drivers) {
  log(`<strong>→ EMIT find_driver</strong> (drivers=${drivers})`, 'send');
  pulseNode('client');
  setNodeStatus('client', 'Mencari Penjemput', 1500, '#22c55e');
  animatePacket('client', 'broker', '#22c55e', 300);

  // Kirim event ke backend — respons akan datang via socket.on di atas, bukan di sini
  socket.emit('find_driver', { user_id: 'rider-001', location: 'Sudirman', latency, drivers });

  log('  ⋯ menunggu siaran / broadcast respons…', 'info');
  await sleep(latency * drivers * 1.5 + 1000);
}

// Fungsi ini berguna untuk mensimulasikan pola Message Queue (asinkronus, antrean)
async function runQueue(latency) {
  log('<strong>→ POST /api/queue/pay</strong>', 'queue');
  pulseNode('client');
  setNodeStatus('client', 'Bayar Tagihan...', 1500, '#eab308');
  animatePacket('client', 'broker', '#eab308', 300);

  const res = await apiFetch('/api/queue/pay', { order_id: `ord-${Date.now()}`, amount: 25000, latency });

  pulseNode('broker');
  setNodeStatus('broker', `Masuk Antrean #${res.queue_position}`, 2000, '#eab308');
  log(`  masuk antrean pada posisi ${res.queue_position} (${res.status})`, 'queue');
  log('  ⋯ pekerja memproses asinkron…', 'info');
}

// Fungsi ini berguna untuk mensimulasikan pola RPC (delegasi komputasi ke server lain)
async function runRpc(latency) {
  log('<strong>→ POST /api/rpc/calculate-route</strong>', 'send');
  pulseNode('client');
  setNodeStatus('client', 'Koor awal & tujuan...', 1000, '#8b5cf6');
  animatePacket('client', 'rpc', '#8b5cf6', Math.max(200, latency * 0.4));

  const res = await apiFetch('/api/rpc/calculate-route', { origin: 'Sudirman', destination: 'Blok M', latency });

  setNodeStatus('rpc', 'Kalkulasi Rute...', 1000, '#8b5cf6');
  animatePacket('rpc', 'server', '#8b5cf6', 200);
  pulseNode('rpc');

  await sleep(200);

  setNodeStatus('server', 'Simpan Data', 1000, '#10b981');
  animatePacket('server', 'rpc', '#8b5cf6', 200);
  animatePacket('rpc', 'client', '#8b5cf6', Math.max(200, latency * 0.4));
  pulseNode('server');

  const r = res.result;
  setNodeStatus('client', `ETA ${r.eta_minutes}menit`, 2000, '#10b981');
  log(`← Jarak ${r.distance_km}km ETA ${r.eta_minutes}menit (${res.response_time_ms}ms)`, 'recv');
}

// Fungsi ini berguna untuk mengirim HTTP POST ke backend dan mengembalikan JSON-nya
async function apiFetch(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} on ${path}`);
  return response.json();
}

// Fungsi ini berguna untuk menunggu sejumlah milidetik sebelum lanjut
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi ini berguna untuk mengunci atau membuka tombol simulasi
function setBusy(busy) {
  isBusy = busy;
  triggerBtn.disabled = busy;
  btnText.classList.toggle('hidden', busy);
  btnSpinner.classList.toggle('hidden', !busy);
}

// Fungsi ini berguna untuk mengubah tampilan badge koneksi di header
function setConnected(connected) {
  const icon  = connected ? 'check-circle' : 'circle-slash';
  const label = connected ? 'Terhubung' : 'Terputus';
  connBadge.innerHTML = `<i data-lucide="${icon}" style="width:12px;height:12px;margin-bottom:-2px;"></i> ${label}`;
  connBadge.className = `badge badge--${connected ? 'connected' : 'disconnected'}`;
  lucide.createIcons();
}

// Fungsi ini berguna untuk mengubah warna aksen CSS sesuai model yang aktif
function setAccent(model) {
  appMain.setAttribute('data-model', model);
}

// Fungsi ini berguna untuk menambah satu entri ke panel log dengan timestamp
function log(msg, type = 'info') {
  const ts  = new Date().toISOString().slice(11, 23);
  const div = document.createElement('div');
  div.className = `log-entry log-entry--${LOG_TYPES[type] ?? 'info'}`;

  const meta = document.createElement('div');
  meta.className = 'log-meta';
  meta.innerHTML = `<span class="log-time">${ts}</span>`;

  const content = document.createElement('div');
  content.className = 'log-content';
  content.innerHTML = msg; // Pakai innerHTML supaya tag <strong> bisa dirender

  div.appendChild(meta);
  div.appendChild(content);
  sequenceLog.appendChild(div);
  sequenceLog.scrollTop = sequenceLog.scrollHeight;
}

function clearLog() {
  sequenceLog.innerHTML = '';
}

// Fungsi ini berguna untuk membuat kartu-kartu metrik dari nol
function renderMetrics() {
  metricsWidget.innerHTML = '';
  METRIC_DEFS.forEach(def => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.id        = `metric-${def.key}`;
    card.innerHTML = `
      <div class="metric-label">${def.label}</div>
      <div class="metric-value">${metrics[def.key] ?? 0}</div>
      <div class="metric-unit">${def.unit}</div>
    `;
    metricsWidget.appendChild(card);
  });
}

// Fungsi ini berguna untuk memperbarui nilai yang tampil di kartu metrik
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

// Fungsi ini berguna untuk mencatat hasil simulasi ke tabel riwayat perbandingan
function addComparisonEntry(model, latency, drivers, elapsed, status) {
  const config = `${latency}ms / ${model === 'pub-sub' ? `${drivers}d` : '-'}`;

  // Taruh di depan supaya yang terbaru selalu muncul di baris pertama
  comparisonHistory.unshift({ model: MODEL_META[model]?.label || model, config, time: elapsed, status });

  // Batasi riwayat di 20 entri saja
  if (comparisonHistory.length > 20) comparisonHistory.pop();

  if (compTbody) {
    compTbody.innerHTML = '';
    comparisonHistory.forEach(entry => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      tr.style.animation    = 'ticketIn 0.3s ease-out forwards';
      tr.innerHTML = `
        <td style="padding: 8px; color: #fff;">${entry.model}</td>
        <td style="padding: 8px; color: #9CA3AF;">${entry.config}</td>
        <td style="padding: 8px; color: #F59E0B;">${entry.time}ms</td>
        <td style="padding: 8px; color: #10B981;">${entry.status}</td>
      `;
      compTbody.appendChild(tr);
    });
  }
}

renderMetrics();
