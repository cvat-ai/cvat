import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler
import yaml

def init_context(context):
    context.logger.info("Init context...  0%")

    # Read labels
    functionconfig = yaml.safe_load(open("/opt/nuclio/function.yaml"))
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}

    # Read the DL model
    model = ModelHandler(labels)
    setattr(context.user_data, 'model', model)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run text-detection-0004 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    pixel_threshold = float(data.get("pixel_threshold", 0.8))
    link_threshold = float(data.get("link_threshold", 0.8))
    image = Image.open(buf)

    results = context.user_data.model.infer(image,
        pixel_threshold, link_threshold)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
