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

        high_res_feats_0, high_res_feats_1, image_embed, image_ = context.user_data.model.handle(image)

        def process_features(features):
            if features.is_cuda:
                features = features.cpu()
            features_array = np.ascontiguousarray(features.numpy())
            encoded_features = base64.b64encode(features_array).decode()
            return encoded_features

        encoded_feat_0 = process_features(high_res_feats_0)
        encoded_feat_1 = process_features(high_res_feats_1)
        encoded_image_embed = process_features(image_embed)

        return context.Response(
            body=json.dumps({
                'high_res_feats_0': encoded_feat_0,
                'high_res_feats_1': encoded_feat_1,
                'image_embed': encoded_image_embed
            }),
            headers={},
            content_type='application/json',
            status_code=200
        )

    except Exception as e:
        context.logger.error(f"Error creating response: {str(e)}", exc_info=True)
        return context.Response(
            body=json.dumps({'error': 'Internal server error'}),
            headers={},
            content_type='application/json',
            status_code=500
        )
