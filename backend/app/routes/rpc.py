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
