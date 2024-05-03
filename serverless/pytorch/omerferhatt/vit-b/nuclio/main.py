import base64
import io
import json
import yaml

from model_handler import ModelHandler
from PIL import Image


def init_context(context):
    context.logger.info("Init context...  0%")
    with open("/opt/nuclio/function.yaml", "rb") as function_file:
        config_yaml = yaml.load(function_file, Loader=yaml.FullLoader)

    model = ModelHandler()
    context.user_data.labels = [
        label["name"] for label in eval(config_yaml["metadata"]["annotations"]["spec"])
    ]
    context.user_data.yaml = config_yaml
    context.user_data.model = model
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run ViT-B model")
    data = event.body
    image = Image.open(io.BytesIO(base64.b64decode(data["image"]))).convert("RGB")

    class_id, _, score = context.user_data.model.infer(image)

    results = [{
        "confidence": str(score),
        "label": context.user_data.labels[class_id],
        "type": "tag",
        "objectType": "tag",
    }]
    context.logger.info(f"Results: {results}")

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type="application/json",
        status_code=200,
    )
