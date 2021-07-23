import json
import base64
import io
from PIL import Image

import torch
from detectron2.model_zoo import get_config
from detectron2.data.detection_utils import convert_PIL_to_numpy
from detectron2.engine.defaults import DefaultPredictor
from detectron2.data.datasets.builtin_meta import COCO_CATEGORIES

CONFIG_OPTS = ["MODEL.WEIGHTS", "model_final_971ab9.pkl"]
CONFIDENCE_THRESHOLD = 0.5

def init_context(context):
    context.logger.info("Init context...  0%")

    cfg = get_config('COCO-Detection/retinanet_R_101_FPN_3x.yaml')
    if torch.cuda.is_available():
        CONFIG_OPTS.extend(['MODEL.DEVICE', 'cuda'])
    else:
        CONFIG_OPTS.extend(['MODEL.DEVICE', 'cpu'])

    cfg.merge_from_list(CONFIG_OPTS)
    cfg.MODEL.RETINANET.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.PANOPTIC_FPN.COMBINE.INSTANCES_CONFIDENCE_THRESH = CONFIDENCE_THRESHOLD
    cfg.freeze()
    predictor = DefaultPredictor(cfg)

    context.user_data.model_handler = predictor

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run retinanet-R101 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    image = convert_PIL_to_numpy(Image.open(buf), format="BGR")

    predictions = context.user_data.model_handler(image)

    instances = predictions['instances']
    pred_boxes = instances.pred_boxes
    scores = instances.scores
    pred_classes = instances.pred_classes
    results = []
    for box, score, label in zip(pred_boxes, scores, pred_classes):
        label = COCO_CATEGORIES[int(label)]["name"]
        if score >= threshold:
            results.append({
                "confidence": str(float(score)),
                "label": label,
                "points": box.tolist(),
                "type": "rectangle",
            })

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
