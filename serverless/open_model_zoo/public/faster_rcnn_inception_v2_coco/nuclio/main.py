import json
import base64
from PIL import Image
import io
from model_loader import ModelLoader
import numpy as np

def init_context(context):
    context.logger.info("Init context...  0%")
    model_xml = "/opt/nuclio/open_model_zoo/public/faster_rcnn_inception_v2_coco/FP32/faster_rcnn_inception_v2_coco.xml"
    model_bin = "/opt/nuclio/open_model_zoo/public/faster_rcnn_inception_v2_coco/FP32/faster_rcnn_inception_v2_coco.bin"
    model_handler = ModelLoader(model_xml, model_bin)
    setattr(context.user_data, 'model_handler', model_handler)
    labels = {
            1: "person",
            2: "bicycle",
            3: "car",
            4: "motorcycle",
            5: "airplane",
            6: "bus",
            7: "train",
            8: "truck",
            9: "boat",
            10: "traffic_light",
            11: "fire_hydrant",
            13: "stop_sign",
            14: "parking_meter",
            15: "bench",
            16: "bird",
            17: "cat",
            18: "dog",
            19: "horse",
            20: "sheep",
            21: "cow",
            22: "elephant",
            23: "bear",
            24: "zebra",
            25: "giraffe",
            27: "backpack",
            28: "umbrella",
            31: "handbag",
            32: "tie",
            33: "suitcase",
            34: "frisbee",
            35: "skis",
            36: "snowboard",
            37: "sports_ball",
            38: "kite",
            39: "baseball_bat",
            40: "baseball_glove",
            41: "skateboard",
            42: "surfboard",
            43: "tennis_racket",
            44: "bottle",
            46: "wine_glass",
            47: "cup",
            48: "fork",
            49: "knife",
            50: "spoon",
            51: "bowl",
            52: "banana",
            53: "apple",
            54: "sandwich",
            55: "orange",
            56: "broccoli",
            57: "carrot",
            58: "hot_dog",
            59: "pizza",
            60: "donut",
            61: "cake",
            62: "chair",
            63: "couch",
            64: "potted_plant",
            65: "bed",
            67: "dining_table",
            70: "toilet",
            72: "tv",
            73: "laptop",
            74: "mouse",
            75: "remote",
            76: "keyboard",
            77: "cell_phone",
            78: "microwave",
            79: "oven",
            80: "toaster",
            81: "sink",
            83: "refrigerator",
            84: "book",
            85: "clock",
            86: "vase",
            87: "scissors",
            88: "teddy_bear",
            89: "hair_drier",
            90: "toothbrush"
    }
    setattr(context.user_data, "labels", labels)
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run faster_rcnn_inception_v2_coco model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    output_layer = context.user_data.model_handler.infer(np.array(image))

    results = []
    prediction = output_layer[0][0]
    for obj in prediction:
        obj_class = int(obj[1])
        obj_value = obj[2]
        obj_label = context.user_data.labels.get(obj_class, "unknown")
        if obj_value >= threshold:
            xtl = obj[3] * image.width
            ytl = obj[4] * image.height
            xbr = obj[5] * image.width
            ybr = obj[6] * image.height

            results.append({
                "confidence": str(obj_value),
                "label": obj_label,
                "points": [xtl, ytl, xbr, ybr],
                "type": "rectangle",
            })

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
