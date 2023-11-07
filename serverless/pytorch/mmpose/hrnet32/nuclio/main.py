# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import base64
import io
import yaml
import numpy as np
from PIL import Image

from mmpose.apis import MMPoseInferencer

def init_context(context):
    context.logger.info("Init detector...")

    det_config = "/opt/nuclio/mmpose/projects/rtmpose/rtmdet/person/rtmdet_nano_320-8xb32_coco-person.py"
    det_checkpoint = "/opt/nuclio/rtmdet_nano_8xb32-100e_coco-obj365-person-05d8511e.pth"
    pose_config = "/opt/nuclio/mmpose/configs/wholebody_2d_keypoint/topdown_heatmap/ubody2d/td-hm_hrnet-w32_8xb64-210e_ubody-256x192.py"
    pose_checkpoint = "/opt/nuclio/td-hm_hrnet-w32_8xb64-210e_ubody-coco-256x192-7c227391_20230807.pth"

    inferencer = MMPoseInferencer(
        pose2d=pose_config,
        pose2d_weights=pose_checkpoint,
        det_model=det_config,
        det_weights=det_checkpoint,
        det_cat_ids=[0],  # the category id of 'human' class
        device='cpu'
    )

    context.logger.info("Init labels...")
    with open("/opt/nuclio/function.yaml", "rb") as function_file:
        functionconfig = yaml.safe_load(function_file)
        labels_spec = functionconfig["metadata"]["annotations"]["spec"]
        labels = json.loads(labels_spec)

    context.user_data.labels = labels
    context.user_data.inferencer = inferencer
    context.logger.info("Function initialized")

def handler(context, event):
    context.logger.info("Run mmpose ubody-2d model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = data.get('threshold', 0.55)
    image = Image.open(buf).convert("RGB")

    results = []
    pred_instances = next(context.user_data.inferencer(np.array(image)[...,::-1]))["predictions"][0]

    for pred_instance in pred_instances:
        keypoints = pred_instance["keypoints"]
        keypoint_scores = pred_instance["keypoint_scores"]
        for label in context.user_data.labels:
            skeleton = {
                "confidence": str(pred_instance["bbox_score"]),
                "label": label["name"],
                "type": "skeleton",
                "elements": [{
                    "label": element["name"],
                    "type": "points",
                    "outside": 0 if threshold < keypoint_scores[element["id"]] else 1,
                    "points": [
                        float(keypoints[element["id"]][0]),
                        float(keypoints[element["id"]][1])
                    ],
                    "confidence": str(keypoint_scores[element["id"]]),
                } for element in label["sublabels"]],
            }

            if not all([element['outside'] for element in skeleton["elements"]]):
                results.append(skeleton)

    return context.Response(body=json.dumps(results), headers={}, content_type="application/json", status_code=200)
