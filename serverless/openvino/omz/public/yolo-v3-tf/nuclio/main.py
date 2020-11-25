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
    context.logger.info("Run yolo-v3-tf model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    results = context.user_data.model.infer(image, threshold)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
