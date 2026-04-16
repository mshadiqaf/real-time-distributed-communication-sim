/*
  canvas.js mengelola semua yang terjadi di kanvas dan node-node topologi.
  Kita pakai dua pendekatan: kanvas untuk gambar garis koneksi dan paket bergerak,
  sementara node-nya sendiri dibuat sebagai elemen HTML supaya bisa pakai ikon Lucide.
*/
import { animate } from 'animejs';

// Ini supaya tampilan kanvas tetap tajam di layar HiDPI / Retina
const DPR = window.devicePixelRatio || 1;

const canvas = document.getElementById('topology-canvas');
const ctx = canvas.getContext('2d');

// Definisi semua node yang mungkin muncul di topologi.
// Koordinat x dan y pakai skala 0–1 supaya bisa menyesuaikan ukuran layar.
const NODE_DEFS = {
  client: { label: 'Klien\n(Pengguna)', color: '#3b82f6', x: 0.18, y: 0.50, icon: 'user'   },
  server: { label: 'Server API',        color: '#10b981', x: 0.50, y: 0.28, icon: 'server' },
  broker: { label: 'Message Broker',    color: '#f59e0b', x: 0.50, y: 0.72, icon: 'route'  },
  rpc:    { label: 'Layanan RPC',       color: '#8b5cf6', x: 0.50, y: 0.50, icon: 'cpu'    },
};

// Garis koneksi yang ditampilkan untuk setiap model komunikasi
const EDGES = {
  'req-res': [['client', 'server']],
  'pub-sub': [['client', 'broker']],   // edge ke pengemudi ditambah otomatis
  'queue':   [['client', 'broker'], ['broker', 'server']],
  'rpc':     [['client', 'rpc'],   ['rpc', 'server']],
};

// Node mana saja yang muncul untuk setiap model
const VISIBLE_NODES = {
  'req-res': ['client', 'server'],
  'pub-sub': ['client', 'broker'],     // node pengemudi ditambah otomatis
  'queue':   ['client', 'broker', 'server'],
  'rpc':     ['client', 'rpc', 'server'],
};

const PACKET_R = 4; // Ukuran radius paket data yang bergerak di kanvas

let currentModel = 'req-res';
let w = 0, h = 0;
let packets = []; // Daftar paket yang sedang bergerak saat ini

// --- INTERACTION STATE ---
let scale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

const section = document.getElementById('canvas-section');

function initInteraction() {
  if (!section) return;

  section.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    section.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    redraw();
    updateDOMNodes();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    if (section) section.style.cursor = 'crosshair';
  });

  section.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const factor = Math.pow(1.1, -e.deltaY / 100);
    
    // Hitung titik zoom (posisi mouse relatif terhadap section)
    const rect = section.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Logika "Zoom to Mouse"
    const newScale = Math.min(Math.max(scale * factor, 0.5), 5); // Batasi zoom 0.5x - 5x
    const actualFactor = newScale / scale;

    panX = mouseX - (mouseX - panX) * actualFactor;
    panY = mouseY - (mouseY - panY) * actualFactor;
    scale = newScale;

    redraw();
    updateDOMNodes();
  }, { passive: false });
}

initInteraction();

export function resetView() {
  scale = 1;
  panX = 0;
  panY = 0;
  redraw();
  updateDOMNodes();
}

// Fungsi ini berguna untuk mengganti model komunikasi aktif dan memperbarui tampilan
export function setModel(model) {
  currentModel = model;
  const container = document.getElementById('topology-nodes');
  if (container) container.innerHTML = ''; // Kosongkan agar di-generate ulang dengan model baru
  redraw();
  updateDOMNodes();
}

// Fungsi ini berguna untuk menambah atau mengurangi node pengemudi secara dinamis
// sesuai angka yang dipilih di slider. Node lama dihapus dulu, lalu dibuat ulang.
export function setDriverCount(count) {
  const num = parseInt(count, 10);
  if (isNaN(num)) return;

  // Hapus semua node pengemudi yang ada sebelumnya
  Object.keys(NODE_DEFS).forEach(k => {
    if (k.startsWith('d') && !isNaN(k.slice(1))) delete NODE_DEFS[k];
  });

  EDGES['pub-sub']         = [['client', 'broker']];
  VISIBLE_NODES['pub-sub'] = ['client', 'broker'];

  // Bagi posisi vertikal pengemudi secara merata di 80% tinggi kanvas
  const range  = 0.8;
  const stepY  = range / (num + 1);
  const startY = 0.1 + stepY;

  for (let i = 1; i <= num; i++) {
    const dKey = `d${i}`;
    NODE_DEFS[dKey] = {
      label: `Pengemudi ${i}`,
      color: '#8b5cf6',
      x: 0.82,
      y: startY + (i - 1) * stepY,
      icon: 'car',
    };
    EDGES['pub-sub'].push(['broker', dKey]);
    VISIBLE_NODES['pub-sub'].push(dKey);
  }

  redraw();
  updateDOMNodes();
}

// Fungsi ini berguna untuk mengubah koordinat relatif (0–1) menjadi piksel nyata
function resolvePos(def) {
  return { x: def.x * w, y: def.y * h };
}

