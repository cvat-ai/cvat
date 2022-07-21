import json
import base64
from PIL import Image
import io
import numpy as np
import traceback
import jsonpickle
import torch

import cv2
# from model_handler import ModelHandler

from pysot_toolkit.bbox import get_axis_aligned_bbox
from pysot_toolkit.trackers.tracker import Tracker
from pysot_toolkit.trackers.net_wrappers import NetWithBackbone

def create_tracker():
    use_gpu = torch.cuda.is_available()

    net_path = '/transt.pth'  # Absolute path of the model
    net = NetWithBackbone(net_path=net_path, use_gpu=use_gpu)
    tracker = Tracker(name='transt', net=net, window_penalty=0.49, exemplar_size=128, instance_size=256)
    return tracker

def init_tracker(tracker, img, bbox):
    cx, cy, w, h = get_axis_aligned_bbox(np.array(bbox))
    gt_bbox_ = [cx - w / 2, cy - h / 2, w, h]
    init_info = {'init_bbox': gt_bbox_}
    tracker.initialize(img, init_info)

    return tracker

def track(tracker, img):
    outputs = tracker.track(img)
    prediction_bbox = outputs['target_bbox']

    left = prediction_bbox[0]
    top = prediction_bbox[1]
    right = prediction_bbox[0] + prediction_bbox[2]
    bottom = prediction_bbox[1] + prediction_bbox[3]
    return tracker, (top, left, bottom, right)



def init_context(context):
    context.logger.info("Init context...  0%")
    model = create_tracker()
    context.user_data.model = model
    context.logger.info("Init context...100%")

def log(msg):
    #with open("/log.log", "a") as logf:
    #    logf.write(msg+'\n')
    pass

def encode_state(model):
    state = {}
    state['model.net.net.zf'] = jsonpickle.encode(model.net.net.zf)
    state['model.net.net.pos_template'] = jsonpickle.encode(model.net.net.pos_template)

    #attrs = ['windows', 'center_pos', 'size', 'channel_average', 'mean', 'std', 'inplace', 'features_initialized']

    state['model.window'] = jsonpickle.encode(model.window)
    state['model.center_pos'] = jsonpickle.encode(model.center_pos)
    state['model.size'] = jsonpickle.encode(model.size)
    state['model.channel_average'] = jsonpickle.encode(model.channel_average)
    state['model.mean'] = jsonpickle.encode(model.mean)
    state['model.std'] = jsonpickle.encode(model.std)
    state['model.inplace'] = jsonpickle.encode(model.inplace)
    state['model.features_initialized'] = jsonpickle.encode(getattr(model, 'features_initialized', False))

    return state

def decode_state(model, state):

    model.net.net.zf = jsonpickle.decode(state['model.net.net.zf'])
    model.net.net.pos_template = jsonpickle.decode(state['model.net.net.pos_template'])

    model.window = jsonpickle.decode(state['model.window'])
    model.center_pos = jsonpickle.decode(state['model.center_pos'])
    model.size = jsonpickle.decode(state['model.size'])
    model.channel_average = jsonpickle.decode(state['model.channel_average'])
    model.mean = jsonpickle.decode(state['model.mean'])
    model.std = jsonpickle.decode(state['model.std'])
    model.inplace = jsonpickle.decode(state['model.inplace'])

    model.features_initialized = False
    if 'model.features_initialized' in state:
        model.features_initialized = jsonpickle.decode(state['model.features_initialized'])

    return model

def handler(context, event):

    try:
        context.logger.info("Run TransT model")
        data = event.body
        buf = io.BytesIO(base64.b64decode(data["image"]))
        shapes = data.get("shapes")
        states = data.get("states")

        image = Image.open(buf).convert('RGB')
        image = np.array(image)[:, :, ::-1].copy()

        #cv2.imwrite('/test.jpg', image)

        results = {
            'shapes': [],
            'states': []
        }
        for i, shape in enumerate(shapes):
            if i >= len(states) or states[i] is None:
                init_shape = (shape[0], shape[1], shape[2]-shape[0], shape[3]-shape[1]) # x1,y1,x2,y2 -> x,y,w,h

                log('tracker init')
                log(str(init_shape))

                #cv2.imwrite('/init_img.jpg', image)

                context.user_data.model = init_tracker(context.user_data.model, image, init_shape)
                state = encode_state(context.user_data.model)
            else:
                state = states[i]
                context.user_data.model = decode_state(context.user_data.model, state)
                context.user_data.model, (top, left, bottom, right) = track(context.user_data.model, image)

                shape = (left, top, right, bottom)
                state = encode_state(context.user_data.model)

                #cv2.imwrite('/track_img.jpg', image)

                log('tracked')
                log(str(shape))

            results['shapes'].append(shape)
            results['states'].append(state)

        return context.Response(body=json.dumps(results), headers={},
            content_type='application/json', status_code=200)

    except Exception as e: # cavemen debugging
        logf = open("/error.log", "w")
        logf.write(str(e))
        logf.write(traceback.format_exc())

        return context.Response(headers={},
            content_type='application/json', status_code=666)