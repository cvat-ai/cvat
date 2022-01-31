# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
from model_loader import ModelLoader

class FaceDetectorHandler:
    def __init__(self):
        base_dir = os.path.abspath(os.environ.get("DETECTOR_MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/face-detection-0205/FP32"))
        model_xml = os.path.join(base_dir, "face-detection-0205.xml")
        model_bin = os.path.join(base_dir, "face-detection-0205.bin")
        self.model = ModelLoader(model_xml, model_bin)

    def infer(self, image, threshold):
        infer_res = self.model.infer(image)["boxes"]
        infer_res = infer_res[infer_res[:,4] > threshold]

        results = []
        faces = []
        h_scale = image.height / 416
        w_scale = image.width / 416
        for face in infer_res:
            xmin = int(face[0] * w_scale)
            ymin = int(face[1] * h_scale)
            xmax = int(face[2] * w_scale)
            ymax = int(face[3] * h_scale)
            confidence = face[4]

            faces.append(np.array(image)[ymin:ymax, xmin:xmax])
            results.append({
                "confidence": str(confidence),
                "label": "face",
                "points": [xmin, ymin, xmax, ymax],
                "type": "rectangle",
                "attributes": []
            })

        return results, faces

class AttributesExtractorHandler:
    def __init__(self):
        age_gender_base_dir = os.path.abspath(os.environ.get("AGE_GENDER_MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/age-gender-recognition-retail-0013/FP32"))
        age_gender_model_xml = os.path.join(age_gender_base_dir, "age-gender-recognition-retail-0013.xml")
        age_gender_model_bin = os.path.join(age_gender_base_dir, "age-gender-recognition-retail-0013.bin")
        self.age_gender_model = ModelLoader(age_gender_model_xml, age_gender_model_bin)
        emotions_base_dir = os.path.abspath(os.environ.get("EMOTIONS_MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/emotions-recognition-retail-0003/FP32"))
        emotions_model_xml = os.path.join(emotions_base_dir, "emotions-recognition-retail-0003.xml")
        emotions_model_bin = os.path.join(emotions_base_dir, "emotions-recognition-retail-0003.bin")
        self.emotions_model = ModelLoader(emotions_model_xml, emotions_model_bin)
        self.genders_map = ["female", "male"]
        self.emotions_map = ["neutral", "happy", "sad", "surprise", "anger"]

    def infer(self, image):
        age_gender_request = self.age_gender_model.async_infer(image)
        emotions_request = self.emotions_model.async_infer(image)
        # Wait until both age_gender and emotion recognition async inferences finish
        while not (age_gender_request.wait(0) == 0 and emotions_request.wait(0) == 0):
            continue
        age = int(np.squeeze(age_gender_request.output_blobs["age_conv3"].buffer) * 100)
        gender = self.genders_map[np.argmax(np.squeeze(age_gender_request.output_blobs["prob"].buffer))]
        emotion = self.emotions_map[np.argmax(np.squeeze(emotions_request.output_blobs['prob_emotion'].buffer))]
        return {"attributes": [
            {"name": "age", "value": str(age)},
            {"name": "gender", "value": gender},
            {"name": "emotion", "value": emotion}
        ]}
