import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import matplotlib.pyplot as plt
import json
import base64
import io
from PIL import Image
import yaml
import numpy as np
def init_context(context):
    context.logger.info("Init detector...")

    base_options = python.BaseOptions(
    model_asset_path='pose_landmarker_heavy.task'
    )
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        num_poses = 2,
        min_pose_detection_confidence = 0.5,
        min_pose_presence_confidence = 0.5,
        min_tracking_confidence = 0.5,
        output_segmentation_masks = False
    )

    detector = vision.PoseLandmarker.create_from_options(options)

    context.logger.info("Init labels...")

    with open("/opt/nuclio/function.yaml", "rb") as function_file:
        functionconfig = yaml.safe_load(function_file)
        labels_spec = functionconfig['metadata']['annotations']['spec']
        labels = json.loads(labels_spec)

    context.user_data.labels =  labels
    context.user_data.model_handler = detector.detect
    context.logger.info("Function initialized")



def handler(context, event):
    context.logger.info("Run mediapipe 33kps model")

    data = event.body
    threshold = data.get("threshold", 0.55)
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    pil_img = Image.open(buf)
    image = mp.Image(
    image_format=mp.ImageFormat.SRGB, data=np.asarray(pil_img)
    )

    detection_result = context.user_data.model_handler(image)
    pose_landmarks_instances = detection_result.pose_landmarks

    results = []
    for pose_landmarks_instance in pose_landmarks_instances:
        for label in context.user_data.labels:
            skeleton = {
                "confidence": "1", #str(pred_instance["bbox_score"]),
                "label": label["name"],
                "type": "skeleton",
                "elements": [{
                    "label": element["name"],
                    "type": "points",
                    # @NOTICE supose outside attribute  correspondents to presence  in mediapipe
                    "outside": 0 if threshold < pose_landmarks_instance[element["id"]].presence else 1,
                    # @NOTICE supose occluded attriute correspondents visibility in mediapipe
                    "occluded": 0 if threshold < pose_landmarks_instance[element["id"]].visibility else 1,
                    "points": [
                        float(pose_landmarks_instance[element["id"]].x * image.width),
                        float(pose_landmarks_instance[element["id"]].y * image.height)
                    ],
                    "confidence": str(pose_landmarks_instance[element["id"]].presence),
                } for element in label["sublabels"]],
            }
            if not all([element['outside'] for element in skeleton["elements"]]):
                            results.append(skeleton)


    return context.Response(body=json.dumps(results), headers={}, content_type="application/json", status_code=200)
