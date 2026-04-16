# File ini menangani pola Message Queue (antrean pesan).
# Klien mengirim permintaan pembayaran, lalu langsung mendapat konfirmasi antrean (HTTP 202).
# Pembayaran yang sebenarnya diproses di latar belakang oleh worker — tidak memblokir klien.

import queue
import threading
import time
from flask import Blueprint, request, jsonify, current_app
from app import socketio

message_queue_bp = Blueprint("message_queue", __name__, url_prefix="/api/queue")

# In-memory queue dan flag worker dipakai saat mode testing (tanpa broker MQTT)
_q: queue.Queue = queue.Queue()
_worker_started = False
_worker_lock    = threading.Lock()


def _worker():
    # Fungsi ini berguna untuk memproses item dari antrean satu per satu di background.
    # Worker ini terus berjalan selama aplikasi hidup.
    while True:
        item = _q.get()
        time.sleep(item.get("latency_ms", 500) / 1000)  # Simulasikan waktu pemrosesan
        socketio.emit("payment_processed", {
            "order_id":        item["order_id"],
            "amount":          item["amount"],
            "status":          "SUCCESS",
            "processed_at_ms": round(time.time() * 1000),
        })
        _q.task_done()


def _ensure_worker_running():
    # Fungsi ini berguna untuk memastikan worker thread sudah jalan sebelum item diantrekan.
    # Lock dipakai supaya tidak ada dua worker yang dibuat sekaligus.
    global _worker_started
    with _worker_lock:
        if not _worker_started:
            threading.Thread(target=_worker, daemon=True).start()
            _worker_started = True


def handle_mqtt_payments(payload, io_instance):
    # Fungsi ini berguna untuk memproses pembayaran yang datang dari broker MQTT.
    # Dijalankan di thread terpisah agar tidak memblokir loop MQTT.
    def process_payment():
        time.sleep(payload.get("latency_ms", 500) / 1000)
        io_instance.emit("payment_processed", {
            "order_id":        payload.get("order_id"),
            "amount":          payload.get("amount"),
            "status":          "SUCCESS",
            "processed_at_ms": round(time.time() * 1000),
        })
    threading.Thread(target=process_payment, daemon=True).start()


# Daftarkan handler pembayaran ke topik MQTT
try:
    from app.mqtt_client import register_topic_callback
    register_topic_callback("sim/ride/payments", handle_mqtt_payments)
except Exception:
    pass


@message_queue_bp.post("/pay")
def enqueue_payment():
    # Fungsi ini berguna untuk menerima permintaan pembayaran dan memasukkannya ke antrean.
    # Klien langsung mendapat respons HTTP 202 tanpa menunggu pembayaran selesai.
    data       = request.get_json(silent=True) or {}
    latency_ms = data.get("latency", current_app.config.get("SIMULATE_LATENCY_MS", 500))

    item = {
        "order_id":   data.get("order_id", "unknown"),
        "amount":     data.get("amount", 0),
        "latency_ms": latency_ms,
    }

    if current_app.config.get("TESTING"):
        # Mode testing: pakai in-memory queue dan worker lokal
        _ensure_worker_running()
        _q.put(item)
        return jsonify({"status": "queued", "queue_position": _q.qsize()}), 202
    else:
        # Mode produksi: publish ke MQTT dan biarkan broker yang menangani antrean
        from app.mqtt_client import publish_message
        publish_message("sim/ride/payments", item)
        return jsonify({"status": "published to mqtt broker", "queue_position": 1}), 202
