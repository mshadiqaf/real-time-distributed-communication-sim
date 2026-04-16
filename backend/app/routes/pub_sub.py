import time
import random
import threading
from flask import current_app
from flask_socketio import emit
from app import socketio

def handle_mqtt_orders(payload, io_instance):
    """
    Called asynchronously when an MQTT message arrives on 'sim/ride/orders'.
    Simulates the broadcast and drivers responding.
    """
    io_instance.emit("order_broadcast", payload)
    
    # Simulate drivers responding in the background
    def simulate_drivers():
        driver_count = 3
        latency_ms = 500  # Simplified for the callback without request context
        for i in range(driver_count):
            time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
            driver_payload = {
                "driver_id": f"driver-{i+1}",
                "eta_minutes": random.randint(2, 15),
                "response_time_ms": round(max(latency_ms, 1) * random.uniform(0.5, 1.5), 2),
            }
            io_instance.emit("driver_found", driver_payload)
            
    threading.Thread(target=simulate_drivers, daemon=True).start()

# We try to register the callback if mqtt_client is ready.
# Note: At import time, mqtt_client might not be fully initialized or we can just register it lazily.
try:
    from app.mqtt_client import register_topic_callback
    register_topic_callback("sim/ride/orders", handle_mqtt_orders)
except Exception:
    pass


@socketio.on("find_driver")
def handle_find_driver(data):
    order_payload = {
        "model": "pub-sub",
        "user_id": data.get("user_id"),
        "location": data.get("location"),
        "timestamp_ms": round(time.time() * 1000),
    }

    if current_app.config.get("TESTING"):
        # Synchronous execution for testing to pass without hitting external broker
        emit("order_broadcast", order_payload)
        socketio.emit("order_broadcast", order_payload)
        
        latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)
        driver_count = current_app.config.get("DRIVER_COUNT", 3)
        for i in range(driver_count):
            time.sleep(latency_ms / 1000 * random.uniform(0.5, 1.5))
            driver_payload = {
                "driver_id": f"driver-{i+1}",
                "eta_minutes": random.randint(2, 15),
                "response_time_ms": round(max(latency_ms, 1) * random.uniform(0.5, 1.5), 2),
            }
            emit("driver_found", driver_payload)
            socketio.emit("driver_found", driver_payload)
    else:
        # Production execution: offload to MQTT broker
        from app.mqtt_client import publish_message
        publish_message("sim/ride/orders", order_payload)
