import json
import base64
from PIL import Image
import io
import os
from model_loader import ModelLoader
import numpy as np
import yaml
from skimage.measure import approximate_polygon, find_contours
import cv2

def init_context(context):
    context.logger.info("Init context...  0%")

    # Read the DL model
    base_dir = "/opt/nuclio/open_model_zoo/public/semantic-segmentation-adas-0001/FP32"
    model_xml = os.path.join(base_dir, "semantic-segmentation-adas-0001.xml")
    model_bin = os.path.join(base_dir, "semantic-segmentation-adas-0001.bin")
    model_handler = ModelLoader(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)

    # Read labels
    functionconfig = yaml.safe_load(open("/opt/nuclio/function.yaml"))
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
    setattr(context.user_data, "labels", labels)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run semantic-segmentation-adas-0001 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    output_layer = context.user_data.model_handler.infer(np.array(image))

    results = []
    # TODO: need to implement the function
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

    ##############################

    # for frame_results in detections:
    #     frame_height = frame_results['frame_height']
    #     frame_width = frame_results['frame_width']
    #     frame_number = frame_results['frame_id']
    #     detection = frame_results['detections']
    #     detection = detection[0, 0, :, :]
    #     width, height = detection.shape

    #     for i in range(21):
    #         zero = np.zeros((width,height),dtype=np.uint8)

    #         f = float(i)
    #         zero = ((detection == f) * 255).astype(np.float32)
    #         zero = cv2.resize(zero, dsize=(frame_width, frame_height), interpolation=cv2.INTER_CUBIC)

    #         contours = find_contours(zero, 0.8)

    #         for contour in contours:
    #             contour = np.flip(contour, axis=1)
    #             contour = approximate_polygon(contour, tolerance=2.5)
    #             segmentation = contour.tolist()
    #             if len(segmentation) < 3:
    #                 continue

    #             results.add_polygon(segmentation, i, frame_number)


    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
