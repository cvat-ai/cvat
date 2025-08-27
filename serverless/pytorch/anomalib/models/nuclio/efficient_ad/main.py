import json
import base64
from PIL import Image
import io
from model_handler import EfficientAdModelHandler as ModelHandler
import torch
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Set CUDA_VISIBLE_DEVICES to the first available GPU or leave it blank for CPU
if device.type == "cuda":
    os.environ["CUDA_VISIBLE_DEVICES"] = str(torch.cuda.current_device())
else:
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

def init_context(context):
    context.logger.info("Init context...  0%")

    model = ModelHandler()
    context.user_data.model = model

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run Uflow model")

    try:

        data = event.body

        keyword = data.get("keyword", None)
        print(f"ckpt_Path: {keyword}")

        buf = io.BytesIO(base64.b64decode(data["image"]))
        image = Image.open(buf)
        context.logger.info("Image loaded successfully")

        result = context.user_data.model.infer(image, ckpt_path=keyword)

        return context.Response(body=json.dumps(result),
            headers={},
            content_type='application/json',
            status_code=200
        )

    except Exception as e:
        context.logger.error(f"Error in handler: {str(e)}")
        return context.Response(body=json.dumps({"error": str(e)}),
            headers={},
            content_type='application/json',
            status_code=500
        )

