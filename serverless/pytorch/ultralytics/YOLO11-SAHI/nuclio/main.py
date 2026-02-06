import io
import base64
import json
import torch

import cv2
import numpy as np
from ultralytics import YOLO
from ultralytics.engine.results import Results
from sahi.predict import get_sliced_prediction
from torch import tensor
from sahi import AutoDetectionModel

LABELS_DETECTION_MAP = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    3: 'motorcycle',
    4: 'airplane',
    5: 'bus',
    6: 'train',
    7: 'truck',
    8: 'boat',
    9: 'traffic light',
    10: 'fire hydrant',
    11: 'stop sign',
    12: 'parking meter',
    13: 'bench',
    14: 'bird',
    15: 'cat',
    16: 'dog',
    17: 'horse',
    18: 'sheep',
    19: 'cow',
    20: 'elephant',
    21: 'bear',
    22: 'zebra',
    23: 'giraffe',
    24: 'backpack',
    25: 'umbrella',
    26: 'handbag',
    27: 'tie',
    28: 'suitcase',
    29: 'frisbee',
    30: 'skis',
    31: 'snowboard',
    32: 'sports ball',
    33: 'kite',
    34: 'baseball bat',
    35: 'baseball glove',
    36: 'skateboard',
    37: 'surfboard',
    38: 'tennis racket',
    39: 'bottle',
    40: 'wine glass',
    41: 'cup',
    42: 'fork',
    43: 'knife',
    44: 'spoon',
    45: 'bowl',
    46: 'banana',
    47: 'apple',
    48: 'sandwich',
    49: 'orange',
    50: 'broccoli',
    51: 'carrot',
    52: 'hot dog',
    53: 'pizza',
    54: 'donut',
    55: 'cake',
    56: 'chair',
    57: 'couch',
    58: 'potted plant',
    59: 'bed',
    60: 'dining table',
    61: 'toilet',
    62: 'tv',
    63: 'laptop',
    64: 'mouse',
    65: 'remote',
    66: 'keyboard',
    67: 'cell phone',
    68: 'microwave',
    69: 'oven',
    70: 'toaster',
    71: 'sink',
    72: 'refrigerator',
    73: 'book',
    74: 'clock',
    75: 'vase',
    76: 'scissors',
    77: 'teddy bear',
    78: 'hair drier',
    79: 'toothbrush'
}


def sahi_result_to_ultralytics_results(image_np, sahi_results):
    return Results(
        image_np,
        "",
        LABELS_DETECTION_MAP,
        boxes=tensor(
            [
                [
                    bb.bbox.minx,
                    bb.bbox.miny,
                    bb.bbox.maxx,
                    bb.bbox.maxy,
                    bb.score.value,
                    bb.category.id,
                ]
                for bb in sahi_results.object_prediction_list
            ]
            if len(sahi_results.object_prediction_list) > 0
            else torch.empty((0, 6))
        ),
    )


def init_context(context):
    model = YOLO("yolo11l")
    context.user_data.model_handler = AutoDetectionModel.from_pretrained(
        model_type="yolov11", model=model
    )


def handler(context, event):
    context.logger.info("Run custom yolov11 model")
    data = event.body
    image_buffer = io.BytesIO(base64.b64decode(data["image"]))
    image = cv2.imdecode(
        np.frombuffer(image_buffer.getvalue(), np.uint8), cv2.IMREAD_COLOR
    )

    sahi_results = get_sliced_prediction(
        image,
        context.user_data.model_handler,
        auto_slice_resolution=True,
        verbose=True,
    )

    boxes = []
    clss = []
    confs = []
    for prediction in sahi_results.object_prediction_list:
        boxes.append(
            [
                prediction.bbox.minx,
                prediction.bbox.miny,
                prediction.bbox.maxx,
                prediction.bbox.maxy,
            ]
        )
        confs.append(prediction.score.value)
        clss.append(prediction.category.id)


    detections = []
    for box, conf, class_value in zip(boxes, confs, clss):
        label = LABELS_DETECTION_MAP[int(class_value)]
        detections.append(
            {
                "confidence": str(float(conf)),
                "label": label,
                "points": box,
                "type": "rectangle",
            }
        )

    return context.Response(
        body=json.dumps(detections),
        headers={},
        content_type="application/json",
        status_code=200,
    )
