# Ini adalah "server RPC" yang berjalan sebagai layanan terpisah dari API utama.
# Dalam skenario nyata, kelas ini akan berjalan di server lain dan dipanggil lewat jaringan.
# Di sini kita simulasikan latensinya dengan time.sleep() untuk demonstrasi.

import time
import random


class RouteService:
    """Mensimulasikan layanan perhitungan rute GPS yang bisa dipanggil lewat RPC."""

    @staticmethod
    def calculate(origin: str, destination: str, latency_ms: int = 500) -> dict:
        # Fungsi ini berguna untuk menghitung estimasi jarak dan waktu tempuh.
        # Hasilnya acak untuk tujuan demonstrasi — di sistem nyata ini akan pakai
        # algoritma routing seperti Dijkstra atau panggilan ke Google Maps API.
        t_start = time.perf_counter()
        time.sleep(latency_ms / 1000)  # Simulasikan latensi jaringan antar-service

        distance_km = round(random.uniform(1.5, 30.0), 1)
        eta_minutes = round(distance_km / 0.5)  # Asumsi kecepatan rata-rata 30 km/jam

        t_end = time.perf_counter()

        return {
            "procedure":       "RouteService.calculate",
            "origin":          origin,
            "destination":     destination,
            "distance_km":     distance_km,
            "eta_minutes":     eta_minutes,
            "rpc_latency_ms":  round((t_end - t_start) * 1000, 2),
        }
