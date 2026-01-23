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

    # Hardcoded model configuration
    model_path = "yolo_streetlight_640_v01.onnx"
    conf_threshold = 0.25
    iou_threshold = 0.6
    input_size = 640

    # Initialize the model
    model = ModelHandler(
        labels=labels,
        model_path=model_path,
        input_size=input_size,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold
    )
    context.user_data.model = model

    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run YOLOv11 ONNX detection model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))

    # Allow threshold override from request, default to model's configured threshold
    threshold = float(data.get("threshold", context.user_data.model.conf_threshold))

    image = Image.open(buf).convert("RGB")

    results = context.user_data.model.infer(image, threshold)

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type='application/json',
        status_code=200
    )
