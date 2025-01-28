# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from copy import copy

import jsonpickle
import numpy as np
import torch

from tools.test import siamese_init, siamese_track
from utils.config_helper import load_config
from utils.load_helper import load_pretrain

class ModelHandler:
    def __init__(self):
        # Setup device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        torch.backends.cudnn.benchmark = True

        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/SiamMask/experiments/siammask_sharp"))
        class configPath:
            config = os.path.join(base_dir, "config_davis.json")

        self.config = load_config(configPath)
        from custom import Custom
        siammask = Custom(anchors=self.config['anchors'])
        self.siammask = load_pretrain(siammask, os.path.join(base_dir, "SiamMask_DAVIS.pth"))
        self.siammask.eval().to(self.device)

    def encode_state(self, state):
        state['net.zf'] = state['net'].zf
        state.pop('net', None)
        state.pop('mask', None)

        for k,v in state.items():
            state[k] = jsonpickle.encode(v)

        return state

    def decode_state(self, state):
        for k,v in state.items():
            # The server ensures that `state` is one of the values that the function itself
            # has previously output. Therefore it should be safe to use jsonpickle.
            state[k] = jsonpickle.decode(v)  # nosec: B301

        state['net'] = copy(self.siammask)
        state['net'].zf = state['net.zf']
        del state['net.zf']

        return state

    def infer(self, image, shape, state):
        image = np.array(image)
        if state is None: # init tracking
            xtl, ytl, xbr, ybr = shape
            target_pos = np.array([(xtl + xbr) / 2, (ytl + ybr) / 2])
            target_sz = np.array([xbr - xtl, ybr - ytl])
            siammask = copy(self.siammask) # don't modify self.siammask
            state = siamese_init(image, target_pos, target_sz, siammask,
                self.config['hp'], device=self.device)
            state = self.encode_state(state)
        else: # track
            state = self.decode_state(state)
            state = siamese_track(state, image, mask_enable=True,
                refine_enable=True, device=self.device)
            shape = state['ploygon'].flatten().tolist()
            state = self.encode_state(state)

        return shape, state

