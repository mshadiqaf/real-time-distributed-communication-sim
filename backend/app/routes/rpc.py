# Endpoint untuk pola RPC (Remote Procedure Call).
# Klien meminta kalkulasi rute seolah memanggil fungsi lokal,
# padahal komputasinya dikerjakan oleh layanan terpisah (RouteService).

from flask import Blueprint, request, jsonify, current_app
from app.services.route_service import RouteService

rpc_bp = Blueprint("rpc", __name__, url_prefix="/api/rpc")


@rpc_bp.post("/calculate-route")
def calculate_route():
    # Fungsi ini berguna untuk mendelegasikan perhitungan rute ke RouteService —
    # ini adalah inti dari pola RPC: klien tidak peduli bagaimana hasilnya dihitung.
    data       = request.get_json(silent=True) or {}
    latency_ms = data.get("latency", current_app.config.get("SIMULATE_LATENCY_MS", 500))

    result = RouteService.calculate(
        origin      = data.get("origin", "A"),
        destination = data.get("destination", "B"),
        latency_ms  = latency_ms,
    )

    return jsonify({
        "model":            "rpc",
        "result":           result,
        "response_time_ms": result.get("rpc_latency_ms"),
    })
