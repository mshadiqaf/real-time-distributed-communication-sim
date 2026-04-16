# 🚀 Simulasi Komunikasi Terdistribusi

> **Studi Kasus Ride-Hailing** — Visualisasi interaktif dari 4 pola komunikasi terdistribusi menggunakan backend Python/Flask, broker MQTT publik (EMQX), dan frontend vanilla JS dengan Vite.

![App Screenshot](docs/screenshot.png)

---

## 🎯 Model Komunikasi

| Model | Endpoint / Event | Analogi pada Ride-Hailing |
|---|---|---|
| **Request-Response** | `POST /api/req-res/find-price` | Pengguna meminta tarif — menunggu balasan langsung (Blocking) |
| **Publish-Subscribe** | Event WS `find_driver` / MQTT | Pesanan disiarkan ke semua pengemudi terdekat secara paralel |
| **Message Queue** | `POST /api/queue/pay` / MQTT | Pembayaran masuk antrean, diproses secara asinkron (Workers) |
| **RPC** | `POST /api/rpc/calculate-route` | Perhitungan rute dieksekusi dari fungsi jarak jauh |

---

## 🗂 Struktur Proyek

```text
real-time-distributed-communication-sim/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # Pengaturan awal Flask (SocketIO, MQTT, Blueprint)
│   │   ├── config.py          # Konfigurasi default (latensi, jumlah pengemudi)
│   │   ├── mqtt_client.py     # Integrasi klien MQTT (paho-mqtt)
│   │   ├── routes/
│   │   │   ├── req_res.py     # Endpoint REST (blocking)
│   │   │   ├── pub_sub.py     # Penanganan event Publish-Subscribe (via MQTT)
│   │   │   ├── message_queue.py # Message Queue asinkron (via MQTT)
│   │   │   └── rpc.py         # Blueprint wrapper RPC
│   │   └── services/
│   │       └── route_service.py # Logika perhitungan rute (target RPC)
│   ├── tests/                 # Kumpulan unit test
│   ├── run.py                 # Titik masuk backend
│   ├── requirements.txt       # Daftar dependensi Python
│   └── pytest.ini             # Konfigurasi pengujian
├── frontend/
│   ├── index.html             # Tata letak semantik HTML & Lucide Icons
│   └── src/
│       ├── style.css          # Sistem desain Light style + Glassmorphism
│       ├── canvas.js          # Kanvas topologi + animasi anime.js
│       └── main.js            # Orkestrasi UI + SocketIO + panggilan API
└── docs/                      # Dokumentasi
```

---

## Cara Menjalankan Project Ini

### Kebutuhan Sistem
- Python 3.12+ (Mendukung 3.14)
- Node.js 18+

### Menjalankan Backend

```bash
cd backend
python -m venv .venv

# Untuk Windows:
.venv\Scripts\activate
# Untuk macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
# Server Flask, SocketIO, dan klien MQTT akan berjalan
# Mengaktifkan endpoint API pada http://localhost:5000
```

### Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
# Server grafis Vite akan berjalan pada http://localhost:5173
```

---

## 🏗 Arsitektur Sistem

```text
┌────────────────────────────────────────────────────────┐
│                     Browser (Vite)                     │
│  Kanvas ←── anime.js ──── Node Topologi Visual         │
│  Sidebar: Kendali │ Metrik │ Log Urutan Pesan          │
└──────┬──────────────────────────────────────┬──────────┘
       │ HTTP (fetch)                         │ WebSocket
       ▼                                      ▼
┌────────────────────────────────────────────────────────┐
│                Flask + Flask-SocketIO                  │
│  /api/req-res/find-price  →  REST sinkron (Blocking)   │
│  /api/rpc/calculate-route →  RPC Method Call           │
└──────┬──────────────────────────────────────┬──────────┘
       │ Publish / Subscribe via MQTT Broker  │
       ▼                                      ▼
┌────────────────────────────────────────────────────────┐
│            Public MQTT Broker (broker.emqx.io)         │
│ Topik:                                                 │
│  - ride/order      →  Ditangani pekerja Pub-Sub        │
│  - ride/payment    →  Ditangani pekerja Message Queue  │
└────────────────────────────────────────────────────────┘
```

---

## 🎨 Fitur Antarmuka Pengguna (UI)

- **Desain Cerah & Elegan**: Mengusung pendekatan *light theme* dengan panel tembus pandang khas *glassmorphism* modern.
- **Tipografi Profesional**: Menggunakan keluarga font **Geist** untuk keterbacaan umum yang jernih dan **JetBrains Mono** untuk angka, log, dan informasi presisi.
- **Simbolisasi Lucide**: Ikonografi mulus yang dapat diskalakan pada bilah dan indikator UI.
- **Kanvas Interaktif**: Jaringan setiap node merepresentasikan perangkat, dilengkapi latar bergaris *(grid)*, garis koneksi dinamis, dan efek pijar (glow) ketika aktif.
- **Animasi Paket Real-time**: Paket visualisasi komunikasi data bergerak leluasa di kanvas menggunakan tenaga **anime.js v4**.
- **Indikator Respons**: Pengkodean warna pada komunikasi jaringan — Hijau (Pub-Sub), Biru (Request-Response), Kuning (Metode Antrean), Ungu (RPC).
- **Pemantauan Metrik Langsung**: Menampilkan jumlah total *Requests*, Rata-rata *Round-Trip Time* (RTT), dan total *Event WebSocket* (Soket Terbuka) seketika.
- **Log Runtut Terpusat (Sequence Logs)**: Menyediakan jurnal stempel waktu untuk mencatat laju setiap pesan pengiriman.

---

## 📝 Keputusan Sistem & Desain Terbaru

| Perubahan | Objektif dan Penjelasan |
|---|---|
| **Integrasi Message Broker MQTT Eksternal (EMQX)** | Menghapus arsitektur Queue *in-memory* bawaan Flask dan menggantinya dengan kolaborasi penuh terhadap *Message Broker* eksternal publik secara terdistribusi penuh melalui klien **paho-mqtt**, guna mendemonstrasikan aliran keakuratan asinkron tanpa menuntut pengujian manual maupun instalasi lingkungan virtual Docker tambahan. |
| **Penyelarasan Bahasa UX Terlokalisasi** | Digunakan untuk menjembatani wawasan spesifik mahasiswa pada kurikulum kuliah *Sistem Paralel dan Terdistribusi*, menerjemahkan segala teks pada antarmuka *Frontend* secara menyeluruh agar transparan dan dimengerti. |

---

## 📄 Lisensi
[MIT License](LICENSE)
