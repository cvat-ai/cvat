
import base64
import io
import json
from PIL import Image
import numpy as np
from model_loader import ModelLoader

from detectron2 import model_zoo
from detectron2.config import get_cfg
from detectron2.data.detection_utils import read_image
from detectron2.utils.logger import setup_logger
from detectron2.engine import DefaultPredictor
from detectron2.data import MetadataCatalog


def init_context(context):
    context.logger.info("Init context... 0%")
    model_path = 'COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml'
    model_handler = ModelLoader(model_path)
    setattr(context.user_data, 'model_handler', model_handler)
    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("Run detectron2 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    image = Image.open(buf)
    results = context.user_data.model_handler.infer(np.asarray(image))

    return context.Response(body=json.dumps(results), headers={}, content_type="application/json", status_code=200)
