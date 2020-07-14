import json
import base64
from PIL import Image
import io
from model_loader import ModelLoader
import numpy as np
import cv2
from skimage.measure import approximate_polygon, find_contours
import yaml
import os

def init_context(context):
    context.logger.info("Init context...  0%")

    base_dir = "/opt/nuclio/open_model_zoo/public/mask_rcnn_inception_resnet_v2_atrous_coco/FP32"
    model_xml = os.path.join(base_dir, "mask_rcnn_inception_resnet_v2_atrous_coco.xml")
    model_bin = os.path.join(base_dir, "mask_rcnn_inception_resnet_v2_atrous_coco.bin")
    model_handler = ModelLoader(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)

    functionconfig = yaml.safe_load(open("/opt/nuclio/function.yaml"))
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
    setattr(context.user_data, "labels", labels)

    context.logger.info("Init context...100%")

MASK_THRESHOLD = 0.5

# Ref: https://software.intel.com/en-us/forums/computer-vision/topic/804895
def segm_postprocess(box: list, raw_cls_mask, im_h, im_w):
    ymin, xmin, ymax, xmax = box

    width = int(abs(xmax - xmin))
    height = int(abs(ymax - ymin))

    result = np.zeros((im_h, im_w), dtype=np.uint8)
    resized_mask = cv2.resize(raw_cls_mask, dsize=(height, width), interpolation=cv2.INTER_CUBIC)

    # extract the ROI of the image
    ymin = int(round(ymin))
    xmin = int(round(xmin))
    ymax = ymin + height
    xmax = xmin + width
    result[xmin:xmax, ymin:ymax] = (resized_mask>MASK_THRESHOLD).astype(np.uint8) * 255

    return result

def handler(context, event):
    context.logger.info("Run mask_rcnn_inception_resnet_v2_atrous_coco model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.2))
    image = Image.open(buf)

    output_layer = context.user_data.model_handler.infer(np.array(image))

    results = []
    masks = output_layer['masks']
    boxes = output_layer['reshape_do_2d']

    for index, box in enumerate(boxes):
        obj_class = int(box[1])
        obj_value = box[2]
        obj_label = context.user_data.labels.get(obj_class, "unknown")
        if obj_value >= threshold:
            xtl = box[3] * image.width
            ytl = box[4] * image.height
            xbr = box[5] * image.width
            ybr = box[6] * image.height
            mask = masks[index][obj_class - 1]

            mask = segm_postprocess((xtl, ytl, xbr, ybr),
                mask, image.height, image.width)

            contours = find_contours(mask, MASK_THRESHOLD)
            contour = contours[0]
            contour = np.flip(contour, axis=1)
            contour = approximate_polygon(contour, tolerance=2.5)
            if len(contour) < 3:
                continue

            results.append({
                "confidence": str(obj_value),
                "label": obj_label,
                "points": contour.ravel().tolist(),
                "type": "polygon",
            })

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
