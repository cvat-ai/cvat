import json
import base64
from PIL import Image
import io
# from model_handler import ModelHandler
from model_loader import ModelLoader

def init_context(context):
    context.logger.info("Init context...  0%")

    # Read the DL model
    model = ModelLoader('./ctdet_288x384_20200806.pth')
    setattr(context.user_data, 'model', model)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run Centernet model")
    data = event.body
    # buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    # shape = data.get("shape")
    # state = data.get("state")
    # image = Image.open(buf)

    results = context.user_data.model.infer(data["image"], True)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
