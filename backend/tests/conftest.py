"""
Shared pytest fixtures for the backend test suite.

We use a single Flask app instance per test session to avoid calling
socketio.init_app() multiple times (which resets the SocketIO server state
and breaks test client event queues).

Tests that need different configs (e.g. SIMULATE_LATENCY_MS=100) create
their own local app instance via create_app() — this is safe as long as they
don't rely on SocketIO test_client, only on Flask test_client.
"""
import pytest
from app import create_app, socketio as sio_instance


@pytest.fixture(scope="session")
def default_app():
    """Session-scoped Flask app with default test config."""
    return create_app({
        "TESTING": True,
        "SIMULATE_LATENCY_MS": 0,
        "DRIVER_COUNT": 2,
    })


@pytest.fixture(scope="session")
def default_client(default_app):
    """Session-scoped Flask test client."""
    with default_app.test_client() as c:
        yield c


@pytest.fixture(scope="session")
def default_socket_client(default_app):
    """Session-scoped SocketIO test client."""
    client = sio_instance.test_client(default_app)
    yield client
    client.disconnect()
