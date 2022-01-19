# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import base64
from PIL import Image
import io
from model_handler import FaceDetectorHandler, AttributesExtractorHandler

def init_context(context):
    context.logger.info("Init context...  0%")

     # Read the DL model
    context.user_data.detector_model = FaceDetectorHandler()
    context.user_data.attributes_model = AttributesExtractorHandler()

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run face-detection-0206 model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf)

    results, faces = context.user_data.detector_model.infer(image, threshold)
    for idx, face in enumerate(faces):
        attributes =  context.user_data.attributes_model.infer(face)
        results[idx].update(attributes)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
