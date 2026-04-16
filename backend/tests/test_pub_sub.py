from app import socketio as sio_instance


def test_find_driver_broadcasts(default_socket_client):
    """order_broadcast should be emitted immediately when find_driver fires."""
    default_socket_client.emit("find_driver", {"user_id": "user-1", "location": "Sudirman"})
    received = default_socket_client.get_received()
    event_names = [r["name"] for r in received]
    assert "order_broadcast" in event_names


def test_driver_found_emitted_per_driver(default_socket_client):
    """driver_found should be emitted once per driver (DRIVER_COUNT=2)."""
    default_socket_client.emit("find_driver", {"user_id": "user-1", "location": "Sudirman"})
    received = default_socket_client.get_received()
    driver_events = [r for r in received if r["name"] == "driver_found"]
    assert len(driver_events) >= 2   # at least one per driver
