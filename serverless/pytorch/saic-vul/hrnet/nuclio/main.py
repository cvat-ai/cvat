# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")

    model = ModelHandler() # pylint: disable=no-value-for-parameter
    context.user_data.model = model

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    pos_points = data["pos_points"]
    neg_points = data["neg_points"]
    threshold = data.get("threshold", 0.5)
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf).convert('RGB')

    mask = context.user_data.model.handle(image, pos_points, neg_points, threshold)
    return context.Response(
        body=json.dumps({ 'mask': mask.tolist() }),
        headers={},
        content_type='application/json',
        status_code=200
    )
