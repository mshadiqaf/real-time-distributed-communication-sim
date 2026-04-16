# 🚀 Simulasi Interaktif Model Komunikasi Terdistribusi

> Visualisasi interaktif dari 4 pola arsitektur komunikasi terdistribusi dalam konteks nyata aplikasi **Ride-Hailing**. Dibangun dengan Vite + Vanilla JS di sisi frontend dan Python Flask di backend, terhubung ke broker MQTT publik (EMQX) untuk mensimulasikan komunikasi antar-service secara real-time.

---

## 👤 Identitas Mahasiswa

| Atribut | Informasi |
|---|---|
| **Nama** | Muhammad Shadiq Al-Fatiy |
| **NIM** | 11231065 |
| **Program Studi** | Informatika |
| **Jurusan** | Teknik Elektro, Informatika, dan Bisnis |
| **Fakultas** | Sains dan Teknologi Informasi |
| **Mata Kuliah** | Sistem Paralel dan Terdistribusi |
| **Kelas** | A |

---

## 💡 Tentang Proyek Ini

Proyek ini mensimulasikan bagaimana sistem terdistribusi berkomunikasi di balik layar — sesuatu yang jarang terlihat secara langsung meski digunakan setiap hari. Dengan mengambil konteks **aplikasi ride-hailing** (seperti Gojek atau Grab), setiap model komunikasi dipetakan ke skenario yang familiar:

| Model Komunikasi | Skenario | Endpoint / Event |
|---|---|---|
| **Request-Response (REST)** | Cek tarif perjalanan | `POST /api/req-res/find-price` |
| **Publish-Subscribe (MQTT)** | Mencari pengemudi terdekat | `socket.emit('find_driver')` |
| **Message Queue (MQTT)** | Proses pembayaran tagihan | `POST /api/queue/pay` |
| **RPC** | Kalkulasi rute GPS | `POST /api/rpc/calculate-route` |

Pilihan ride-hailing bukan sekadar ilustrasi — sistem ini memang menghadapi tantangan nyata dalam distributed computing: blocking vs non-blocking, konkurensi tinggi, dan pemisahan beban komputasi antar service.

---

## 🎬 Cara Kerja Simulasi

Ketika simulasi dijalankan, Anda bisa melihat secara visual apa yang terjadi di dalam sistem:

- **Paket data bergerak** antar node di kanvas, merepresentasikan aliran pesan
- **Label status muncul** di atas setiap node saat sedang aktif memproses (misalnya: *"Kalkulasi Rute..."*, *"Masuk Antrean #2"*)
- **Log pesan** mencatat setiap langkah komunikasi lengkap dengan timestamp
- **Tabel Riwayat** otomatis mencatat hasil setiap simulasi — model, konfigurasi, dan durasi — sehingga bisa dibandingkan langsung antar model

Jumlah pengemudi pada model Pub-Sub bisa diatur secara dinamis; node di kanvas akan bertambah atau berkurang secara real-time sesuai slider.

---

## ⚙️ Arsitektur Sistem

Terdapat 5 komponen yang bekerja dalam topologi ini:

1. **Client Node** — Merepresentasikan pengguna aplikasi. Berkomunikasi via HTTP REST dan WebSocket.
2. **API Server (Flask)** — Menerima dan meneruskan permintaan ke service yang sesuai.
3. **Message Broker (EMQX)** — Broker MQTT publik yang mengelola distribusi pesan pada model Pub-Sub dan Queue tanpa perlu infrastruktur sendiri.
4. **Driver Nodes** — Subscribers yang menerima siaran order dari Broker secara paralel (fan-out).
5. **RPC Service** — Layanan terpisah yang menangani komputasi rute, mewakili konsep microservice dengan delegasi komputasi.

---

## 🛠 Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend Runtime** | [Vite](https://vitejs.dev/) v5 + Vanilla JS | *Build tool* modern dengan Hot Module Replacement |
| **Visualisasi** | HTML5 Canvas + DOM Overlay | Topologi digambar di kanvas; node sebagai elemen DOM |
| **Animasi** | [Anime.js](https://animejs.com/) v4 | Paket data bergerak menggunakan keyframe JS |
| **Ikonografi** | [Lucide Icons](https://lucide.dev/) | SVG icon library per jenis entitas node |
| **Tipografi** | [Google Fonts](https://fonts.google.com/) — Inter, Outfit, JetBrains Mono | Inter (body), Outfit (heading), JetBrains Mono (log) |
| **Backend** | [Python](https://python.org) 3.12+ + [Flask](https://flask.palletsprojects.com/) | REST endpoint dan routing pesan |
| **WebSocket** | [Flask-SocketIO](https://flask-socketio.readthedocs.io/) + [Socket.IO](https://socket.io/) | Komunikasi duplex real-time |
| **Message Broker** | [EMQX Public Broker](https://www.emqx.com/en/mqtt/public-mqtt5-broker) via [paho-mqtt](https://www.eclipse.org/paho/) | Broker MQTT publik tanpa infrastruktur tambahan |
| **CORS** | Flask-CORS | Mengizinkan request dari port frontend ke backend |
| **Testing** | pytest | Unit test untuk logika route |

---

## 🗂 Struktur Proyek

```text
real-time-distributed-communication-sim/
├── start.ps1                  # Skrip startup satu perintah (Windows)
├── backend/
│   ├── app/
│   │   ├── config.py          # Konfigurasi default aplikasi
│   │   ├── mqtt_client.py     # Manajemen koneksi MQTT (Singleton)
│   │   ├── routes/            # Endpoint REST & event handler SocketIO
│   │   └── services/          # Logika bisnis (RouteService untuk RPC)
│   ├── requirements.txt
│   └── run.py                 # Entry point backend
└── frontend/
    ├── index.html             # Struktur UI dan panel kontrol
    └── src/
        ├── style.css          # Desain Dark Glassmorphism
        ├── canvas.js          # Rendering topologi dan animasi paket
        └── main.js            # Orkestrasi simulasi, metrik, dan log
```

---

## 🚀 Cara Menjalankan

### Kebutuhan Sistem
- Python 3.12+
- Node.js 18+

### ⚡ Cara Cepat (Windows)

Cukup satu perintah untuk menjalankan backend dan frontend sekaligus:

```powershell
.\start.ps1
```

Script ini otomatis membuka dua terminal terpisah:
- **Backend Flask** → http://localhost:5000
- **Frontend Vite** → http://localhost:5173

> **Catatan:** Jika muncul error *"execution of scripts is disabled"*, jalankan perintah ini sekali di PowerShell sebagai Administrator:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

### 🔧 Cara Manual

Jika ingin menjalankan masing-masing server secara terpisah:

**Backend:**
```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# MacOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
