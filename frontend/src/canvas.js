/**
 * canvas.js — topology node/edge drawing + anime.js packet animations
 */
import { animate, stagger } from 'animejs';

const DPR = window.devicePixelRatio || 1;

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('topology-canvas');
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

// ─── Node definitions (relative 0–1 coords, resolved on resize) ─────────────
const NODE_DEFS = {
  client: { label: 'Klien\n(Pengguna)',   color: '#3b82f6', x: 0.18, y: 0.50 },
  server: { label: 'Server API',        color: '#22c55e', x: 0.50, y: 0.28 },
  broker: { label: 'Message Broker',   color: '#eab308', x: 0.50, y: 0.72 },
  rpc:    { label: 'Layanan RPC',       color: '#8b5cf6', x: 0.50, y: 0.50 },
  d1:     { label: 'Pengemudi 1',          color: '#8b5cf6', x: 0.82, y: 0.22 },
  d2:     { label: 'Pengemudi 2',          color: '#8b5cf6', x: 0.82, y: 0.50 },
  d3:     { label: 'Pengemudi 3',          color: '#8b5cf6', x: 0.82, y: 0.78 },
};

// Edges depend on model
const EDGES = {
  'req-res': [['client','server']],
  'pub-sub': [['client','broker'],['broker','d1'],['broker','d2'],['broker','d3']],
  'queue':   [['client','broker'],['broker','server']],
  'rpc':     [['client','rpc'],['rpc','server']],
};

const VISIBLE_NODES = {
  'req-res': ['client','server'],
  'pub-sub': ['client','broker','d1','d2','d3'],
  'queue':   ['client','broker','server'],
  'rpc':     ['client','rpc','server'],
};

const NODE_R = 28;
const PACKET_R = 6;

let currentModel = 'req-res';
let w = 0, h = 0;

// Packets in flight: [{x,y,color,alpha}]
let packets = [];

export function setModel(model) {
  currentModel = model;
  redraw();
}

function resolvePos(def) {
  return { x: def.x * w, y: def.y * h };
}

// ─── resize ─────────────────────────────────────────────────────────────────
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  canvas.width  = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(DPR, DPR);
  redraw();
}

window.addEventListener('resize', resize);
resize();

// ─── draw ────────────────────────────────────────────────────────────────────
function redraw() {
  ctx.clearRect(0, 0, w, h);
  drawGrid();

  const edges  = EDGES[currentModel] || [];
  const visible = VISIBLE_NODES[currentModel] || [];

  drawEdges(edges, visible);
  drawNodes(visible);
  drawPackets();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  const step = 48;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawEdges(edges, visible) {
  edges.forEach(([a, b]) => {
    const pa = resolvePos(NODE_DEFS[a]);
    const pb = resolvePos(NODE_DEFS[b]);
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.restore();
  });
}

function drawNodes(visible) {
  visible.forEach(key => {
    const def = NODE_DEFS[key];
    const { x, y } = resolvePos(def);
    const col = def.color;

    // Glow
    const grd = ctx.createRadialGradient(x, y, 0, x, y, NODE_R * 2.5);
    grd.addColorStop(0, col + '30');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, NODE_R * 2.5, 0, Math.PI * 2); ctx.fill();

    // Ring
    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, NODE_R, 0, Math.PI * 2); ctx.stroke();

    // Fill
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, NODE_R - 1, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = col;
    ctx.font = `600 11px Geist, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = def.label.split('\n');
    const lineH = 14;
    const offsetY = -(lines.length - 1) * lineH / 2;
    lines.forEach((line, i) => ctx.fillText(line, x, y + offsetY + i * lineH));
  });
}

function drawPackets() {
  packets.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, PACKET_R * 2);
    grd.addColorStop(0, p.color);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(p.x, p.y, PACKET_R * 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, PACKET_R * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// ─── Animate a packet from nodeA → nodeB ────────────────────────────────────
export function animatePacket(fromKey, toKey, color = '#58a6ff', durationMs = 600) {
  const from = resolvePos(NODE_DEFS[fromKey] || NODE_DEFS['client']);
  const to   = resolvePos(NODE_DEFS[toKey]   || NODE_DEFS['server']);

  const packet = { x: from.x, y: from.y, color, alpha: 1 };
  packets.push(packet);

  animate(packet, {
    x: to.x,
    y: to.y,
    ease: 'inOutQuad',
    duration: durationMs,
    onUpdate: redraw,
    onComplete: () => {
      // fade out
      animate(packet, {
        alpha: 0,
        duration: 200,
        ease: 'outQuad',
        onUpdate: redraw,
        onComplete: () => { packets.splice(packets.indexOf(packet), 1); redraw(); },
      });
    },
  });
}

// ─── Pulse a node ────────────────────────────────────────────────────────────
export function pulseNode(key) {
  const def = NODE_DEFS[key];
  if (!def) return;
  const { x, y } = resolvePos(def);
  const ring = { r: NODE_R, alpha: 0.8 };

  function drawRing() {
    ctx.save();
    ctx.globalAlpha = ring.alpha;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, ring.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    redraw();
  }

  animate(ring, {
    r: NODE_R * 2.5,
    alpha: 0,
    duration: 500,
    ease: 'outQuad',
    onUpdate: drawRing,
  });
}
