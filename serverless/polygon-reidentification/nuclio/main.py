import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")

    model = ModelHandler()
    setattr(context.user_data, 'model', model)

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run segmentation reidentification")
    data = event.body
    buf0 = io.BytesIO(base64.b64decode(data["image0"].encode('utf-8')))

    compare_images = []
    for raw_image in data["compare_images"]:
        buf_temp = io.BytesIO(base64.b64decode(raw_image.encode('utf-8')))
        compare_images.append(Image.open(buf_temp))


    threshold = float(data.get("threshold", 0.5))
    max_distance = float(data.get("max_distance", 50))
    image0 = Image.open(buf0)
    polygons0 = data["polygons0"]
    compare_polygons = data["compare_polygons"]
    results = context.user_data.model.infer(image0, polygons0,
        compare_images, compare_polygons, threshold, max_distance)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
