
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.util.tf_util import import_tf
import_tf() # prevent TF loading and potential interpeter crash

import accuracy_checker.representation as ac

import datumaro.components.extractor as dm
from datumaro.util.annotation_util import softmax

def import_predictions(predictions):
    # Convert Accuracy checker predictions to Datumaro annotations

    anns = []

    for pred in predictions:
        anns.extend(import_prediction(pred))

    return anns

def import_prediction(pred):
    if isinstance(pred, ac.ClassificationPrediction):
        scores = softmax(pred.scores)
        return (dm.Label(label_id, attributes={'score': float(score)})
            for label_id, score in enumerate(scores))
    elif isinstance(pred, ac.ArgMaxClassificationPrediction):
        return (dm.Label(int(pred.label)), )
    elif isinstance(pred, ac.CharacterRecognitionPrediction):
        return (dm.Label(int(pred.label)), )
    elif isinstance(pred, (ac.DetectionPrediction, ac.ActionDetectionPrediction)):
        return (dm.Bbox(x0, y0, x1 - x0, y1 - y0, int(label_id),
                attributes={'score': float(score)})
            for label, score, x0, y0, x1, y1 in zip(pred.labels, pred.scores,
                pred.x_mins, pred.y_mins, pred.x_maxs, pred.y_maxs)
        )
    elif isinstance(pred, ac.DepthEstimationPrediction):
        return (dm.Mask(pred.depth_map), ) # 2d floating point mask
    # elif isinstance(pred, ac.HitRatioPrediction):
    #     -
    elif isinstance(pred, ac.ImageInpaintingPrediction):
        return (dm.Mask(pred.value), ) # an image
    # elif isinstance(pred, ac.MultiLabelRecognitionPrediction):
    #     -
    # elif isinstance(pred, ac.MachineTranslationPrediction):
    #     -
    # elif isinstance(pred, ac.QuestionAnsweringPrediction):
    #     -
    # elif isinstance(pred, ac.PoseEstimation3dPrediction):
    #     -
    # elif isinstance(pred, ac.PoseEstimationPrediction):
    #     -
    # elif isinstance(pred, ac.RegressionPrediction):
    #     -
    else:
        raise NotImplementedError("Can't convert %s" % type(pred))




