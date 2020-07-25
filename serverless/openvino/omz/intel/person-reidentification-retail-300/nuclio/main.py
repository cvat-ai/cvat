import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")

    model = ModelHandler()
    setattr(context.user_data, 'model', model)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run person-reidentification-retail-0300 model")
    data = event.body
    buf0 = io.BytesIO(base64.b64decode(data["image0"].encode('utf-8')))
    buf1 = io.BytesIO(base64.b64decode(data["image1"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    max_distance = float(data.get("max_distance", 50))
    image0 = Image.open(buf0)
    image1 = Image.open(buf1)
    boxes0 = data["boxes0"]
    boxes1 = data["boxes1"]

    results = context.user_data.model.infer(image0, boxes0,
        image1, boxes1, threshold, max_distance)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
