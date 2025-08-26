import json
import base64
import io
import traceback
from PIL import Image
from model_handler import ModelHandler

# Updated labels for the new model
CLASS_NAMES = {
    0: "RBC",
    1: "reticulocyte"
}

def init_context(context):
    context.logger.info("Initializing RBC/Retic PyTorch context...")

    # Ensure your new model file is named 'best.pt'
    model_path = "/opt/nuclio/best.pt"

    model = ModelHandler(model_path, CLASS_NAMES, context.logger)
    context.user_data.model = model

    context.logger.info("RBC/Retic PyTorch context initialization complete.")


def handler(context, event):
    try:
        context.logger.info("Handling new request...")
        data = event.body
        buf = io.BytesIO(base64.b64decode(data["image"]))

        threshold = float(data.get("threshold", 0.25))
        context.logger.info(f"Using confidence threshold: {threshold}")

        image = Image.open(buf).convert("RGB")

        results = context.user_data.model.infer(image, threshold)

        return context.Response(body=json.dumps(results), headers={},
            content_type='application/json', status_code=200)

    except Exception:
        context.logger.error(f"Error during inference: {traceback.format_exc()}")
        return context.Response(body=traceback.format_exc(), status_code=500)