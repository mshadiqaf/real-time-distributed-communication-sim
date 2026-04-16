# Real-Time Distributed Communication Simulation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive browser-based simulation that visualises four distributed communication models (Request-Response, Pub-Sub, Message Queue, RPC) using a Ride-Hailing case study, with a Python/Flask backend and a Vite + Vanilla JS frontend.

**Architecture:** Python Flask serves four isolated route/SocketIO handlers — one per communication model. A Vite-bundled frontend connects to the Flask server via both REST and SocketIO, renders an animated Canvas topology of Client → Server → Driver nodes, and displays a live Sequence Log and Metrics Widget. All state is in-memory; no database is required.

**Tech Stack:** Python 3.11+, Flask 3, Flask-SocketIO 5, Vite 5, Vanilla JavaScript (ES modules), Anime.js 3, Tailwind CSS 3 (CDN), `pytest` + `pytest-flask` for backend tests.

---

## Prerequisites (read before starting)

- Python ≥ 3.11, Node ≥ 18, npm ≥ 9 installed.
- Work in the repo root: `c:\Users\mshadiqaf\Codes\real-time-distributed-communication-sim\`.
- All commands are run from the repo root unless stated otherwise.
- Backend lives in `backend/`, frontend in `frontend/`.
- Backend tests use `pytest`. Run them with `cd backend && pytest -v`.
- Frontend dev server runs on `http://localhost:5173`; Flask on `http://localhost:5000`.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `backend/` (directory)
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `frontend/` (directory, Vite scaffold)
- Create: `.gitignore`
- Create: `README.md`

---

### Step 1: Initialise git

```bash
git init
```
Expected: `Initialized empty Git repository`

---

### Step 2: Create `.gitignore`

```
# Python
__pycache__/
*.pyc
.venv/
backend/.env

# Node
node_modules/
frontend/dist/
frontend/.env

# IDE
.vscode/
.idea/
```

---

### Step 3: Create backend directory & `requirements.txt`

```
flask==3.0.3
flask-socketio==5.3.6
flask-cors==4.0.1
eventlet==0.36.1
pytest==8.2.2
pytest-flask==1.3.0
```

Install:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```
Expected: all packages installed without errors.

---

### Step 4: Create `backend/app/__init__.py` (empty for now)

```python
# placeholder — filled in Task 2
```

---

### Step 5: Scaffold Vite frontend

```bash
cd frontend
npm create vite@latest . -- --template vanilla
npm install
npm install animejs
```
Expected: Vite project created, `package.json` present.

---

### Step 6: Add Tailwind CSS via CDN in `frontend/index.html`

Replace `<head>` content with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Distributed Comm Sim</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
```

---

### Step 7: Commit

```bash
git add .
git commit -m "chore: project scaffolding — backend venv, vite frontend, gitignore"
```

---

## Task 2: Flask Application Core & Health Check

**Files:**
- Modify: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/run.py`
- Create: `backend/tests/test_health.py`

---

### Step 1: Write failing test `backend/tests/test_health.py`

```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app({"TESTING": True})
    with app.test_client() as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
```

Run:
```bash
cd backend && .venv\Scripts\activate && pytest tests/test_health.py -v
```
Expected: **FAIL** — `ImportError: cannot import name 'create_app'`

---

### Step 2: Implement `backend/app/__init__.py`

```python
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

socketio = SocketIO()

def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object("app.config.DefaultConfig")
    if config_overrides:
        app.config.update(config_overrides)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app, cors_allowed_origins="*", async_mode="eventlet")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app
```

---

### Step 3: Implement `backend/app/config.py`

```python
class DefaultConfig:
    SECRET_KEY = "dev-secret-change-me"
    SIMULATE_LATENCY_MS = 500   # default network delay in milliseconds
    DRIVER_COUNT = 3             # default number of driver nodes
```

---

### Step 4: Implement `backend/run.py`

```python
from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
```

---

### Step 5: Run test — verify it PASSES

```bash
pytest tests/test_health.py -v
```
Expected: **PASS** `test_health_check`

---

### Step 6: Commit

```bash
git add backend/
git commit -m "feat: flask app factory with health endpoint"
```

---

## Task 3: Communication Model 1 — Request-Response (REST)

**Behaviour:** Client POSTs to `/api/req-res/find-price`. Flask sleeps for the configured latency (simulating driver pricing), then returns a JSON response. The UI is *blocked* (loading state) until the response arrives.

**Files:**
- Create: `backend/app/routes/req_res.py`
- Modify: `backend/app/__init__.py`
- Create: `backend/tests/test_req_res.py`

---

### Step 1: Write failing test `backend/tests/test_req_res.py`

```python
import pytest, time
from app import create_app

