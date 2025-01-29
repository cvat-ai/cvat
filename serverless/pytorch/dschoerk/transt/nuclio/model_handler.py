# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import jsonpickle
import numpy as np
import torch
from pysot_toolkit.bbox import get_axis_aligned_bbox
from pysot_toolkit.trackers.net_wrappers import NetWithBackbone
from pysot_toolkit.trackers.tracker import Tracker


class ModelHandler:
    def __init__(self):
        use_gpu = torch.cuda.is_available()
        net_path = '/transt.pth' # Absolute path of the model
        net = NetWithBackbone(net_path=net_path, use_gpu=use_gpu)
        self.tracker = Tracker(name='transt', net=net, window_penalty=0.49, exemplar_size=128, instance_size=256)

    def decode_state(self, state):
        # The server ensures that `state` is one of the values that the function itself
        # has previously output. Therefore it should be safe to use jsonpickle.
        decode = jsonpickle.decode  # nosec: B301

        self.tracker.net.net.zf = decode(state['model.net.net.zf'])
        self.tracker.net.net.pos_template = decode(state['model.net.net.pos_template'])

        self.tracker.window = decode(state['model.window'])
        self.tracker.center_pos = decode(state['model.center_pos'])
        self.tracker.size = decode(state['model.size'])
        self.tracker.channel_average = decode(state['model.channel_average'])
        self.tracker.mean = decode(state['model.mean'])
        self.tracker.std = decode(state['model.std'])
        self.tracker.inplace = decode(state['model.inplace'])

        self.tracker.features_initialized = False
        if 'model.features_initialized' in state:
            self.tracker.features_initialized = decode(state['model.features_initialized'])

    def encode_state(self):
        state = {}
        state['model.net.net.zf'] = jsonpickle.encode(self.tracker.net.net.zf)
        state['model.net.net.pos_template'] = jsonpickle.encode(self.tracker.net.net.pos_template)
        state['model.window'] = jsonpickle.encode(self.tracker.window)
        state['model.center_pos'] = jsonpickle.encode(self.tracker.center_pos)
        state['model.size'] = jsonpickle.encode(self.tracker.size)
        state['model.channel_average'] = jsonpickle.encode(self.tracker.channel_average)
        state['model.mean'] = jsonpickle.encode(self.tracker.mean)
        state['model.std'] = jsonpickle.encode(self.tracker.std)
        state['model.inplace'] = jsonpickle.encode(self.tracker.inplace)
        state['model.features_initialized'] = jsonpickle.encode(getattr(self.tracker, 'features_initialized', False))

        return state

    def init_tracker(self, img, bbox):
        cx, cy, w, h = get_axis_aligned_bbox(np.array(bbox))
        gt_bbox_ = [cx - w / 2, cy - h / 2, w, h]
        init_info = {'init_bbox': gt_bbox_}
        self.tracker.initialize(img, init_info)

    def track(self, img):
        outputs = self.tracker.track(img)
        prediction_bbox = outputs['target_bbox']

        left = prediction_bbox[0]
        top = prediction_bbox[1]
        right = prediction_bbox[0] + prediction_bbox[2]
        bottom = prediction_bbox[1] + prediction_bbox[3]
        return (left, top, right, bottom)

    def infer(self, image, shape, state):
        if state is None:
            init_shape = (shape[0], shape[1], shape[2] - shape[0], shape[3] - shape[1])

            self.init_tracker(image, init_shape)
            state = self.encode_state()
        else:
            self.decode_state(state)
            shape = self.track(image)
            state = self.encode_state()

        return shape, state
