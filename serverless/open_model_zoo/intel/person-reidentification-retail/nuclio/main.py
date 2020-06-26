import json
import base64
from PIL import Image
import io
from model_loader import ModelLoader
import numpy as np

def init_context(context):
    context.logger.info("Init context...  0%")
    model_xml = "/opt/nuclio/open_model_zoo/intel/person-reidentification-retail-300/FP32/person-reidentification-retail-300.xml"
    model_bin = "/opt/nuclio/open_model_zoo/intel/person-reidentification-retail-300/FP32/person-reidentification-retail-300.bin"
    model_handler = ModelLoader(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run faster_rcnn_inception_v2_coco model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    #threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    #output_layer = context.user_data.model_handler.infer(np.array(image))

    results = []

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
