# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import cv2
import numpy as np
import onnxruntime as ort


class ModelHandler:
    @staticmethod
    def load_model_config(model_path):
        """
        Load model configuration from JSON file.

        Args:
            model_path: Path to the ONNX model file (with or without .onnx extension)

        Returns:
            Dictionary with model configuration parameters
        """
        # Remove .onnx extension if present to get config filename
        base_name = model_path.replace('.onnx', '')
        config_path = f"{base_name}.json"

        if not os.path.exists(config_path):
            raise FileNotFoundError(
                f"Configuration file not found: {config_path}. "
                f"Each model must have a corresponding .json config file."
            )

        with open(config_path, 'r') as f:
            config = json.load(f)

        required_fields = ['model_path', 'input_size', 'conf_threshold', 'iou_threshold']
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field '{field}' in {config_path}")

        return config

    def __init__(self, labels, model_path, input_size, conf_threshold, iou_threshold):
        """
        Initialize YOLOv11 detection model handler.

        Args:
            labels: Dictionary mapping class IDs to label names
            model_path: Path to the ONNX model file
            input_size: Input image size (e.g., 640)
            conf_threshold: Confidence threshold for filtering detections
            iou_threshold: IoU threshold for NMS
        """
        self.labels = labels
        self.model_path = model_path
        self.input_size = input_size
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.model = None
        self.load_network()

    def load_network(self, model_path=None):
        """Load the ONNX model for inference.

        Args:
            model_path: Optional path to model file. If provided, updates self.model_path
                       and loads configuration from corresponding JSON file.
        """
        if model_path:
            print(f"Attempting to switch to model: {model_path}")
            # Try to load configuration for the new model
            try:
                config = self.load_model_config(model_path)
                self.model_path = config['model_path']
                self.input_size = config['input_size']
                self.conf_threshold = config['conf_threshold']
                self.iou_threshold = config['iou_threshold']
                print(f"Loaded config from JSON - input_size: {self.input_size}, "
                      f"conf: {self.conf_threshold}, iou: {self.iou_threshold}")
            except FileNotFoundError as e:
                print(f"No JSON config found for {model_path}: {e}")
                print(f"Warning: Switching model without config may cause inference errors")
                print(f"Keeping current settings - input_size: {self.input_size}, "
                      f"conf: {self.conf_threshold}, iou: {self.iou_threshold}")
                # Just update the model path, keep current settings
                self.model_path = model_path
            except Exception as e:
                print(f"Error loading config for {model_path}: {e}")
                # Fallback to just updating model_path
                self.model_path = model_path
                print(f"Using current settings: input_size={self.input_size}")

        try:
            # Set up execution providers (GPU first if available, then CPU)
            providers = ['CPUExecutionProvider']
            if ort.get_available_providers():
                available_providers = ort.get_available_providers()
                if 'CUDAExecutionProvider' in available_providers:
                    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']

            # Create ONNX runtime session
            so = ort.SessionOptions()
            so.log_severity_level = 3

            self.model = ort.InferenceSession(
                self.model_path,
                providers=providers,
                sess_options=so
            )
            self.input_details = [i.name for i in self.model.get_inputs()]
            self.output_details = [i.name for i in self.model.get_outputs()]

            print(f"Loaded ONNX model: {self.model_path}")
            print(f"Execution provider: {self.model.get_providers()[0]}")
            print(f"Model inputs: {self.input_details}")
            print(f"Model outputs: {self.output_details}")

        except Exception as e:
            raise Exception(f"Cannot load model {self.model_path}: {e}")

    def preprocess_image(self, image):
        """
        Preprocess image for ONNX inference.

        Args:
            image: PIL Image

        Returns:
            tuple: (preprocessed tensor, original shape)
        """
        # Convert PIL to numpy array
        image_np = np.array(image)
        original_shape = image_np.shape[:2]  # (height, width)

        # Resize to model input size
        resized_image = cv2.resize(image_np, (self.input_size, self.input_size))

        # Normalize to [0, 1]
        normalized_image = resized_image.astype(np.float32) / 255.0

        # Transpose to CHW format and add batch dimension
        input_tensor = np.transpose(normalized_image, (2, 0, 1))
        input_tensor = np.expand_dims(input_tensor, axis=0)

        return input_tensor, original_shape

    def apply_nms(self, boxes, scores, iou_threshold):
        """
        Apply Non-Maximum Suppression to filter overlapping detections.

        Args:
            boxes: Bounding boxes in format [x1, y1, x2, y2]
            scores: Confidence scores for each box
            iou_threshold: IoU threshold for NMS

        Returns:
            List of indices to keep after NMS
        """
        if len(boxes) == 0:
            return []

        # Convert to format expected by cv2.dnn.NMSBoxes
        boxes_xywh = []
        for box in boxes:
            x1, y1, x2, y2 = box
            w = x2 - x1
            h = y2 - y1
            boxes_xywh.append([x1, y1, w, h])

        # Apply NMS
        indices = cv2.dnn.NMSBoxes(
            boxes_xywh,
            scores.tolist(),
            self.conf_threshold,
            iou_threshold
        )

        # Handle both old and new OpenCV return formats
        if indices is not None:
            if isinstance(indices, np.ndarray) and len(indices) > 0:
                return indices.flatten().tolist()
            elif isinstance(indices, (list, tuple)) and len(indices) > 0:
                return list(indices) if isinstance(indices, tuple) else indices

        return []

    def scale_boxes(self, boxes, original_shape):
        """
        Scale boxes from model input size to original image size.

        Args:
            boxes: Boxes in model input coordinates
            original_shape: Original image shape (height, width)

        Returns:
            Scaled boxes
        """
        if len(boxes) == 0:
            return boxes

        orig_h, orig_w = original_shape
        scale_x = orig_w / self.input_size
        scale_y = orig_h / self.input_size

        scaled_boxes = boxes.copy()
        scaled_boxes[:, [0, 2]] *= scale_x  # x coordinates
        scaled_boxes[:, [1, 3]] *= scale_y  # y coordinates

        return scaled_boxes

    def post_process_outputs(self, outputs, original_shape):
        """
        Post-process ONNX model outputs into structured results.
        YOLOv11 detection output format: [batch, num_classes + 4, num_detections]
        where the first 4 channels are [x_center, y_center, width, height]
        and remaining channels are class scores.

        Args:
            outputs: Raw ONNX model outputs
            original_shape: Original image shape (height, width)

        Returns:
            Dictionary with processed detection results
        """
        if not outputs or len(outputs) == 0:
            return {
                'boxes': [],
                'scores': [],
                'classes': [],
                'num_detections': 0
            }

        # Get detection output (first output)
        detection_output = outputs[0]  # Shape: [1, num_classes + 4, num_detections]

        if len(detection_output.shape) != 3:
            raise ValueError(
                f"Expected 3D detection output, got {len(detection_output.shape)}D"
            )

        batch_size, channels, num_detections = detection_output.shape

        if batch_size != 1:
            raise ValueError(f"Expected batch size 1, got {batch_size}")

        # Extract data for single batch and transpose
        predictions = detection_output[0]  # Shape: [channels, num_detections]
        predictions = predictions.T  # Transpose to [num_detections, channels]

        # Extract boxes and class scores
        boxes = predictions[:, :4]  # x_center, y_center, width, height
        class_scores = predictions[:, 4:]  # Class scores

        # Convert from center format to corner format
        x_center, y_center, width, height = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
        x1 = x_center - width / 2
        y1 = y_center - height / 2
        x2 = x_center + width / 2
        y2 = y_center + height / 2

        boxes_corner = np.column_stack([x1, y1, x2, y2])

        # Get best class and confidence for each detection
        max_scores = np.max(class_scores, axis=1)
        max_classes = np.argmax(class_scores, axis=1)

        # Filter by confidence threshold
        conf_mask = max_scores >= self.conf_threshold

        if not np.any(conf_mask):
            return {
                'boxes': [],
                'scores': [],
                'classes': [],
                'num_detections': 0
            }

        filtered_boxes = boxes_corner[conf_mask]
        filtered_scores = max_scores[conf_mask]
        filtered_classes = max_classes[conf_mask]

        # Apply NMS
        nms_indices = self.apply_nms(
            filtered_boxes,
            filtered_scores,
            self.iou_threshold
        )

        if not nms_indices:
            return {
                'boxes': [],
                'scores': [],
                'classes': [],
                'num_detections': 0
            }

        # Select final detections
        final_boxes = filtered_boxes[nms_indices]
        final_scores = filtered_scores[nms_indices]
        final_classes = filtered_classes[nms_indices]

        # Scale boxes to original image size
        scaled_boxes = self.scale_boxes(final_boxes, original_shape)

        return {
            'boxes': scaled_boxes,
            'scores': final_scores,
            'classes': final_classes,
            'num_detections': len(final_boxes)
        }

    def infer(self, image, threshold):
        """
        Run inference on an image.

        Args:
            image: PIL Image
            threshold: Confidence threshold for filtering detections

        Returns:
            List of detection results in CVAT format
        """
        self.conf_threshold = threshold

        # Preprocess image
        input_tensor, original_shape = self.preprocess_image(image)

        # Run ONNX inference
        input_name = self.input_details[0]
        outputs = self.model.run(self.output_details, {input_name: input_tensor})

        # Post-process results
        results_dict = self.post_process_outputs(outputs, original_shape)

        # Convert to CVAT format
        results = []
        if results_dict['num_detections'] > 0:
            boxes = results_dict['boxes']
            scores = results_dict['scores']
            classes = results_dict['classes']

            orig_h, orig_w = original_shape

            for box, score, cls in zip(boxes, scores, classes):
                x1, y1, x2, y2 = box

                # Ensure coordinates are within image bounds
                xtl = max(int(x1), 0)
                ytl = max(int(y1), 0)
                xbr = min(int(x2), orig_w)
                ybr = min(int(y2), orig_h)

                # Skip invalid boxes
                if xtl >= xbr or ytl >= ybr:
                    continue

                results.append({
                    "confidence": float(score),
                    "label": self.labels.get(int(cls), f"class_{int(cls)}"),
                    "points": [xtl, ytl, xbr, ybr],
                    "type": "rectangle",
                })

        return results
