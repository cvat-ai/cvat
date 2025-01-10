import json
import torch
from ultralytics import YOLO

def init_context(context):
    """
    Initialize the Nuclio function context and load the YOLOv8 model on CPU.
    """
    context.logger.info("Initializing YOLOv8 model...")
    global model

    # Load the YOLOv8 model in CPU mode
    model_path = "/opt/nuclio/yolov8.onnx"
    device = "cpu"  # Explicitly set device to CPU
    model = YOLO(model_path)
    context.logger.info(f"Model loaded successfully on {device}.")

def handler(context, event):
    """
    Handle incoming requests by performing inference with the YOLOv8 model.
    """
    try:
        # Parse input data (expects JSON with an image path or base64-encoded image)
        input_data = json.loads(event.body)
        image_path = input_data.get("image_path")

        if not image_path:
            return context.Response(
                body=json.dumps({"error": "Missing 'image_path' in request."}),
                headers={},
                content_type="application/json",
                status_code=400,
            )

        # Perform prediction
        results = model.predict(image_path, device="cpu")  # Force CPU inference

        # Convert results to a serializable format
        predictions = []
        for result in results:
            predictions.append({
                "boxes": result.boxes.xyxy.tolist(),  # Bounding box coordinates
                "scores": result.boxes.conf.tolist(),  # Confidence scores
                "labels": result.boxes.cls.tolist(),  # Class labels
            })

        return context.Response(
            body=json.dumps({"predictions": predictions}),
            headers={},
            content_type="application/json",
            status_code=200,
        )

    except Exception as e:
        context.logger.error(f"Error during inference: {str(e)}")
        return context.Response(
            body=json.dumps({"error": str(e)}),
            headers={},
            content_type="application/json",
            status_code=500,
        )
