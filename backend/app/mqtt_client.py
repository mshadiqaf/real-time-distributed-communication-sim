# File ini mengelola satu koneksi MQTT yang dipakai bersama oleh seluruh aplikasi.
# Kita pakai pola Singleton supaya tidak ada dua koneksi ke broker yang terbuka sekaligus.
# Setiap topik MQTT bisa punya callback-nya sendiri lewat register_topic_callback().

import paho.mqtt.client as mqtt
import json
import logging

logger = logging.getLogger(__name__)

_mqtt_client = None      # Instance klien MQTT, dibuat sekali saja
_topic_callbacks = {}    # Pemetaan topik → fungsi yang dipanggil saat pesan datang


def get_mqtt_client():
    # Fungsi ini berguna untuk mengambil instance klien MQTT yang sudah aktif
    global _mqtt_client
    if _mqtt_client is None:
        raise RuntimeError("MQTT Client belum diinisialisasi. Panggil init_mqtt() dulu.")
    return _mqtt_client


def init_mqtt(app):
    # Fungsi ini berguna untuk membuat koneksi ke broker MQTT publik EMQX
    # dan menjalankan loop jaringannya di background thread
    global _mqtt_client

    # Jangan buat ulang kalau sudah ada
    if _mqtt_client is not None:
        return _mqtt_client

    _mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

    def on_connect(client, userdata, flags, reason_code, properties):
        # Dipanggil saat koneksi ke broker selesai (berhasil atau gagal)
        if reason_code == 0:
            logger.info("Berhasil terhubung ke broker MQTT publik.")
            for topic in _topic_callbacks.keys():
                client.subscribe(topic)
                logger.info(f"Subscribe ke topik: {topic}")
        else:
            logger.error(f"Gagal terhubung, kode: {reason_code}")

    def on_message(client, userdata, msg):
        # Dipanggil setiap kali ada pesan masuk dari topik yang di-subscribe
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            logger.info(f"Pesan diterima di {topic}: {payload}")
            if topic in _topic_callbacks:
                socketio_instance = userdata.get('socketio')
                _topic_callbacks[topic](payload, socketio_instance)
        except Exception as e:
            logger.error(f"Error memproses pesan MQTT: {e}")

    _mqtt_client.on_connect = on_connect
    _mqtt_client.on_message = on_message
    _mqtt_client.user_data_set({'socketio': None})  # Akan diisi oleh create_app()

    try:
        logger.info("Menghubungkan ke broker.emqx.io:1883...")
        _mqtt_client.connect("broker.emqx.io", 1883, keepalive=60)
        _mqtt_client.loop_start()  # Jalankan di background thread agar tidak blokir Flask
    except Exception as e:
        logger.error(f"Gagal koneksi MQTT: {e}")

    return _mqtt_client


def register_topic_callback(topic, callback):
    # Fungsi ini berguna untuk mendaftarkan fungsi yang akan dipanggil
    # setiap kali ada pesan masuk di topik tertentu
    _topic_callbacks[topic] = callback
    if _mqtt_client and _mqtt_client.is_connected():
        _mqtt_client.subscribe(topic)


def publish_message(topic, payload):
    # Fungsi ini berguna untuk mengirim pesan JSON ke topik MQTT tertentu
    client = get_mqtt_client()
    client.publish(topic, json.dumps(payload))
    logger.info(f"Diterbitkan ke {topic}: {payload}")
