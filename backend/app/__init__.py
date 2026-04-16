from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

socketio = SocketIO()


def create_app(config_overrides=None):
    flask_app = Flask(__name__)
    flask_app.config.from_object("app.config.DefaultConfig")
    if config_overrides:
        flask_app.config.update(config_overrides)

    CORS(flask_app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(flask_app, cors_allowed_origins="*", async_mode="threading")

    # Initialize MQTT for simulation
    from app.mqtt_client import init_mqtt
    mqtt_client = init_mqtt(flask_app)
    mqtt_client.user_data_set({'socketio': socketio})

    @flask_app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    from app.routes.req_res import req_res_bp
    flask_app.register_blueprint(req_res_bp)

    from app.routes.message_queue import message_queue_bp
    flask_app.register_blueprint(message_queue_bp)

    from app.routes.rpc import rpc_bp
    flask_app.register_blueprint(rpc_bp)

    import app.routes.pub_sub  # registers socketio event handlers

    return flask_app
