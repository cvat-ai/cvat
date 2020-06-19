import json
import base64
from PIL import Image
import io

def init_context(context):
    context.logger.info("Init context...  0%")
    maskrcnn_handler = None
    setattr(context.user_data, 'maskrcnn_handler', maskrcnn_handler)
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)

    objects = context.user_data.maskrcnn_handler.handle(image)
    return context.Response(body=json.dumps(objects),
                            headers={},
                            content_type='application/json',
                            status_code=200)
