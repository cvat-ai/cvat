import json
import base64
from PIL import Image
import io

def handler(context, event):
    context.logger.info("Run yolo-v3-tf model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    image = Image.open(buf)
    image.rotate(90) # dummy work and avoid an unused variable warnings

    return context.Response(body=json.dumps([]), headers={},
        content_type='application/json', status_code=200)
