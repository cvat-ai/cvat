import json
import base64
import io
from PIL import Image
import yaml
from model_loader import ModelLoader


def init_context(context):
    context.logger.info("Init context...  0%")
    model_path = "/opt/nuclio/faster_rcnn/frozen_inference_graph.pb"
    model_handler = ModelLoader(model_path)
    context.user_data.model_handler = model_handler

    with open("/opt/nuclio/function.yaml", 'rb') as function_file:
        functionconfig = yaml.safe_load(function_file)
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
    context.user_data.labels = labels

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run faster_rcnn_inception_v2_coco model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    (boxes, scores, classes, num_detections) = context.user_data.model_handler.infer(image)

    results = []
    for i in range(int(num_detections[0])):
        obj_class = int(classes[0][i])
        obj_score = scores[0][i]
        obj_label = context.user_data.labels.get(obj_class, "unknown")
        if obj_score >= threshold:
            xtl = boxes[0][i][1] * image.width
            ytl = boxes[0][i][0] * image.height
            xbr = boxes[0][i][3] * image.width
            ybr = boxes[0][i][2] * image.height

            results.append({
                "confidence": str(obj_score),
                "label": obj_label,
                "points": [xtl, ytl, xbr, ybr],
                "type": "rectangle",
            })

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
