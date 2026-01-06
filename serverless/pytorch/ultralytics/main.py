# Copyright (C) 2026 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json

from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...   0%")
    model = ModelHandler(context.logger)
    context.user_data.model = model
    context.logger.info("Init context... 100%")

def handler(context, event):
    """

    Args:
        context:
        event:
            event.body: {
                "image": image,               # base64
                "objects": [{
                    "points": [],             # polygons or bboxes
                    "label": "",              # origin label
                    "shapeType": type,        # bbox | polygons | mask (TODO: mask not support)
                    "clientID": annotationId, # annotation object unique ID
                }, ...]
            }
    Returns:

    """
    context.logger.info("call handler")
    shapes = context.user_data.model.handle(event.body)
    return context.Response(body=json.dumps(shapes), content_type='application/json', status_code=200)