@pytest.fixture
def client():
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 0})
    with app.test_client() as c:
        yield c

def test_find_price_returns_price(client):
    res = client.post("/api/req-res/find-price", json={"origin": "A", "destination": "B"})
    assert res.status_code == 200
    data = res.get_json()
    assert "price" in data
    assert "response_time_ms" in data
    assert isinstance(data["price"], (int, float))

def test_find_price_blocking_delay(client):
    # With 100ms latency, response_time_ms should be >= 100
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 100})
    with app.test_client() as c:
        start = time.time()
        res = c.post("/api/req-res/find-price", json={"origin": "A", "destination": "B"})
        elapsed = (time.time() - start) * 1000
    assert elapsed >= 100
```

Run:
```bash
pytest tests/test_req_res.py -v
```
Expected: **FAIL** — 404 Not Found

---

### Step 2: Implement `backend/app/routes/req_res.py`

```python
import time, random
from flask import Blueprint, request, jsonify, current_app

req_res_bp = Blueprint("req_res", __name__, url_prefix="/api/req-res")

@req_res_bp.post("/find-price")
def find_price():
    data = request.get_json(silent=True) or {}
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)

    t_start = time.perf_counter()
    time.sleep(latency_ms / 1000)          # blocking sleep — simulates sync blocking

    price = round(random.uniform(10_000, 50_000), -3)   # IDR
    t_end = time.perf_counter()

    return jsonify({
        "model": "request-response",
        "origin": data.get("origin", "?"),
        "destination": data.get("destination", "?"),
        "price": price,
        "response_time_ms": round((t_end - t_start) * 1000, 2),
    })
```

---

### Step 3: Register blueprint in `backend/app/__init__.py`

Add inside `create_app`, after CORS:

```python
    from app.routes.req_res import req_res_bp
    app.register_blueprint(req_res_bp)
```

---

### Step 4: Run tests — verify PASS

```bash
pytest tests/test_req_res.py -v
```
Expected: **PASS** both tests.

---

### Step 5: Commit

```bash
git add backend/app/routes/req_res.py backend/app/__init__.py backend/tests/test_req_res.py
git commit -m "feat: request-response REST endpoint with simulated blocking latency"
```

---

## Task 4: Communication Model 2 — Publish-Subscribe (WebSocket)

**Behaviour:** Client emits a `find_driver` SocketIO event. Server broadcasts an `order_broadcast` event to **all** connected workers (non-blocking for the emitting client). Workers reply with `driver_found` individually.

**Files:**
- Create: `backend/app/routes/pub_sub.py`
- Modify: `backend/app/__init__.py`
- Create: `backend/tests/test_pub_sub.py`

---

### Step 1: Write failing test `backend/tests/test_pub_sub.py`

```python
import pytest
from app import create_app, socketio as sio_instance

@pytest.fixture
def socket_client():
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 0, "DRIVER_COUNT": 2})
    client = sio_instance.test_client(app)
    yield client
    client.disconnect()

def test_find_driver_broadcasts(socket_client):
    socket_client.emit("find_driver", {"user_id": "user-1", "location": "Sudirman"})
    received = socket_client.get_received()
    event_names = [r["name"] for r in received]
    assert "order_broadcast" in event_names

def test_driver_found_emitted_per_driver(socket_client):
    socket_client.emit("find_driver", {"user_id": "user-1", "location": "Sudirman"})
    received = socket_client.get_received()
    driver_events = [r for r in received if r["name"] == "driver_found"]
    assert len(driver_events) == 2   # DRIVER_COUNT = 2
```

Run:
```bash
pytest tests/test_pub_sub.py -v
```
Expected: **FAIL** — event not found.

---

### Step 2: Implement `backend/app/routes/pub_sub.py`

```python
import time, random
from flask import current_app
from flask_socketio import emit
from app import socketio

