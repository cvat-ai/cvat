import base64
import io
import json
import os

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
    context.logger.info("Run YOLOv8 ONNX model")
    data = event.body

    # Parse JSON if data is a string
    if isinstance(data, str):
        data = json.loads(data)

    context.logger.info(f"Received data: {data}")

    # Check if this is a request to list available checkpoints
    if data and data.get("list_checkpoints"):
        context.logger.info("Listing available checkpoints")
        checkpoint_files = [f for f in os.listdir('.') if f.endswith('.onnx')]
        context.logger.info(f"Found checkpoints: {checkpoint_files}")
        return context.Response(body=json.dumps({"checkpoints": checkpoint_files}),
            headers={},
            content_type='application/json',
            status_code=200
        )

    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.25))
    keyword = data.get("keyword", None)

    if keyword:
        context.logger.info(f"Checkpoint received from request: {keyword}")
    else:
        context.logger.info("No checkpoint provided, using current model")

    image = Image.open(buf).convert("RGB")

    results = context.user_data.model.infer(image, threshold, checkpoint=keyword)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
