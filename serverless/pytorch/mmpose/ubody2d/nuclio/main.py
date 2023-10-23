import json
import base64
import io
import yaml
import numpy as np
from PIL import Image

from mmpose.apis import inference_topdown
from mmpose.apis import init_model as init_pose_estimator
from mmdet.apis import inference_detector, init_detector
from mmpose.evaluation.functional import nms
from mmpose.structures import merge_data_samples
from mmpose.utils import adapt_mmdet_pipeline


def process_one_image(img, detector, pose_estimator, threshold):
    category_ids = [0]
    # predict bbox
    det_result = inference_detector(detector, img)
    pred_instance = det_result.pred_instances.cpu().numpy()
    bboxes = np.concatenate(
        (pred_instance.bboxes, pred_instance.scores[:, None]), axis=1)
    bboxes = bboxes[np.logical_and(pred_instance.labels == category_ids,
                                   pred_instance.scores > threshold)]
    bboxes = bboxes[nms(bboxes, threshold), :4]

    # predict keypoints
    pose_results = inference_topdown(pose_estimator, img, bboxes)
    data_samples = merge_data_samples(pose_results)

    # if there is no instance detected, return None
    return data_samples.get('pred_instances', None)


def init_context(context):
    det_config = '/opt/nuclio/mmpose/projects/rtmpose/rtmdet/person/rtmdet_nano_320-8xb32_coco-person.py'
    det_checkpoint = '/opt/nuclio/rtmdet_nano_8xb32-100e_coco-obj365-person-05d8511e.pth'
    pose_config = '/opt/nuclio/mmpose/configs/wholebody_2d_keypoint/topdown_heatmap/ubody2d/td-hm_hrnet-w32_8xb64-210e_ubody-256x192.py'
    pose_checkpoint = '/opt/nuclio/td-hm_hrnet-w32_8xb64-210e_ubody-coco-256x192-7c227391_20230807.pth'

    # build person detector
    context.logger.info("Init detector...")
    detector = init_detector(det_config, det_checkpoint, device='cpu')
    detector.cfg = adapt_mmdet_pipeline(detector.cfg)

    # build pose estimator
    context.logger.info("Init pose estimator...")
    pose_estimator = init_pose_estimator(pose_config, pose_checkpoint, device='cpu')

    context.logger.info("Init labels...")
    with open("/opt/nuclio/function.yaml", 'rb') as function_file:
        functionconfig = yaml.safe_load(function_file)
        labels_spec = functionconfig['metadata']['annotations']['spec']
        labels = [{
            "name": item["name"],
            "elements": {
                element["id"]: {
                    "name": element["name"]
                } for element in item["elements"]
            }
        } for item in json.loads(labels_spec)]

    context.user_data.labels = labels
    context.user_data.detector = detector
    context.user_data.pose_estimator = pose_estimator

    context.logger.info("Function initialized")

def handler(context, event):
    context.logger.info("Run mmpose ubody-2d model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.3))

    image = Image.open(buf)
    pred_instances = process_one_image(
        np.array(image),
        context.user_data.detector,
        context.user_data.pose_estimator,
        threshold
    )

    bboxes = pred_instances["bboxes"]
    keypoints = pred_instances["keypoints"]
    keypoint_scores = pred_instances["keypoint_scores"]

    results = []
    for i in range(len(bboxes)):
        # instance_box = bboxes[i]
        instance_keypoints = keypoints[i]
        instance_scores = keypoint_scores[i]

        for label in context.user_data.labels:
            skeleton = {
                "confidence": 1,
                "label": label["name"],
                "type": "skeleton",
                "elements": [{
                    "label": label["elements"][j]["name"],
                    "type": "points",
                    "outside": 0 if instance_scores[j - 1] > 0.66 and instance_scores[j  - 1] < 0.98 else 1,
                    "points": [
                        float(instance_keypoints[j - 1][0]),
                        float(instance_keypoints[j - 1][1])
                    ],
                    "confidence": str(instance_scores[j  - 1]),
                } for j in label["elements"]],
            }
            if any([not element['outside'] for element in skeleton['elements']]):
                results.append(skeleton)

    return context.Response(body=json.dumps(results), headers={}, content_type='application/json', status_code=200)
