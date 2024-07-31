# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import base64
from PIL import Image
import io
import torch
from model_handler import ModelHandler

def init_context(context):
    # use bfloat16 for the entire notebook
    torch.autocast(device_type="cuda", dtype=torch.bfloat16).__enter__()

    if torch.cuda.get_device_properties(0).major >= 8:
        # turn on tfloat32 for Ampere GPUs (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("call handler")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    context.logger.info(f"data: {data}")
    image = Image.open(buf)
    image = image.convert("RGB")  # to make sure image comes in RGB
    pos_points = data["pos_points"]
    neg_points = data["neg_points"]

    mask = context.user_data.model.handle(image, pos_points, neg_points)

    return context.Response(
        body=json.dumps({ 'mask': mask.tolist() }),
        headers={},
        content_type='application/json',
        status_code=200
    )