@socketio.on("find_driver")
def handle_find_driver(data):
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)
    driver_count = current_app.config.get("DRIVER_COUNT", 3)

    # Immediately broadcast to all — client is NOT blocked
    emit("order_broadcast", {
        "model": "pub-sub",
        "user_id": data.get("user_id"),
        "location": data.get("location"),
        "timestamp_ms": round(time.time() * 1000),
    }, broadcast=True)

    # Simulate each driver responding asynchronously
    for i in range(driver_count):
        time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
        emit("driver_found", {
            "driver_id": f"driver-{i+1}",
            "eta_minutes": random.randint(2, 15),
            "response_time_ms": round(latency_ms * random.uniform(0.5, 1.5), 2),
        }, broadcast=True)
```

---

### Step 3: Register handler in `backend/app/__init__.py`

```python
    import app.routes.pub_sub  # registers socketio event handlers
```

---

### Step 4: Run tests — verify PASS

```bash
pytest tests/test_pub_sub.py -v
```
Expected: **PASS** both tests.

---

### Step 5: Commit

```bash
git add backend/app/routes/pub_sub.py backend/app/__init__.py backend/tests/test_pub_sub.py
git commit -m "feat: pub-sub model via flask-socketio broadcast"
```

---

## Task 5: Communication Model 3 — Message Queue

**Behaviour:** Client POSTs a payment to `/api/queue/pay`. Flask puts it into a `queue.Queue`. A singleton background thread processes items one-by-one, emitting `payment_processed` SocketIO events. Under load, requests queue — not crash.

**Files:**
- Create: `backend/app/routes/message_queue.py`
- Modify: `backend/app/__init__.py`
- Create: `backend/tests/test_message_queue.py`

---

### Step 1: Write failing test `backend/tests/test_message_queue.py`

```python
import pytest
from app import create_app, socketio as sio_instance

@pytest.fixture
def ctx():
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 0})
    client = app.test_client()
    socket_client = sio_instance.test_client(app)
    yield client, socket_client
    socket_client.disconnect()

def test_enqueue_returns_202(ctx):
    http_client, _ = ctx
    res = http_client.post("/api/queue/pay", json={"order_id": "ord-001", "amount": 25000})
    assert res.status_code == 202
    data = res.get_json()
    assert data["status"] == "queued"
    assert "queue_position" in data

def test_multiple_requests_dont_crash(ctx):
    http_client, _ = ctx
    for i in range(5):
        res = http_client.post("/api/queue/pay", json={"order_id": f"ord-{i}", "amount": 10000 * i})
        assert res.status_code == 202
```

Run:
```bash
pytest tests/test_message_queue.py -v
```
Expected: **FAIL** — 404.

---

### Step 2: Implement `backend/app/routes/message_queue.py`

```python
import queue, threading, time
from flask import Blueprint, request, jsonify, current_app
from app import socketio

message_queue_bp = Blueprint("message_queue", __name__, url_prefix="/api/queue")

_q: queue.Queue = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()

def _worker():
    while True:
        item = _q.get()
        latency_ms = item.get("latency_ms", 500)
        time.sleep(latency_ms / 1000)
        socketio.emit("payment_processed", {
            "order_id": item["order_id"],
            "amount": item["amount"],
            "status": "SUCCESS",
            "processed_at_ms": round(time.time() * 1000),
        })
        _q.task_done()

def _ensure_worker_running():
    global _worker_started
    with _worker_lock:
        if not _worker_started:
            t = threading.Thread(target=_worker, daemon=True)
            t.start()
            _worker_started = True

@message_queue_bp.post("/pay")
def enqueue_payment():
    _ensure_worker_running()
    data = request.get_json(silent=True) or {}
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)
    item = {
        "order_id": data.get("order_id", "unknown"),
        "amount": data.get("amount", 0),
        "latency_ms": latency_ms,
    }
    _q.put(item)
    return jsonify({"status": "queued", "queue_position": _q.qsize()}), 202
```

---

### Step 3: Register blueprint in `backend/app/__init__.py`

```python
    from app.routes.message_queue import message_queue_bp
    app.register_blueprint(message_queue_bp)
