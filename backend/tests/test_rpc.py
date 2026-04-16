from app.services.route_service import RouteService


def test_route_service_returns_distance_and_eta():
    result = RouteService.calculate(origin="Sudirman", destination="Blok M", latency_ms=0)
    assert "distance_km" in result
    assert "eta_minutes" in result
    assert "procedure" in result
    assert result["procedure"] == "RouteService.calculate"


def test_rpc_endpoint(default_client):
    res = default_client.post("/api/rpc/calculate-route", json={"origin": "Sudirman", "destination": "Blok M"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["model"] == "rpc"
    assert "result" in data
