import paho.mqtt.client as mqtt
import json
import logging

logger = logging.getLogger(__name__)

# Global MQTT Client
_mqtt_client = None

# We use global callbacks mapping to dispatch messages based on topics
# e.g. {"sim/ride/orders": pub_sub_callback, "sim/ride/payments": message_queue_callback}
_topic_callbacks = {}

def get_mqtt_client():
    global _mqtt_client
    if _mqtt_client is None:
        raise RuntimeError("MQTT Client has not been initialized.")
    return _mqtt_client

def init_mqtt(app):
    """
    Initializes the MQTT client, connects to the public broker, 
    and starts the background loop.
    """
    global _mqtt_client
    
    if _mqtt_client is not None:
        return _mqtt_client

    # Initialize the client. The callback API version 2 is recommended for paho-mqtt >= 2.0
    _mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            logger.info("Successfully connected to public MQTT broker.")
            # Subscribe to topics we care about
            for topic in _topic_callbacks.keys():
                client.subscribe(topic)
                logger.info(f"Subscribed to MQTT topic: {topic}")
        else:
            logger.error(f"Failed to connect to MQTT broker, reason code: {reason_code}")

    def on_message(client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            logger.info(f"Received MQTT Message on {topic}: {payload}")
            
            # Dispatch to registered callback
            if topic in _topic_callbacks:
                socketio_instance = userdata.get('socketio')
                _topic_callbacks[topic](payload, socketio_instance)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    _mqtt_client.on_connect = on_connect
    _mqtt_client.on_message = on_message
    
    # We will pass socketio instance as userdata so callbacks can emit to UI
    # This will be set by the caller right after initialization
    _mqtt_client.user_data_set({'socketio': None})
    
    try:
        # We use EMQX public broker for simulation purposes
        host = "broker.emqx.io"
        port = 1883
        
        logger.info(f"Connecting to MQTT broker at {host}:{port}...")
        _mqtt_client.connect(host, port, 60)
        
        # Start the network loop in a background thread
        _mqtt_client.loop_start()
    except Exception as e:
        logger.error(f"Failed to initialize MQTT: {e}")
        
    return _mqtt_client

def register_topic_callback(topic, callback):
    """
    Register a function to be called when a message arrives on a given topic.
    """
    _topic_callbacks[topic] = callback
    if _mqtt_client and _mqtt_client.is_connected():
        _mqtt_client.subscribe(topic)

def publish_message(topic, payload):
    """
    Publish a JSON payload to a given topic.
    """
    client = get_mqtt_client()
    client.publish(topic, json.dumps(payload))
    logger.info(f"Published to {topic}: {payload}")
