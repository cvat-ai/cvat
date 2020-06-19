import json
import base64
from PIL import Image
import io
import dextr
import sys

dextr_handler = dextr.DEXTR_HANDLER()

def handle(req):
    data = json.loads(req)
    points = data["points"]
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)

    polygon = dextr_handler.handle(image, points)
    return json.dumps(polygon)

output = handle(sys.stdin.read())
print(output)