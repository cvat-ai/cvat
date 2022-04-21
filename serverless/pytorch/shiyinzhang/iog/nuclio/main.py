# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import base64
from PIL import Image
import io
import numpy as np
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")

    model = ModelHandler()
    context.user_data.model = model

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    pos_points = data["pos_points"]
    neg_points = data["neg_points"]
    obj_bbox = data.get("obj_bbox", None)
    threshold = data.get("threshold", 0.8)
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)

    if obj_bbox is None:
        x, y = np.split(np.transpose(np.array(neg_points)), 2)
        obj_bbox = [np.min(x), np.min(y), np.max(x), np.max(y)]
        neg_points = []

    polygon = context.user_data.model.handle(image, obj_bbox,
        pos_points, neg_points, threshold)
    return context.Response(body=json.dumps(polygon),
                            headers={},
                            content_type='application/json',
                            status_code=200)
