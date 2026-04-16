import time
from app import create_app


def test_find_price_returns_price(default_client):
    res = default_client.post("/api/req-res/find-price", json={"origin": "A", "destination": "B"})
    assert res.status_code == 200
    data = res.get_json()
    assert "price" in data
    assert "response_time_ms" in data
    assert isinstance(data["price"], (int, float))


def test_find_price_blocking_delay():
    # Create a local app ONLY for this test (non-socketio, pure HTTP)
    flask_app = create_app({"TESTING": True, "SIMULATE_LATENCY_MS": 100})
    with flask_app.test_client() as c:
        start = time.time()
        res = c.post("/api/req-res/find-price", json={"origin": "A", "destination": "B"})
        elapsed = (time.time() - start) * 1000
    assert elapsed >= 100
    assert res.status_code == 200
