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

    # Read the DL model
    model = ModelHandler(labels)
    context.user_data.model = model

    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run YoloV7 ONNX model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    keyword = data.get("keyword")

    # Log checkpoint info
    if keyword:
        context.logger.info(f"Checkpoint received from request: {keyword}")
    else:
        context.logger.info("No checkpoint provided, using current model")

    image = Image.open(buf).convert("RGB")

    # Reload model if checkpoint is provided and different from current
    if keyword:
        context.user_data.model.load_network(model=keyword)
