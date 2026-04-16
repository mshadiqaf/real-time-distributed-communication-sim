import queue
import threading
import time
from flask import Blueprint, request, jsonify, current_app
from app import socketio

message_queue_bp = Blueprint("message_queue", __name__, url_prefix="/api/queue")

_q: queue.Queue = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def _worker():
    """Background thread: processes payments one-by-one."""
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
