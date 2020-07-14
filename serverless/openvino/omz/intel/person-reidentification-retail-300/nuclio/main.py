import json
import base64
from PIL import Image
import io
import os

from reid import ReID

def init_context(context):
    context.logger.info("Init context...  0%")

    base_dir = "/opt/nuclio/open_model_zoo/intel/person-reidentification-retail-0300/FP32"
    model_xml = os.path.join(base_dir, "person-reidentification-retail-0300.xml")
    model_bin = os.path.join(base_dir, "person-reidentification-retail-0300.bin")
    model_handler = ReID(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run person-reidentification-retail-0300 model")
    data = event.body
    buf0 = io.BytesIO(base64.b64decode(data["images"][0].encode('utf-8')))
    buf1 = io.BytesIO(base64.b64decode(data["images"][1].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    max_distance = float(data.get("max_distance"), 50)
    image0 = Image.open(buf0)
    image1 = Image.open(buf1)
    boxes0 = data["annotations"]["shapes"][0]
    boxes1 = data["annotations"]["shapes"][1]

    results = context.user_data.model_handler.infer(image0, boxes0,
        image1, boxes1, threshold, max_distance)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
