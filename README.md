# 🚀 Real-Time Distributed Communication Simulation

> **Ride-Hailing Case Study** — Interactive visualization of 4 distributed communication patterns using a Python/Flask backend and a Vite vanilla JS frontend.

![App Screenshot](docs/screenshot.png)

---

## 🎯 Communication Models

| Model | Endpoint / Event | Ride-Hailing Analogy |
|---|---|---|
| **Request-Response** | `POST /api/req-res/find-price` | Rider requests fare — waits for reply |
| **Publish-Subscribe** | WS event `find_driver` | Order broadcast to all nearby drivers |
| **Message Queue** | `POST /api/queue/pay` | Payment enqueued, processed async |
| **RPC** | `POST /api/rpc/calculate-route` | Remote route calculation returned |

---

## 🗂 Project Structure

```
real-time-distributed-communication-sim/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # Flask app factory (SocketIO, CORS, blueprints)
│   │   ├── config.py          # DefaultConfig (latency, driver count)
│   │   ├── routes/
│   │   │   ├── req_res.py     # REST blocking endpoint
│   │   │   ├── pub_sub.py     # SocketIO event handler
│   │   │   ├── message_queue.py # Async queue + daemon worker
│   │   │   └── rpc.py         # RPC wrapper blueprint
│   │   └── services/
│   │       └── route_service.py  # RouteService.calculate (RPC target)
│   ├── tests/
│   │   ├── conftest.py        # Session-scoped fixtures (shared socketio)
│   │   ├── test_health.py
│   │   ├── test_req_res.py
│   │   ├── test_pub_sub.py
│   │   ├── test_message_queue.py
│   │   └── test_rpc.py
│   ├── run.py
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   ├── index.html             # Semantic HTML layout
│   └── src/
│       ├── style.css          # Dark glassmorphism design system
│       ├── canvas.js          # Canvas topology + anime.js animations
│       └── main.js            # UI orchestrator + SocketIO + API calls
└── docs/
    └── plans/
        └── 2026-04-16-distributed-comm-sim.md
```

---

## ⚙️ Quick Start

### Prerequisites
- Python 3.12+ (3.14 supported)
- Node.js 18+

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
# Flask + SocketIO running on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server on http://localhost:5173
```

---

## 🧪 Running Tests

```bash
cd backend
.venv\Scripts\python.exe -m pytest tests/ -v
```

**Test results:** 9/9 passing ✅

```
tests/test_health.py::test_health_check                    PASSED
tests/test_message_queue.py::test_enqueue_returns_202      PASSED
tests/test_message_queue.py::test_multiple_requests_dont_crash PASSED
tests/test_pub_sub.py::test_find_driver_broadcasts         PASSED
tests/test_pub_sub.py::test_driver_found_emitted_per_driver PASSED
tests/test_req_res.py::test_find_price_returns_price       PASSED
tests/test_req_res.py::test_find_price_blocking_delay      PASSED
tests/test_rpc.py::test_route_service_returns_distance_and_eta PASSED
tests/test_rpc.py::test_rpc_endpoint                       PASSED
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Vite)                     │
│  Canvas ←── anime.js ──── Topology Nodes                │
│  Sidebar: Controls │ Metrics │ Sequence Log             │
└──────┬──────────────────────────────────────┬───────────┘
       │ HTTP (fetch)                          │ WebSocket
       ▼                                       ▼
┌─────────────────────────────────────────────────────────┐
│               Flask + Flask-SocketIO                    │
│  /api/req-res/find-price  →  blocking REST              │
│  /api/queue/pay           →  enqueue → daemon worker    │
│  /api/rpc/calculate-route →  RouteService.calculate()   │
│  WS: find_driver          →  broadcast order_broadcast  │
│       ↓ per-driver         →  emit driver_found         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Features

- **Dark glassmorphism** design with Inter + JetBrains Mono fonts
- **Canvas topology** with grid background, dashed edges, glowing nodes
- **Animated packets** (anime.js v4) traveling between nodes in real-time
- **Per-model accent colours** — blue (req-res), green (pub-sub), amber (queue), purple (rpc)
- **Live metrics** — Requests, Avg RTT, WS Events with flash animation
- **SocketIO connection badge** — live green/grey indicator
- **Sequence log** — timestamped, colour-coded log of all events

---

## 📝 Design Decisions

| Decision | Rationale |
|---|---|
| `async_mode="threading"` | eventlet incompatible with Python 3.14 |
| Session-scoped pytest fixtures | Shared SocketIO singleton — multiple `init_app()` calls reset queue |
| anime.js v4 named exports | v4 removed default export; use `import { animate }` |
| Dual `emit()` + `socketio.emit()` in pub_sub | Direct emit for test client; global emit for production broadcasts |
| Flask app factory pattern | Enables testable config overrides per test |

---

## 📄 License

MIT
