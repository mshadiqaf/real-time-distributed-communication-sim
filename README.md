# 🚀 Simulasi Interaktif Model Komunikasi Terdistribusi

> **Studi Kasus Ride-Hailing** — Implementasi dan visualisasi interaktif dari 4 pola arsitektur komunikasi terdistribusi. Dibangun menggunakan antarmuka Glassmorphism (Vite + Vanilla JS), Backend Python/Flask, serta perantara *Message Broker* publik MQTT (EMQX) untuk mensimulasikan lingkungan terdistribusi skala nyata.

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

![App Screenshot](docs/screenshot.png)

---

## 🎯 Relevansi Dunia Nyata & Skenario (Kriteria 8)
Proyek ini mengadopsi studi kasus **Aplikasi Ride-Hailing (E-hailing)** untuk membuktikan bagaimana berbagai metode transmisi data bekerja dalam skala produksi. Sistem ride-hailing memiliki tantangan konkurensi ekstrem, perhitungan jarak lambat (berat komputasi), pemrosesan asinkron di gateway pembayaran, dan keandalan data lintas wilayah. Implementasi yang diangkat dalam proyek meliputi:

| Model | Endpoint / Event | Tantangan Terdistribusi (Skenario Ride-Hailing) |
|---|---|---|
| **Request-Response (REST)** | `POST /req-res/find-price` | *Cek Tarif:* Aplikasi klien di-[blokir] sementara harus menunggu perhitungan tarif. Menunjukkan sisi rentan model *blocking* jika server lambat. |
| **Publish-Subscribe (MQTT)** | Event WS `find_driver` | *Cari Pengemudi:* Disiarkan secara paralel ke _n_-pengemudi terdekat via broker (non-blocking). Menunjukkan efisiensi penyebaran event dinamis. |
| **Message Queue (MQTT)** | `POST /queue/pay` | *Pembayaran:* Permintaan antre *(queue)* pada Broker, menghindari Server kelebihan muatan (*Server Overload*). Klien langsung bebas beraktivitas sementara proses diselesaikan perlahan di latar belakang. |
| **RPC (Route Calc)** | `POST /rpc/calculate-route` | *Pencarian Rute GPS:* Fungsi komputasi rumit diserahkan ke *Remote Server* khusus algoritma berat yang memisahkan latensi *core* API dengan *service* sekunder (microservice). |

---

