import json
import base64
import io
import cv2
import numpy
from PIL import Image

import torch
from detectron2.model_zoo import get_config
from detectron2.data import MetadataCatalog
from detectron2.data.detection_utils import convert_PIL_to_numpy
from detectron2.engine.defaults import DefaultPredictor

PANOPTIC2017_CLASSES = {
    0: "unknow",
    1: "person",
    2: "bicycle",
    3: "car",
    4: "motorcycle",
    5: "airplane",
    6: "bus",
    7: "train",
    8: "truck",
    9: "boat",
    10: "traffic light",
    11: "fire hydrant",
    13: "stop sign",
    14: "parking meter",
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
    37: "sports ball",
    38: "kite",
    39: "baseball bat",
    40: "baseball glove",
    41: "skateboard",
    42: "surfboard",
    43: "tennis racket",
    44: "bottle",
    46: "wine glass",
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
    58: "hot dog",
    59: "pizza",
    60: "donut",
    61: "cake",
    62: "chair",
    63: "couch",
    64: "potted plant",
    65: "bed",
    67: "dining table",
    70: "toilet",
    72: "tv",
    73: "laptop",
    74: "mouse",
    75: "remote",
    76: "keyboard",
    77: "cell phone",
    78: "microwave",
    79: "oven",
    80: "toaster",
    81: "sink",
    82: "refrigerator",
    84: "book",
    85: "clock",
    86: "vase",
    87: "scissors",
    88: "teddy bear",
    89: "hair drier",
    90: "toothbrush",
    92: "banner",
    93: "blanket",
    95: "bridge",
    100: "cardboard",
    107: "counter",
    109: "curtain",
    112: "door-stuff",
    118: "floor-wood",
    119: "flower",
    122: "fruit",
    125: "gravel",
    128: "house",
    130: "light",
    133: "mirror-stuff",
    138: "net",
    141: "pillow",
    144: "platform",
    145: "playingfield",
    147: "railroad",
    148: "river",
    149: "road",
    151: "roof",
    154: "sand",
    155: "sea",
    156: "shelf",
    159: "snow",
    161: "stairs",
    166: "tent",
    168: "towel",
    171: "wall-brick",
    175: "wall-stone",
    176: "wall-tile",
    177: "wall-wood",
    178: "water-other",
    180: "window-blind",
    181: "window-other",
    184: "tree-merged",
    185: "fence-merged",
    186: "ceiling-merged",
    187: "sky-other-merged",
    188: "cabinet-merged",
    189: "table-merged",
    190: "floor-other-merged",
    191: "pavement-merged",
    192: "mountain-merged",
    193: "grass-merged",
    194: "dirt-merged",
    195: "paper-merged",
    196: "food-other-merged",
    197: "building-other-merged",
    198: "rock-merged",
    199: "wall-other-merged",
    200: "rug-merged"
}

CONFIG_OPTS = ["MODEL.WEIGHTS", "model_final_cafdb1.pkl"]


def init_context(context):
    context.logger.info("Init context...  0%")
    cfg = get_config('COCO-PanopticSegmentation/panoptic_fpn_R_101_3x.yaml')
    if torch.cuda.is_available():
        CONFIG_OPTS.extend(['MODEL.DEVICE', 'cuda'])
    else:
        CONFIG_OPTS.extend(['MODEL.DEVICE', 'cpu'])
    cfg.merge_from_list(CONFIG_OPTS)
    cfg.freeze()
    predictor = DefaultPredictor(cfg)
    metadata = MetadataCatalog.get(cfg.DATASETS.TRAIN[0])
    context.user_data.stuff_c2d_id = {v: k for k, v in metadata.stuff_dataset_id_to_contiguous_id.items()}
    context.user_data.thing_c2d_id = {v: k for k, v in metadata.thing_dataset_id_to_contiguous_id.items()}
    context.user_data.model_handler = predictor
    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run panoptic_fpn_R_101_3x model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = convert_PIL_to_numpy(Image.open(buf), format="BGR")

    predictions = context.user_data.model_handler(image)

    panoptic_seg, segments_info = predictions["panoptic_seg"]
    panoptic_seg = panoptic_seg.to("cpu").numpy()

    results = []

    for segment in segments_info:
        segment_id = segment["id"]
        category_id = context.user_data.thing_c2d_id[segment["category_id"]] if segment["isthing"] \
            else context.user_data.stuff_c2d_id[segment["category_id"]]

        mask = (panoptic_seg == segment_id).astype(numpy.uint8)
        contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            contour = contour.squeeze()
            if len(contour) > 0:
                points = [coord for point in contour.tolist() for coord in point]
                if len(points) >= 6:
                    results.append({
                        "confidence": "0.5",
                        "label": PANOPTIC2017_CLASSES[category_id],
                        "points": points,
                        "type": "polygon",
                    })

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type='application/json',
        status_code=200
    )