// Fungsi ini berguna untuk menyesuaikan ukuran kanvas setiap kali jendela di-resize
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  w = rect.width;
  h = rect.height;

  canvas.width        = w * DPR;
  canvas.height       = h * DPR;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(DPR, DPR);

  redraw();
  updateDOMNodes();
}

window.addEventListener('resize', resize);
// Delay kecil supaya browser sempat menghitung layout sebelum kanvas digambar
setTimeout(() => resize(), 100);

// Fungsi ini berguna untuk membuat ulang semua node sebagai elemen HTML di atas kanvas
function updateDOMNodes() {
  const container = document.getElementById('topology-nodes');
  if (!container) return;

  // Terapkan transformasi pada container utama agar semua node ikut bergerak/zoom
  container.style.transformOrigin = '0 0';
  container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;

  // Jika belum di-generate, buat elemennya (hanya dipanggil saat model berubah)
  // Namun kita tetap panggil updateDOMNodes saat pan/zoom untuk mengupdate transform
  if (container.children.length === 0) {
    const visible = VISIBLE_NODES[currentModel] || [];
    visible.forEach(key => {
      const def = NODE_DEFS[key];
      const pos = resolvePos(def);

      const div = document.createElement('div');
      div.className = 'node-element';
      div.id        = `node-dom-${key}`;
      div.style.left = `${pos.x}px`;
      div.style.top  = `${pos.y}px`;
      div.style.setProperty('--node-color', def.color);

      div.innerHTML = `
        <div class="node-icon-wrapper">
          <i data-lucide="${def.icon}" class="node-icon"></i>
        </div>
        <div class="node-label">${def.label}</div>
      `;

      container.appendChild(div);
    });
    if (window.lucide) window.lucide.createIcons();
  }
}

// Fungsi ini berguna untuk menghapus kanvas dan menggambar ulang garis serta paket
function redraw() {
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // Reset ke koordinat layar murni
  ctx.clearRect(0, 0, w * DPR, h * DPR);
  
  // Terapkan transformasi tampilan (zoom & pan)
  ctx.translate(panX, panY);
  ctx.scale(scale, scale);

  drawEdges(EDGES[currentModel] || []);
  drawPackets();
  ctx.restore();
}

// Fungsi ini berguna untuk menggambar garis putus-putus antar node di kanvas
function drawEdges(edges) {
  edges.forEach(([a, b]) => {
    const pa = resolvePos(NODE_DEFS[a]);
    const pb = resolvePos(NODE_DEFS[b]);

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.restore();
  });
}

// Fungsi ini berguna untuk menggambar semua paket data yang sedang bergerak
function drawPackets() {
  packets.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;

    // Efek glow radial di sekitar paket
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, PACKET_R * 3);
    grd.addColorStop(0, p.color);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PACKET_R * 3, 0, Math.PI * 2);
    ctx.fill();

    // Titik putih kecil di tengah sebagai inti paket
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PACKET_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

// Fungsi ini berguna untuk menganimasikan paket data yang "terbang" dari satu node ke node lain
export function animatePacket(fromKey, toKey, color = '#58a6ff', durationMs = 600) {
  const from = resolvePos(NODE_DEFS[fromKey] || NODE_DEFS['client']);
  const to   = resolvePos(NODE_DEFS[toKey]   || NODE_DEFS['server']);

  const packet = { x: from.x, y: from.y, color, alpha: 1 };
  packets.push(packet);

  animate(packet, {
    x: to.x, y: to.y,
    ease: 'inOutQuad',
    duration: durationMs,
    onUpdate: redraw,
    onComplete: () => {
      // Setelah tiba, paket memudar lalu dihapus dari daftar
      animate(packet, {
        alpha: 0,
        duration: 200,
        ease: 'outQuad',
        onUpdate: redraw,
        onComplete: () => {
          packets.splice(packets.indexOf(packet), 1);
          redraw();
        },
      });
    },
  });
}

// Fungsi ini berguna untuk memberikan efek kilat pada node supaya terlihat "aktif"
export function pulseNode(key) {
  const el = document.getElementById(`node-dom-${key}`);
  if (!el) return;

  el.classList.remove('pulse');
  void el.offsetWidth; // Paksa browser reset animasi sebelum ditambahkan lagi
  el.classList.add('pulse');

  setTimeout(() => { if (el) el.classList.remove('pulse'); }, 400);
}

// Fungsi ini berguna untuk menampilkan label status kecil di atas node sementara waktu
export function setNodeStatus(key, text, durationMs = 2000, color = null) {
  const el = document.getElementById(`node-dom-${key}`);
  if (!el) return;

  // Hapus label lama kalau masih ada
  const existing = el.querySelector('.node-status');
  if (existing) existing.remove();

  const status = document.createElement('div');
  status.className  = 'node-status';
  status.textContent = text;
  if (color) {
    status.style.borderColor = color;
    status.style.color       = color;
  }

  el.appendChild(status);
  void status.offsetWidth; // Perlu reflow supaya transisi CSS bisa berjalan
  status.classList.add('show');

  // Hilangkan label setelah durasi habis
  setTimeout(() => {
    if (status && status.parentElement) {
      status.classList.remove('show');
      setTimeout(() => status.remove(), 300);
    }
  }, durationMs);
}
