import json
import base64
from PIL import Image
import io
import dextr
import sys
import time

def init_context(context):
    context.logger.info("Init context...  0%")
    dextr_handler = dextr.DEXTR_HANDLER()
    setattr(context.user_data, 'dextr_handler', dextr_handler)
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    points = data["points"]
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    image = Image.open(buf)

    polygon = context.user_data.dextr_handler.handle(image, points)
    return context.Response(body=json.dumps(polygon),
                            headers={},
                            content_type='application/json',
                            status_code=200)
