import json
import base64
from PIL import Image
import io
import os
from model_loader import ModelLoader
import numpy as np
import yaml

def init_context(context):
    context.logger.info("Init context...  0%")

    # Read the DL model
    base_dir = "/opt/nuclio/open_model_zoo/public/text-detection-0004/FP32"
    model_xml = os.path.join(base_dir, "text-detection-0004.xml")
    model_bin = os.path.join(base_dir, "text-detection-0004.bin")
    model_handler = ModelLoader(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)

    # Read labels
    functionconfig = yaml.safe_load(open("/opt/nuclio/function.yaml"))
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
    setattr(context.user_data, "labels", labels)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run text-detection-0004 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    output_layer = context.user_data.model_handler.infer(np.array(image))

    results = []
    # TODO: need to implement
    # prediction = output_layer[0][0]
    # for obj in prediction:
    #     obj_class = int(obj[1])
    #     obj_value = obj[2]
    #     obj_label = context.user_data.labels.get(obj_class, "unknown")
    #     if obj_value >= threshold:
    #         xtl = obj[3] * image.width
    #         ytl = obj[4] * image.height
    #         xbr = obj[5] * image.width
    #         ybr = obj[6] * image.height

    #         results.append({
    #             "confidence": str(obj_value),
    #             "label": obj_label,
    #             "points": [xtl, ytl, xbr, ybr],
    #             "type": "rectangle",
    #         })

    ####################################

    # label = 1
    # pcd = PixelLinkDecoder()
    # for detection in detections:
    #     frame = detection['frame_id']
    #     pcd.decode(detection['frame_height'], detection['frame_width'], detection['detections'])
    #     for box in pcd.bboxes:
    #         box = [[int(b[0]), int(b[1])] for b in box]
    #         results.add_polygon(box, label, frame)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
