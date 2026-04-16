# Endpoint untuk pola Request-Response (blocking/sinkronus).
# Klien mengirim permintaan harga dan harus menunggu server selesai menghitung
# sebelum bisa melakukan hal lain — ini adalah inti dari pola blocking.

import time
import random
from flask import Blueprint, request, jsonify, current_app

req_res_bp = Blueprint("req_res", __name__, url_prefix="/api/req-res")


@req_res_bp.post("/find-price")
def find_price():
    # Fungsi ini berguna untuk mensimulasikan kalkulasi tarif perjalanan secara blocking.
    # Server sengaja "diam" selama latency_ms untuk meniru komputasi nyata.
    data = request.get_json(silent=True) or {}
    latency_ms = data.get("latency", current_app.config.get("SIMULATE_LATENCY_MS", 500))

    t_start = time.perf_counter()
    time.sleep(latency_ms / 1000)  # Sengaja blokir thread — ini yang membedakan Req-Res dari Queue

    # Generate harga acak antara Rp 10.000–50.000, dibulatkan ke ribuan
    price = round(random.uniform(10_000, 50_000), -3)

    t_end = time.perf_counter()

    return jsonify({
        "model":            "request-response",
        "origin":           data.get("origin", "?"),
        "destination":      data.get("destination", "?"),
        "price":            price,
        "response_time_ms": round((t_end - t_start) * 1000, 2),
    })