## 🛠 Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend Runtime** | [Vite](https://vitejs.dev/) v5 + Vanilla JS | *Build tool* modern, *Hot Module Replacement* (HMR), dan bundling produksi |
| **Visualisasi** | HTML5 Canvas + DOM Overlay | Topologi digambar di kanvas; node ditampilkan sebagai elemen DOM untuk animasi CSS |
| **Animasi** | [Anime.js](https://animejs.com/) v4 | Paket data bergerak di kanvas menggunakan keyframe berbasis JavaScript |
| **Ikonografi** | [Lucide Icons](https://lucide.dev/) | SVG *icon library*, dirender sebagai DOM node sesuai jenis entitas jaringan |
| **Tipografi** | [Google Fonts](https://fonts.google.com/) — Inter, Outfit, JetBrains Mono | Desain premium: Inter (body), Outfit (heading), JetBrains Mono (data/log) |
| **Backend** | [Python](https://python.org) 3.12+ + [Flask](https://flask.palletsprojects.com/) | Framework web minimalis untuk REST endpoint & routing pesan |
| **WebSocket** | [Flask-SocketIO](https://flask-socketio.readthedocs.io/) + [Socket.IO](https://socket.io/) | Komunikasi *duplex* real-time antara browser dan server |
| **Message Broker** | [EMQX Public Broker](https://www.emqx.com/en/mqtt/public-mqtt5-broker) via [paho-mqtt](https://www.eclipse.org/paho/) | Broker MQTT publik untuk Pub-Sub & Message Queue tanpa infrastruktur tambahan |
| **CORS & HTTP** | Flask-CORS | Mengizinkan *cross-origin request* dari port frontend Vite ke port backend Flask |
| **Testing** | pytest | Unit test untuk logika *route*, kompatibel dengan `pytest.ini` |

---

## ⚙️ Definisi Komponen & Logika Interaksi (Kriteria 2 & 3)

Terdapat 5 komponen utama dalam topologi sistem ini yang menjamin pengiriman pesan antar-*service*:

1. **Client Node (Pengguna):** Merupakan aplikasi awal (frontend mobile) yang merepresentasikan permohonan pengguna. Node ini berinteraksi melalui HTTP REST maupun WebSockets (Emisi data).
2. **Server Utama (API Gateway):** Kumpulan antarmuka _(Blueprint)_ Python/Flask bertindak sebagai koordinator awal. Tugas server mengomunikasikan (routing) data dari klien ke tujuan komputasi terkait. 
3. **Public Broker MQTT (EMQX):** Pengganti _queue in-memory_. Pada model Pub-Sub & antrean, sistem sepenuhnya terdesentralisasi karena event-event disebarkan/antre pada host eksternal `broker.emqx.io`. Hal ini mengamankan server dari kepenuhan paket di masa puncak *(spike)*.
4. **Driver Nodes (Subscribers):** Layanan satelit atau pihak penerima pesan dari jalur Pub-Sub. Ketika klien mengajukan order, Broker mengeksekusi distribusi *fan-out* kepada _n_-driver terkait tanpa memberatkan Client.
5. **RPC Server (Remote Procedure):** Menyederhanakan penempatan algoritma rute jarak dengan menerima delegasi hitung. Ia menjawab panggilan klien seolah ia berlokasi di dalam modul lokal.

---

## 📈 Mekanisme Perbandingan (Kriteria 6)
Dalam menjamin observasi komparatif yang sempurna (Metode A vs B), dasbor interaktif memiliki **Tabel Riwayat Eksperimen** interaktif dan metrik waktu nyata.

**Cara Membandingkannya:**
1. Anda dapat menjalankan operasi **Request-Response** dengan _latensi jaringan maksimal_. Tabel komparasi akan langsung menunjukkan durasi penuh di mana klien terbekukan.
2. Bandingkan secara instan dengan metode **Message Queue** atau **Pub-Sub**. Walau penundaan waktu / iterasi di internal server/broker tinggi, pada tabel komparasi interaktif yang mencatat metrik "*Status*" dan "*Waktu Total*", Anda akan melihat bahwasanya interaksi klien tidak diblokir. 
3. *Insight Komparatif:* Kombinasi ini memberikan pencerahan kepada penilai mengapa *Message Queue* memenangkan kestabilan untuk _payment_ (pembayaran), di mana *synchronous REST* lebih sesuai digabung untuk kalkulasi *real-time* seperti harga rute (yang nilainya diperlukan segera untuk lanjut urutan UX).

---

## 🎨 Desain Representasi Visual (Kriteria 4 & 5)
Sistem ini memfasilitasi _Discovery_ dan _Insight_ lewat modifikasi komponen estetis:

- **Topologi Kanvas DOM (Glassmorphism):** Berbeda dengan visualisasi kaku kanvas Bitmap, node disajikan dalam wadah DOM transparan beranimasi _Pulse_.
- **Sistem _Floating Interactive Badges_:** Pada setiap node yang mengkomunikasikan pesan dalam logika terkait terpasang stempel interaksi status transien (*"Kalkulasi Rute...", "Koor awal & tujuan..."*) sehingga evaluator mudah menerjemahkan apa yang terjadi di internal data tanpa sepenuhnya tunduk pada kode *log backend*.
- **Konfigurasi Responsif:** _Slide range_ disesuaikan hanya apabila metode bersangkutan membutuhkannya — contohnya jumlah pengemudi yang *collapse* saat bukan uji coba Pub-Sub, menegaskan arsitektur terisolasi.

---

## 🗂 Struktur Proyek

```text
real-time-distributed-communication-sim/
├── backend/
│   ├── app/
│   │   ├── config.py          # Konfigurasi default (latensi, jumlah pengemudi)
│   │   ├── mqtt_client.py     # Integrasi klien MQTT (paho-mqtt)
│   │   ├── routes/            # Blueprint REST Endpoint & Event Handlers
│   │   └── services/          # Logika bisnis RPC dll.
│   └── run.py                 # Titik masuk backend
└── frontend/
    ├── index.html             # UI Dashboard, Tabel Perbandingan, & DOM Elements
    └── src/
        ├── style.css          # Desain Dark Glassmorphism 
        ├── canvas.js          # Kanvas topologi + setNodeStatus() 
        └── main.js            # Orkestrasi komparasi metrik & interaksi
```

---

## 🚀 Cara Menjalankan Project

### Kebutuhan Sistem
- Python 3.12+
- Node.js 18+

### ⚡ Cara Cepat (Rekomendasi — Windows)

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

### 🔧 Cara Manual (Opsional)

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
