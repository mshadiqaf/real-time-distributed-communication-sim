# File ini adalah titik awal pembuatan aplikasi Flask.
# Kita pakai pola Application Factory supaya konfigurasi bisa diganti-ganti,
# misalnya saat testing tidak perlu buka koneksi ke broker MQTT sungguhan.

from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

# Instance socketio dibuat di sini supaya bisa diakses dari file lain
socketio = SocketIO()


def create_app(config_overrides=None):
    # Fungsi ini berguna untuk membuat dan menyiapkan seluruh aplikasi Flask
    flask_app = Flask(__name__)
    flask_app.config.from_object("app.config.DefaultConfig")

    # Timpa konfigurasi jika ada yang dikirim, misalnya saat testing
    if config_overrides:
        flask_app.config.update(config_overrides)

    # Izinkan frontend (Vite) untuk mengakses endpoint /api/* meski beda port
    CORS(flask_app, resources={r"/api/*": {"origins": "*"}})

    # Mode threading dipilih supaya kompatibel dengan paho-mqtt yang punya loop sendiri
    socketio.init_app(flask_app, cors_allowed_origins="*", async_mode="threading")

    # Inisialisasi klien MQTT dan hubungkan socketio ke dalamnya
    # supaya callback MQTT bisa mengirim event ke browser
    from app.mqtt_client import init_mqtt
    mqtt_client = init_mqtt(flask_app)
    mqtt_client.user_data_set({'socketio': socketio})

    @flask_app.get("/api/health")
    def health():
        # Endpoint sederhana untuk mengecek apakah server sedang berjalan
        return jsonify({"status": "ok"})

    # Daftarkan semua blueprint route
    from app.routes.req_res import req_res_bp
    flask_app.register_blueprint(req_res_bp)

    from app.routes.message_queue import message_queue_bp
    flask_app.register_blueprint(message_queue_bp)

    from app.routes.rpc import rpc_bp
    flask_app.register_blueprint(rpc_bp)

    # pub_sub tidak pakai Blueprint, cukup diimport agar @socketio.on() terdaftar
    import app.routes.pub_sub  # noqa: F401

    return flask_app
