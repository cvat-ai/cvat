import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler
import debugpy
debugpy.listen(5678)

def init_context(context):
    context.logger.info("Init context...  0%")
    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    pos_points = data["pos_points"]
    neg_points = data["neg_points"]
    #obj_bbox = data.get("obj_bbox", None)
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)
    image = image.convert("RGB")  #  to make sure image comes in RGB
    mask, polygon = context.user_data.model.handle(image, pos_points, neg_points)
    return context.Response(body=json.dumps({
            'points': polygon,
            'mask': mask.tolist(),
        }),
        headers={},
        content_type='application/json',
        status_code=200
    )
