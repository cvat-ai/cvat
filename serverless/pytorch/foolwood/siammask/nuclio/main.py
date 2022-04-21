import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")

    # Read the DL model
    model = ModelHandler()
    context.user_data.model = model

    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run SiamMask model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    shapes = data.get("shapes")
    states = data.get("states")
    image = Image.open(buf)

    results = {
        'shapes': [],
        'states': []
    }
    for i, shape in enumerate(shapes):
        shape, state = context.user_data.model.infer(image, shape, states[i] if i < len(states) else None)
        results['shapes'].append(shape)
        results['states'].append(state)

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)
