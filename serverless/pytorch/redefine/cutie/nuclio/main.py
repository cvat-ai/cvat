# Copyright (C) 2023 CVAT.ai Corporation
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
    context.logger.info("Run cutie model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    shapes = data.get("shapes")
    states = data.get("states")
    image = Image.open(buf).convert("RGB")
    image = np.asarray(image)

    results = {
        "shapes": [],
        "states": []
    }

    for i, shape in enumerate(shapes):
        shape, state = context.user_data.model.handle(image, shape, states[i] if i<len(states) else None)
        results["shapes"].append(shape)
        results["states"].append(state)

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type='application/json',
        status_code=200
    )