```

---

### Step 4: Run tests — verify PASS

```bash
pytest tests/test_message_queue.py -v
```
Expected: **PASS** both tests.

---

### Step 5: Commit

```bash
git add backend/app/routes/message_queue.py backend/app/__init__.py backend/tests/test_message_queue.py
git commit -m "feat: message queue model with background worker thread"
```

---

## Task 6: Communication Model 4 — Remote Procedure Call (RPC)

**Behaviour:** Client POSTs to `/api/rpc/calculate-route`. Flask calls an internal Python function `RouteService.calculate()` — simulating an inter-module RPC — and returns a structured result.

**Files:**
- Create: `backend/app/services/route_service.py`
- Create: `backend/app/routes/rpc.py`
- Modify: `backend/app/__init__.py`
- Create: `backend/tests/test_rpc.py`

---

### Step 1: Write failing test `backend/tests/test_rpc.py`

```python
import pytest
from app import create_app
from app.services.route_service import RouteService

def test_route_service_returns_distance_and_eta():
    result = RouteService.calculate(origin="Sudirman", destination="Blok M", latency_ms=0)
    assert "distance_km" in result
    assert "eta_minutes" in result
    assert "procedure" in result
    assert result["procedure"] == "RouteService.calculate"

@pytest.fixture
def client():
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 0})
    with app.test_client() as c:
        yield c

