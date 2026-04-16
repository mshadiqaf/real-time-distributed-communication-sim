import time
import random


class RouteService:
    """Simulates a remote module callable via RPC."""

    @staticmethod
    def calculate(origin: str, destination: str, latency_ms: int = 500) -> dict:
        t_start = time.perf_counter()
        time.sleep(latency_ms / 1000)   # simulate inter-service network hop

        distance_km = round(random.uniform(1.5, 30.0), 1)
        eta_minutes = round(distance_km / 0.5)   # assume avg 30 km/h in traffic

        t_end = time.perf_counter()
        return {
            "procedure": "RouteService.calculate",
            "origin": origin,
            "destination": destination,
            "distance_km": distance_km,
            "eta_minutes": eta_minutes,
            "rpc_latency_ms": round((t_end - t_start) * 1000, 2),
        }
