import time
import random
from flask import current_app
from flask_socketio import emit
from app import socketio


@socketio.on("find_driver")
def handle_find_driver(data):
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)
    driver_count = current_app.config.get("DRIVER_COUNT", 3)

    order_payload = {
        "model": "pub-sub",
        "user_id": data.get("user_id"),
        "location": data.get("location"),
        "timestamp_ms": round(time.time() * 1000),
    }

    # Emit directly to caller (captured by test client) AND broadcast to others
    emit("order_broadcast", order_payload)
    socketio.emit("order_broadcast", order_payload)

    # Simulate each driver responding
    for i in range(driver_count):
        time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
        driver_payload = {
            "driver_id": f"driver-{i+1}",
            "eta_minutes": random.randint(2, 15),
            "response_time_ms": round(max(latency_ms, 1) * random.uniform(0.5, 1.5), 2),
        }
        emit("driver_found", driver_payload)
        socketio.emit("driver_found", driver_payload)
