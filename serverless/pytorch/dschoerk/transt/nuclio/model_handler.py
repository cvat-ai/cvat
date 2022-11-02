# Copyright (C) 2022 CVAT.ai Corporation
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

        net_path = '/transt.pth'  # Absolute path of the model
        net = NetWithBackbone(net_path=net_path, use_gpu=use_gpu)
        self.net = Tracker(name='transt', net=net, window_penalty=0.49, exemplar_size=128, instance_size=256)

    def decode_state(self, state):
        self.model.net.net.zf = jsonpickle.decode(state['model.net.net.zf'])
        self.model.net.net.pos_template = jsonpickle.decode(state['model.net.net.pos_template'])

        self.model.window = jsonpickle.decode(state['model.window'])
        self.model.center_pos = jsonpickle.decode(state['model.center_pos'])
        self.model.size = jsonpickle.decode(state['model.size'])
        self.model.channel_average = jsonpickle.decode(state['model.channel_average'])
        self.model.mean = jsonpickle.decode(state['model.mean'])
        self.model.std = jsonpickle.decode(state['model.std'])
        self.model.inplace = jsonpickle.decode(state['model.inplace'])

        self.model.features_initialized = False
        if 'model.features_initialized' in state:
            self.model.features_initialized = jsonpickle.decode(state['model.features_initialized'])

    def encode_state(self):
        state = {}
        state['model.net.net.zf'] = jsonpickle.encode(self.model.net.net.zf)
        state['model.net.net.pos_template'] = jsonpickle.encode(self.model.net.net.pos_template)


        state['model.window'] = jsonpickle.encode(self.model.window)
        state['model.center_pos'] = jsonpickle.encode(self.model.center_pos)
        state['model.size'] = jsonpickle.encode(self.model.size)
        state['model.channel_average'] = jsonpickle.encode(self.model.channel_average)
        state['model.mean'] = jsonpickle.encode(self.model.mean)
        state['model.std'] = jsonpickle.encode(self.model.std)
        state['model.inplace'] = jsonpickle.encode(self.model.inplace)
        state['model.features_initialized'] = jsonpickle.encode(getattr(self.model, 'features_initialized', False))

        return state

    def init_tracker(self, img, bbox):
        cx, cy, w, h = get_axis_aligned_bbox(np.array(bbox))
        gt_bbox_ = [cx - w / 2, cy - h / 2, w, h]
        init_info = {'init_bbox': gt_bbox_}
        self.model.initialize(img, init_info)

    def track(self, img):
        outputs = self.model.track(img)
        prediction_bbox = outputs['target_bbox']

        left = prediction_bbox[0]
        top = prediction_bbox[1]
        right = prediction_bbox[0] + prediction_bbox[2]
        bottom = prediction_bbox[1] + prediction_bbox[3]
        return (top, left, bottom, right)

    def infer(self, image, shape, state):
        if state is None:
            init_shape = (shape[0], shape[1], shape[2] - shape[0], shape[3] - shape[1])

            self.init_tracker(image, init_shape)
            state = self.encode_state()
        else:
            self.decode_state(state)
            (top, left, bottom, right) = self.track(image)

            shape = (left, top, right, bottom)
            state = self.encode_state()

        return shape, state
