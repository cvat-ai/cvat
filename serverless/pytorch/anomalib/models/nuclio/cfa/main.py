import json
import base64
from PIL import Image
import io
from model_handler import CfaModelHandler as ModelHandler
import torch
import os
import time

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
    context.logger.info("Run CFA model")

    try:
        data = event.body

        # Parse JSON if data is a string
        if isinstance(data, str):
            data = json.loads(data)

        context.logger.info(f"Received data: {data}")

        # Check if this is a request to list available checkpoints
        if data and data.get("list_checkpoints"):
            context.logger.info("Listing available checkpoints")
            checkpoint_files = [f for f in os.listdir('.') if f.endswith('.pth') or f.endswith('.onnx') or f.endswith('.ckpt')]
            context.logger.info(f"Found checkpoints: {checkpoint_files}")
            return context.Response(body=json.dumps({"checkpoints": checkpoint_files}),
                headers={},
                content_type='application/json',
                status_code=200
            )

        keyword = data.get("keyword", None)
        print(f"ckpt_Path: {keyword}")

        buf = io.BytesIO(base64.b64decode(data["image"]))
        image = Image.open(buf)
        context.logger.info("Image loaded successfully")

        # Start timing the inference
        inference_start_time = time.time()
        result = context.user_data.model.infer(image, ckpt_path=keyword)
        inference_end_time = time.time()

        # Calculate and log inference time
        inference_duration = inference_end_time - inference_start_time
        context.logger.info(f"Inference completed in {inference_duration:.4f} seconds")

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

