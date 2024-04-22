import base64
import io
import json

import numpy as np
from model_handler import ModelHandler
from PIL import Image


def init_context(context):
    context.logger.info("Init context...  0%")
    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")

def handler(context, event):
    context.logger.info("Run TransT model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    shapes = data.get("shapes")
    states = data.get("states")

    image = Image.open(buf).convert('RGB')
    image = np.array(image)[:, :, ::-1].copy()

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
