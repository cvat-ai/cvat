# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import base64
import io
import json

from model_handler import ModelHandler
from PIL import Image


def init_context(context):
    context.logger.info("Init context...  0%")
    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")


def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    image = Image.open(buf)
    image = image.convert("RGB")  #  to make sure image comes in RGB
    features = context.user_data.model.handle(image)

    return context.Response(
        body=json.dumps(
            {
                "blob": base64.b64encode(
                    features.cpu().numpy() if features.is_cuda else features.numpy()
                ).decode(),
            }
        ),
        headers={},
        content_type="application/json",
        status_code=200,
    )
