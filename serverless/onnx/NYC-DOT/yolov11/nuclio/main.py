import base64
import io
import json

import yaml
from model_handler import ModelHandler
from PIL import Image


def init_context(context):
    context.logger.info("Init context...  0%")

    # Read labels
    with open("/opt/nuclio/function.yaml", 'rb') as function_file:
        functionconfig = yaml.safe_load(function_file)

    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}

    # Default model configuration - will be used if no JSON config exists
    default_model = "yolo11_speed_sign_detection_v01.onnx"
    model_config = {
        'model_path': default_model,
        'input_size': 1280,
        'conf_threshold': 0.3,
        'iou_threshold': 0.45
    }

    # Try to load configuration from JSON file if it exists
    try:
        loaded_config = ModelHandler.load_model_config(default_model)
        model_config = loaded_config
        context.logger.info(f"Loaded JSON configuration for {model_config.get('model_name', default_model)}")
        context.logger.info(f"Input size: {model_config['input_size']}, "
                          f"Conf threshold: {model_config['conf_threshold']}, "
                          f"IoU threshold: {model_config['iou_threshold']}")
    except FileNotFoundError:
        context.logger.warning(f"No JSON config found for {default_model}, using default values")
        context.logger.info(f"Default - Input size: {model_config['input_size']}, "
                          f"Conf threshold: {model_config['conf_threshold']}, "
                          f"IoU threshold: {model_config['iou_threshold']}")
    except Exception as e:
        context.logger.error(f"Error loading model config: {e}, using default values")

    # Initialize the model
    model = ModelHandler(
        labels=labels,
        model_path=model_config['model_path'],
        input_size=model_config['input_size'],
        conf_threshold=model_config['conf_threshold'],
        iou_threshold=model_config['iou_threshold']
    )
    context.user_data.model = model

    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run YOLOv11 ONNX detection model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))

    # Allow threshold override from request, default to model's configured threshold
    threshold = float(data.get("threshold", context.user_data.model.conf_threshold))
    keyword = data.get("keyword")

    # Log checkpoint info
    if keyword:
        context.logger.info(f"Checkpoint received from request: {keyword}")
    else:
        context.logger.info(f"No checkpoint provided, using current: {context.user_data.model.model_path}")

    # Reload model if checkpoint is provided and different from current
    if keyword:
        context.user_data.model.load_network(model_path=keyword)

    image = Image.open(buf).convert("RGB")

    results = context.user_data.model.infer(image, threshold)

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type='application/json',
        status_code=200
    )