def test_rpc_endpoint(client):
    res = client.post("/api/rpc/calculate-route", json={"origin": "Sudirman", "destination": "Blok M"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["model"] == "rpc"
    assert "result" in data
```

Run:
```bash
pytest tests/test_rpc.py -v
```
Expected: **FAIL** — `ImportError`

---

### Step 2: Implement `backend/app/services/route_service.py`

```python
import time, random

class RouteService:
    @staticmethod
    def calculate(origin: str, destination: str, latency_ms: int = 500) -> dict:
        t_start = time.perf_counter()
        time.sleep(latency_ms / 1000)

        distance_km = round(random.uniform(1.5, 30.0), 1)
        eta_minutes = round(distance_km / 0.5)

        t_end = time.perf_counter()
        return {
            "procedure": "RouteService.calculate",
            "origin": origin,
            "destination": destination,
            "distance_km": distance_km,
            "eta_minutes": eta_minutes,
            "rpc_latency_ms": round((t_end - t_start) * 1000, 2),
        }
```

---

### Step 3: Implement `backend/app/routes/rpc.py`

```python
from flask import Blueprint, request, jsonify, current_app
from app.services.route_service import RouteService

rpc_bp = Blueprint("rpc", __name__, url_prefix="/api/rpc")

@rpc_bp.post("/calculate-route")
def calculate_route():
    data = request.get_json(silent=True) or {}
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)
    result = RouteService.calculate(
        origin=data.get("origin", "A"),
        destination=data.get("destination", "B"),
        latency_ms=latency_ms,
    )
    return jsonify({"model": "rpc", "result": result})
```

---

### Step 4: Register blueprint in `backend/app/__init__.py`

```python
    from app.routes.rpc import rpc_bp
    app.register_blueprint(rpc_bp)
```

---

### Step 5: Run tests — verify PASS

```bash
pytest tests/test_rpc.py -v
```
Expected: **PASS** all 3 tests.

---

### Step 6: Commit

```bash
git add backend/app/services/ backend/app/routes/rpc.py backend/app/__init__.py backend/tests/test_rpc.py
git commit -m "feat: rpc model with RouteService inter-module call"
```

---

## Task 7: Frontend — Canvas Topology & Animation

**Goal:** Render a 2D canvas with Client, Server, and Driver nodes. Animate a glowing data-packet travelling Client→Server→Driver when a simulation is triggered.

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/src/canvas.js`
- Modify: `frontend/src/main.js`

---

### Step 1: Design `frontend/index.html` layout

Replace `<body>` with:

```html
<body class="bg-gray-950 text-white min-h-screen flex flex-col">
  <header class="p-4 border-b border-gray-800">
    <h1 class="text-xl font-bold tracking-wide">🚀 Distributed Comm Sim — Ride-Hailing</h1>
  </header>
  <main class="flex flex-1 gap-4 p-4">
    <section id="canvas-section" class="flex-1 bg-gray-900 rounded-xl relative">
      <canvas id="topology-canvas" class="w-full h-full rounded-xl"></canvas>
    </section>
    <aside class="w-80 flex flex-col gap-4">
      <div id="control-panel" class="bg-gray-900 rounded-xl p-4 space-y-4">
        <h2 class="font-semibold text-gray-300 uppercase text-xs tracking-widest">Control Panel</h2>
        <div>
          <label class="text-sm text-gray-400">Communication Model</label>
          <select id="model-select" class="mt-1 w-full bg-gray-800 rounded-lg p-2 text-white text-sm">
            <option value="req-res">Request-Response (REST)</option>
            <option value="pub-sub">Publish-Subscribe (WebSocket)</option>
            <option value="queue">Message Queue</option>
            <option value="rpc">RPC (Route Calculation)</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-400">Network Latency: <span id="latency-val">500</span> ms</label>
          <input id="latency-slider" type="range" min="0" max="2000" value="500" class="w-full accent-indigo-500" />
        </div>
        <div>
          <label class="text-sm text-gray-400">Driver Count: <span id="driver-val">3</span></label>
          <input id="driver-slider" type="range" min="1" max="10" value="3" class="w-full accent-emerald-500" />
        </div>
        <button id="trigger-btn"
          class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors">
          🚗 Pesan Ride
        </button>
      </div>
      <div id="metrics-panel" class="bg-gray-900 rounded-xl p-4 flex-1 overflow-y-auto space-y-3">
        <h2 class="font-semibold text-gray-300 uppercase text-xs tracking-widest">Sequence Log & Metrics</h2>
        <div id="sequence-log" class="space-y-1 text-xs font-mono text-gray-300"></div>
        <div id="metrics-widget" class="mt-4 space-y-2"></div>
      </div>
    </aside>
  </main>
  <script type="module" src="/src/main.js"></script>
</body>
```

---

### Step 2: Implement `frontend/src/canvas.js`

```javascript
import anime from "animejs";

const NODE_RADIUS = 28;

export class TopologyCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.nodes = this._buildNodes();
    this._drawStatic();
  }

  _buildNodes() {
    const W = this.canvas.width, H = this.canvas.height;
    return {
      client:  { x: W * 0.12, y: H * 0.5,  label: "Client",  color: "#6366f1" },
      server:  { x: W * 0.5,  y: H * 0.5,  label: "Server",  color: "#f59e0b" },
      drivers: Array.from({ length: 3 }, (_, i) => ({
        x: W * 0.88,
        y: H * (0.25 + i * 0.25),
        label: `Driver ${i + 1}`,
        color: "#10b981",
      })),
    };
  }

  _drawStatic() {
    const { ctx, nodes } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1.5;
    nodes.drivers.forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(nodes.server.x, nodes.server.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(nodes.client.x, nodes.client.y);
    ctx.lineTo(nodes.server.x, nodes.server.y);
    ctx.stroke();
    ctx.setLineDash([]);
    [nodes.client, nodes.server, ...nodes.drivers].forEach((n) => this._drawNode(n));
  }

  _drawNode(node) {
    const { ctx } = this;
    const grd = ctx.createRadialGradient(node.x, node.y, 4, node.x, node.y, NODE_RADIUS * 1.8);
    grd.addColorStop(0, node.color + "44");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y + NODE_RADIUS + 16);
  }

  animatePacket(fromNode, toNode, color = "#fff") {
    return new Promise((resolve) => {
      const packet = { x: fromNode.x, y: fromNode.y };
      anime({
        targets: packet,
        x: toNode.x,
        y: toNode.y,
        duration: 600,
        easing: "easeInOutQuad",
        update: () => {
          this._drawStatic();
          this.ctx.fillStyle = color;
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 18;
          this.ctx.beginPath();
          this.ctx.arc(packet.x, packet.y, 8, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        },
        complete: resolve,
      });
    });
  }

  getNodes() { return this.nodes; }

  updateDriverCount(n) {
    const W = this.canvas.width, H = this.canvas.height;
    this.nodes.drivers = Array.from({ length: n }, (_, i) => ({
      x: W * 0.88,
      y: H * (0.15 + (i / Math.max(n - 1, 1)) * 0.7),
      label: `Driver ${i + 1}`,
      color: "#10b981",
    }));
    this._drawStatic();
  }
}
```

---

### Step 3: Implement `frontend/src/api.js`

```javascript
const BASE = "http://localhost:5000";

export async function callReqRes(latencyMs) {
  const res = await fetch(`${BASE}/api/req-res/find-price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin: "Sudirman", destination: "Blok M" }),
  });
  return res.json();
}

