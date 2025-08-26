import json
import base64
import io
import traceback
from PIL import Image
from model_handler import ModelHandler

# Updated labels for the new WBC 10c model
CLASS_NAMES = {
    0: "bands",
    1: "basophils",
    2: "blasts",
    3: "eosinophils",
    4: "lymphocytes",
    5: "metamyelocytes",
    6: "monocytes",
    7: "myelocytes",
    8: "neutrophils",
    9: "promyelocytes",
    10: "unclassified"
}

def init_context(context):
    context.logger.info("Initializing WBC 10c PyTorch context...")

    # Ensure your WBC 10c model file is named '(name).pt'
    model_path = "/opt/nuclio/best_train2_10class_yolov121920L_16may2025.pt"

    model = ModelHandler(model_path, CLASS_NAMES, context.logger)
    context.user_data.model = model

    context.logger.info("WBC 10c PyTorch context initialization complete.")


def handler(context, event):
    try:
        context.logger.info("Handling new request...")
        data = event.body
        buf = io.BytesIO(base64.b64decode(data["image"]))

        threshold = float(data.get("threshold", 0.35))
        context.logger.info(f"Using confidence threshold: {threshold}")

        image = Image.open(buf).convert("RGB")

        results = context.user_data.model.infer(image, threshold)

        return context.Response(body=json.dumps(results), headers={},
            content_type='application/json', status_code=200)

    except Exception:
        context.logger.error(f"Error during inference: {traceback.format_exc()}")
        return context.Response(body=traceback.format_exc(), status_code=500)