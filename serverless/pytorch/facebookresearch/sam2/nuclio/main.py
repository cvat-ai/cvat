# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import numpy as np
import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler


def init_context(context):
    context.logger.info("Init context...  0%")
    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")


def handler(context, event):
    try:
        context.logger.info("call handler")
        data = event.body
        buf = io.BytesIO(base64.b64decode(data["image"]))
        image = Image.open(buf)
        image = image.convert("RGB")  # to make sure image comes in RGB
        features = context.user_data.model.handle(image)

        if features.is_cuda:
            features = features.cpu()
        features_array = np.ascontiguousarray(features.numpy())
        encoded_features = base64.b64encode(features_array).decode()

        return context.Response(
            body=json.dumps({'blob': encoded_features}),
            headers={},
            content_type='application/json',
            status_code=200
        )

    except Exception as e:
        context.logger.info.error(f"Error creating response: {str(e)}", exc_info=True)
        return context.Response(
            body=json.dumps({'error': 'Internal server error'}),
            headers={},
            content_type='application/json',
            status_code=500
        )
