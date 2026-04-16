import time
import random
from flask import Blueprint, request, jsonify, current_app

req_res_bp = Blueprint("req_res", __name__, url_prefix="/api/req-res")


@req_res_bp.post("/find-price")
def find_price():
    data = request.get_json(silent=True) or {}
    latency_ms = current_app.config.get("SIMULATE_LATENCY_MS", 500)

    t_start = time.perf_counter()
    time.sleep(latency_ms / 1000)          # blocking sleep — simulates sync/blocking

    price = round(random.uniform(10_000, 50_000), -3)   # IDR
    t_end = time.perf_counter()

    return jsonify({
        "model": "request-response",
        "origin": data.get("origin", "?"),
        "destination": data.get("destination", "?"),
        "price": price,
        "response_time_ms": round((t_end - t_start) * 1000, 2),
    })
