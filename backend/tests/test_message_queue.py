def test_enqueue_returns_202(default_client):
    res = default_client.post("/api/queue/pay", json={"order_id": "ord-001", "amount": 25000})
    assert res.status_code == 202
    data = res.get_json()
    assert data["status"] == "queued"
    assert "queue_position" in data


def test_multiple_requests_dont_crash(default_client):
    for i in range(5):
        res = default_client.post("/api/queue/pay", json={"order_id": f"ord-{i}", "amount": 10000 * i})
        assert res.status_code == 202
