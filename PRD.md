# Product Requirements Document (PRD)

## 1. Overview

### 1.1 Judul Project
Simulasi Interaktif Model Komunikasi dalam Sistem Terdistribusi: Studi Kasus Ekosistem Ride-Hailing

### 1.2 Latar Belakang
Project ini bertujuan untuk membangun simulasi interaktif yang memvisualisasikan cara kerja berbagai model komunikasi dalam sistem terdistribusi. Mengambil studi kasus sistem *ride-hailing* (seperti Gojek/Grab), simulasi ini akan memperlihatkan secara langsung perbedaan aliran data, performa, dan interaksi antar komponen saat menggunakan model komunikasi yang berbeda.

### 1.3 Tujuan
- Mengimplementasikan minimal dua model komunikasi terdistribusi secara interaktif menggunakan backend Python.
- Membantu pengguna membandingkan karakteristik performa (seperti *latency* dan *blocking state*) antar model secara visual.
- Memenuhi kriteria penilaian tugas mata kuliah Sistem Paralel dan Terdistribusi dengan metrik yang dapat dipertanggungjawabkan.

---

## 2. Scope

### 2.1 In Scope
- Implementasi fungsional dan visual 4 model komunikasi:
  - **Request-Response:** Simulasi pencarian harga via HTTP/REST API (Sinkron/Blocking).
  - **Publish-Subscribe:** Simulasi *broadcast* pencarian driver menggunakan WebSocket (Asinkron).
  - **Message Passing (Queue):** Simulasi pemrosesan antrean pembayaran menggunakan antrean internal (*Message Queue*).
  - **Remote Procedure Call (RPC):** Simulasi pemanggilan fungsi kalkulasi rute antar modul server.
- Visualisasi aliran pesan secara *real-time* di antarmuka pengguna.
- Panel kontrol untuk memanipulasi parameter simulasi (*Network Delay*, Jumlah Driver).
- Metrik perbandingan visual (*Response Time*, *Throughput*).

### 2.2 Out of Scope
- Deployment ke infrastruktur *cloud* (cukup berjalan di *localhost*).
- Penggunaan *message broker* eksternal yang berat (seperti Kafka); logika antrean akan disimulasikan menggunakan pustaka bawaan Python.
- Database persisten (data hanya disimpan dalam memori/RAM selama sesi simulasi berjalan).

---

## 3. System Architecture & Tech Stack

Arsitektur dirancang dengan pemisahan yang jelas antara logika simulasi (*Backend*) dan visualisasi (*Frontend*):

### 3.1 Backend & Simulation Engine
- **Bahasa Pemrograman:** Python 3.x
- **Web Framework:** Flask (Ringan, modular, dan mudah dikonfigurasi).
- **Real-time Communication:** Flask-SocketIO (Untuk mengirim pembaruan posisi paket pesan dan status simulasi secara instan ke *frontend*).
- **Simulasi Antrean:** Menggunakan modul `queue` bawaan Python atau Celery (opsional jika membutuhkan *worker* terpisah) untuk mensimulasikan *Message Passing*.

### 3.2 Frontend & Interaktivitas
- **Base:** HTML5, Vanilla JavaScript, atau Vue.js ringan (via Vite).
- **Styling:** Tailwind CSS untuk antarmuka yang bersih dan modern.
- **Visualisasi/Animasi:** Canvas API atau pustaka animasi sederhana seperti Anime.js untuk menggerakkan paket data antar node.

---

## 4. Komponen Sistem Terdistribusi (Visual Nodes)

- **Client Node:** Antarmuka pengguna yang memicu *request* (mengirim payload ke server Flask).
- **Broker / Server Node:** Aplikasi Flask yang menerima *request*, menahan pesan (simulasi latensi), lalu meneruskannya.
- **Worker Nodes (Drivers):** Kumpulan modul Python atau koneksi *socket client* yang merespons instruksi dari aplikasi Flask utama.

---

## 5. Interaction & User Interface (UI) Design

### 5.1 Main Dashboard (Canvas)
- Area utama yang memetakan topologi node secara 2D.
- Pergerakan titik cahaya/paket data yang merepresentasikan pesan berpindah dari *Client* $\rightarrow$ *Server* $\rightarrow$ *Driver*.

### 5.2 Simulation Control Panel
- **Dropdown Model:** Memilih model komunikasi yang akan dijalankan (Req-Res, Pub-Sub, Queue, RPC).
- **Slider Parameter:** - *Network Latency* (0ms - 2000ms) untuk menguji performa di jaringan lambat.
  - *Driver Count* (1 - 10 nodes) untuk melihat efek *broadcast* atau antrean.
- **Trigger Button:** Tombol "Pesan Ride" untuk memulai simulasi.

### 5.3 Comparison Dashboard (Mekanisme Perbandingan)
- **Sequence Log:** Daftar urutan pesan masuk dan keluar secara *real-time* yang di-*print* oleh *backend* Flask dan ditampilkan di antarmuka.
- **Metrics Widget:** Menampilkan perbandingan *Response Time* total (dalam milidetik) berdasarkan kalkulasi waktu eksekusi fungsi di Python.

---

## 6. Logic & Communication Behavior

- **Request-Response (REST):** *Frontend* memanggil sebuah rute Flask (`@app.route`). Fungsi Python akan menggunakan `time.sleep()` untuk mensimulasikan *delay* pemrosesan driver, dan UI *Client* berada dalam status *loading* sampai Flask mengembalikan *response*.
- **Publish-Subscribe (WebSocket):** *Client* mengirim satu event melalui SocketIO. Server Flask menerima event tersebut dan langsung menggunakan `emit('order', data, broadcast=True)` ke semua *Worker Nodes*. *Client* dapat langsung melakukan aktivitas lain (*non-blocking*).
- **Queue:** Pesan dari *Client* ditambahkan ke dalam `queue.Queue()` di Python. Sebuah fungsi *background thread* di Flask akan mengambil dan memproses pesan satu per satu, memperlihatkan bagaimana sistem tidak *crash* meski banyak *request* masuk bersamaan.

---

## 7. Kriteria Keberhasilan & Penilaian (Alignment to Rubric)

1. **Akurasi Implementasi:** Terlihat jelas perbedaan *behavior* antara rute HTTP biasa (Req-Res) dan transmisi SocketIO (Pub-Sub) di *backend* Flask.
2. **Representasi Visual:** Frontend merespons *event* dari Flask-SocketIO dengan animasi yang mulus.
3. **Mekanisme Perbandingan:** Terdapat panel metrik *response time* dan urutan eksekusi (*Sequence Log*) yang ditarik dari *backend* Python.
4. **Kreativitas:** Penerapan konsep arsitektur *microservices* ke dalam studi kasus nyata (*Ride-Hailing*).