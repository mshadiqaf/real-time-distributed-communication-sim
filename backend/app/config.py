# Konfigurasi default aplikasi.
# Nilai-nilai di sini bisa ditimpa saat testing atau lewat environment variable.

class DefaultConfig:
    SECRET_KEY = "dev-secret-change-me"  # Ganti dengan nilai acak yang kuat di produksi

    # Latensi jaringan default yang disimulasikan (ms). Dipakai jika frontend tidak mengirim nilai.
    SIMULATE_LATENCY_MS = 500

    # Jumlah pengemudi default untuk Pub-Sub. Ini hanya fallback;
    # nilai aktualnya dikirim langsung dari slider di frontend.
    DRIVER_COUNT = 3