export async function callRpc(latencyMs) {
  const res = await fetch(`${BASE}/api/rpc/calculate-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin: "Sudirman", destination: "Blok M" }),
  });
  return res.json();
}

export async function callQueue() {
  const res = await fetch(`${BASE}/api/queue/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: `ord-${Date.now()}`, amount: 25000 }),
  });
  return res.json();
}
```

---

### Step 4: Implement `frontend/src/ui.js`

```javascript
const logEl = document.getElementById("sequence-log");
const metricsEl = document.getElementById("metrics-widget");
const metricsMap = {};

export function log(msg, color = "#9ca3af") {
  const ts = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.innerHTML = `<span class="text-gray-500">[${ts}]</span> <span style="color:${color}">${msg}</span>`;
  logEl.prepend(line);
  if (logEl.children.length > 50) logEl.lastChild?.remove();
}

export function updateMetric(model, responseTimeMs) {
  metricsMap[model] = metricsMap[model] || [];
  metricsMap[model].push(responseTimeMs);
  metricsEl.innerHTML = Object.entries(metricsMap).map(([m, times]) => {
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0);
    const last = times.at(-1).toFixed(0);
    return `<div class="bg-gray-800 rounded p-2">
      <div class="font-semibold text-xs text-gray-300">${m}</div>
      <div class="text-indigo-400 text-lg font-bold">${last} ms <span class="text-xs text-gray-500">last</span></div>
      <div class="text-gray-500 text-xs">avg: ${avg} ms over ${times.length} calls</div>
    </div>`;
  }).join("");
}
```

---

### Step 5: Wire everything in `frontend/src/main.js`

```javascript
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { TopologyCanvas } from "./canvas.js";
import { callReqRes, callRpc, callQueue } from "./api.js";
import { log, updateMetric } from "./ui.js";

const topology = new TopologyCanvas(document.getElementById("topology-canvas"));
const socket = io("http://localhost:5000");

const latencySlider = document.getElementById("latency-slider");
const latencyVal    = document.getElementById("latency-val");
latencySlider.addEventListener("input", () => { latencyVal.textContent = latencySlider.value; });

const driverSlider = document.getElementById("driver-slider");
const driverVal    = document.getElementById("driver-val");
driverSlider.addEventListener("input", () => {
  driverVal.textContent = driverSlider.value;
  topology.updateDriverCount(Number(driverSlider.value));
});

socket.on("order_broadcast", (data) => {
  log(`📡 [Pub-Sub] Broadcast — user: ${data.user_id}`, "#f59e0b");
});
socket.on("driver_found", (data) => {
  log(`✅ [Pub-Sub] ${data.driver_id} accepted — ETA ${data.eta_minutes} min`, "#10b981");
  updateMetric("pub-sub", data.response_time_ms);
  const nodes = topology.getNodes();
  const driver = nodes.drivers[Math.floor(Math.random() * nodes.drivers.length)];
  topology.animatePacket(nodes.server, driver, "#10b981");
});
socket.on("payment_processed", (data) => {
  log(`💳 [Queue] Processed — order: ${data.order_id}`, "#818cf8");
});

