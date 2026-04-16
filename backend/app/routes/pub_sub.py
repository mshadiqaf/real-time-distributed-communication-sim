# File ini menangani pola Publish-Subscribe menggunakan MQTT.
# Saat pengguna mencari pengemudi, order dipublish ke broker MQTT.
# Broker lalu menyebarkan order tersebut ke semua pengemudi yang subscribe — secara paralel.
# Klien tidak perlu menunggu; respons datang sendiri lewat event WebSocket.

import time
import random
import threading
from flask import current_app
from flask_socketio import emit
from app import socketio


def handle_mqtt_orders(payload, io_instance):
    # Fungsi ini berguna untuk memproses order yang masuk dari broker MQTT
    # dan mensimulasikan respons dari setiap pengemudi
    io_instance.emit("order_broadcast", payload)

    def simulate_drivers():
        # Setiap pengemudi merespons dengan waktu yang berbeda-beda secara acak
        driver_count = int(payload.get("drivers", 3))
        latency_ms   = int(payload.get("latency", 500))
        for i in range(driver_count):
            time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
            io_instance.emit("driver_found", {
                "driver_id":        f"driver-{i + 1}",
                "eta_minutes":      random.randint(2, 15),
                "response_time_ms": round(max(latency_ms, 1) * random.uniform(0.5, 1.5), 2),
            })

    # Jalankan di thread terpisah supaya tidak memblokir loop MQTT
    threading.Thread(target=simulate_drivers, daemon=True).start()


# Daftarkan callback ini ke topik MQTT saat modul diimport
try:
    from app.mqtt_client import register_topic_callback
    register_topic_callback("sim/ride/orders", handle_mqtt_orders)
except Exception:
    pass


@socketio.on("find_driver")
def handle_find_driver(data):
    # Fungsi ini berguna untuk menerima event dari frontend dan meneruskannya ke MQTT broker
    order_payload = {
        "model":        "pub-sub",
        "user_id":      data.get("user_id"),
        "location":     data.get("location"),
        "timestamp_ms": round(time.time() * 1000),
        "drivers":      data.get("drivers", 3),
        "latency":      data.get("latency", 500),
    }

    if current_app.config.get("TESTING"):
        # Saat testing, jalankan langsung tanpa broker MQTT agar tidak butuh koneksi eksternal
        emit("order_broadcast", order_payload)
        socketio.emit("order_broadcast", order_payload)
        latency_ms   = data.get("latency", 500)
        driver_count = data.get("drivers", 3)
        for i in range(driver_count):
            time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
            driver_payload = {
                "driver_id":        f"driver-{i + 1}",
                "eta_minutes":      random.randint(2, 15),
                "response_time_ms": round(max(latency_ms, 1) * random.uniform(0.5, 1.5), 2),
            }
            emit("driver_found", driver_payload)
            socketio.emit("driver_found", driver_payload)
    else:
        # Mode normal: publish ke MQTT dan biarkan broker yang mendistribusikan
        from app.mqtt_client import publish_message
        publish_message("sim/ride/orders", order_payload)
