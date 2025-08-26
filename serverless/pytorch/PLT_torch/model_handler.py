import numpy as np
from ultralytics import YOLO
from PIL import Image

class ModelHandler:
    def __init__(self, model_path, labels, logger):
        self.labels = labels
        self.logger = logger
        self.model_path = model_path

        # Load the model using the high-level YOLO class from ultralytics
        self.logger.info(f"Loading Ultralytics YOLO model from {self.model_path}...")
        self.model = YOLO(self.model_path)
        self.logger.info("Ultralytics YOLO model loaded successfully.")


    def infer(self, image_pil: Image, threshold: float):

        # The YOLO object handles all preprocessing and post-processing.
        # We just pass the image and parameters.
        # `verbose=False` is used to keep the server logs clean.
        image_results = self.model(image_pil, conf=threshold, iou=0.45, verbose=False)

        self.logger.info(f"Model returned {len(image_results[0].boxes)} detections.")

        results = []

        # The result object contains final, scaled bounding boxes.
        # The format is [x1, y1, x2, y2, confidence, class_id]
        for bbox in image_results[0].boxes.data.tolist():
            x1, y1, x2, y2, confidence, class_id = bbox

            predicted_class_id = int(class_id)

            if predicted_class_id in self.labels:
                results.append({
                    "confidence": f"{confidence:.2f}",
                    "label": self.labels[predicted_class_id],
                    "points": [int(x1), int(y1), int(x2), int(y2)],
                    "type": "rectangle",
                })

        self.logger.info(f"Returning {len(results)} final annotations to CVAT.")
        return results