document.getElementById("trigger-btn").addEventListener("click", async () => {
  const model  = document.getElementById("model-select").value;
  const latency = Number(latencySlider.value);
  const nodes  = topology.getNodes();

  log(`🚀 Triggering [${model}] latency=${latency}ms`, "#6366f1");
  await topology.animatePacket(nodes.client, nodes.server, "#6366f1");

  if (model === "req-res") {
    log("⏳ [Req-Res] Client BLOCKED...", "#f59e0b");
    const data = await callReqRes(latency);
    await topology.animatePacket(nodes.server, nodes.drivers[0], "#f59e0b");
    await topology.animatePacket(nodes.drivers[0], nodes.server, "#f59e0b");
    await topology.animatePacket(nodes.server, nodes.client, "#6366f1");
    log(`💰 [Req-Res] Price: Rp ${data.price?.toLocaleString()} — ${data.response_time_ms} ms`, "#10b981");
    updateMetric("req-res", data.response_time_ms);
  } else if (model === "pub-sub") {
    log("📡 [Pub-Sub] Emitting find_driver (non-blocking)...", "#f59e0b");
    socket.emit("find_driver", { user_id: "user-1", location: "Sudirman" });
  } else if (model === "queue") {
    const data = await callQueue();
    log(`📬 [Queue] Enqueued — position: ${data.queue_position}`, "#818cf8");
  } else if (model === "rpc") {
    log("🔗 [RPC] Calling RouteService.calculate()...", "#f59e0b");
    const data = await callRpc(latency);
    const r = data.result;
    await topology.animatePacket(nodes.server, nodes.drivers[0], "#f59e0b");
    await topology.animatePacket(nodes.drivers[0], nodes.server, "#f59e0b");
    await topology.animatePacket(nodes.server, nodes.client, "#6366f1");
    log(`🗺️ [RPC] ${r.distance_km} km · ETA ${r.eta_minutes} min · ${r.rpc_latency_ms} ms`, "#10b981");
    updateMetric("rpc", r.rpc_latency_ms);
  }
});
```

---

### Step 6: Verify in browser

```bash
# Terminal 1
cd backend && .venv\Scripts\activate && python run.py

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173` — test each model in the dropdown.

---

### Step 7: Commit

```bash
git add frontend/
git commit -m "feat: canvas topology, animation, control panel, metrics dashboard"
```

---

## Task 8: End-to-End Integration Tests & README

**Files:**
- Create: `backend/tests/test_integration.py`
- Modify: `README.md`

---

### Step 1: Write `backend/tests/test_integration.py`

```python
import pytest, time
from app import create_app, socketio as sio_instance

@pytest.fixture
def ctx():
    app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 50, "DRIVER_COUNT": 2})
    http = app.test_client()
    ws   = sio_instance.test_client(app)
    yield http, ws
    ws.disconnect()

def test_all_four_endpoints_respond(ctx):
    http, ws = ctx

    assert http.get("/api/health").status_code == 200

    res = http.post("/api/req-res/find-price", json={"origin": "A", "destination": "B"})
    assert res.status_code == 200
    assert res.get_json()["model"] == "request-response"

    res = http.post("/api/queue/pay", json={"order_id": "x", "amount": 1})
    assert res.status_code == 202

    res = http.post("/api/rpc/calculate-route", json={"origin": "A", "destination": "B"})
    assert res.status_code == 200
    assert res.get_json()["model"] == "rpc"

    ws.emit("find_driver", {"user_id": "u1", "location": "L1"})
    time.sleep(0.3)
    received = ws.get_received()
    names = [r["name"] for r in received]
    assert "order_broadcast" in names
    assert "driver_found" in names
```

---

### Step 2: Run full test suite

```bash
cd backend && pytest -v
```
Expected: **ALL PASS** — health, req_res (2), pub_sub (2), message_queue (2), rpc (3), integration (1).

---

### Step 3: Write `README.md`

```markdown
# Real-Time Distributed Communication Simulation

Interactive simulation of 4 distributed communication models using a Ride-Hailing case study.

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install && npm run dev
```

Open http://localhost:5173

## Communication Models

| Model | Endpoint | Type |
|---|---|---|
| Request-Response | POST /api/req-res/find-price | Sync / Blocking |
| Publish-Subscribe | SocketIO `find_driver` event | Async / Non-blocking |
| Message Queue | POST /api/queue/pay | Async / Queued |
| RPC | POST /api/rpc/calculate-route | Sync / Module Call |

## Tests
```bash
cd backend && pytest -v
```
```

---

### Step 4: Final commit

```bash
git add .
git commit -m "feat: integration tests and README — simulation complete"
```

---

## Summary Table

| Task | Deliverable | Estimated Time |
|------|-------------|----------------|
| 1 | Project scaffolding (backend venv, Vite) | ~15 min |
| 2 | Flask app factory + health endpoint | ~10 min |
| 3 | Request-Response REST model | ~15 min |
| 4 | Pub-Sub WebSocket model | ~15 min |
| 5 | Message Queue model | ~15 min |
| 6 | RPC model with RouteService | ~15 min |
| 7 | Canvas topology + animation + control panel | ~45 min |
| 8 | Integration tests + README | ~20 min |
| **Total** | | **~2.5 hours** |
