import json
import base64
from PIL import Image
import io
import torch
from ultralytics import YOLO
import supervision as sv


def init_context(context):
    context.logger.info("Init context...  0%")

    model_path = "yolov8m.pt"

    model = YOLO(model_path)

    # Read the DL model
    context.user_data.model = model

    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run yolo-v8 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    context.user_data.model.conf = threshold
    image = Image.open(buf)

    yolo_results = context.user_data.model(image, conf=threshold)[0]
    labels = yolo_results.names
    detections = sv.Detections.from_yolov8(yolo_results)

    detections = detections[detections.confidence > threshold]
    boxes = detections.xyxy
    conf = detections.confidence
    class_ids = detections.class_id

    results = []
    
    if boxes.shape[0] > 0:

        for label, score, box in zip(class_ids, conf, boxes):
          
            xtl = int(box[0])
            ytl = int(box[1])
            xbr = int(box[2])
            ybr = int(box[3])

            results.append({
                    "confidence": str(score),
                    "label": labels.get(label, "unknown"),
                    "points": [xtl, ytl, xbr, ybr],
                    "type": "rectangle",})

    return context.Response(body=json.dumps(results), headers={},
                            content_type='application/json', status_code=200)
