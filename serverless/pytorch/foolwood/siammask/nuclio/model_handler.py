# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tools.test import *
import os

class ModelHandler:
    def __init__(self):
        # Setup device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        torch.backends.cudnn.benchmark = True

        base_dir = "/opt/nuclio/SiamMask/experiments/siammask_sharp"
        class configPath:
            config = os.path.join(base_dir, "config_davis.json")

        self.config = load_config(configPath)
        from custom import Custom
        siammask = Custom(anchors=self.config['anchors'])
        self.siammask = load_pretrain(siammask, os.path.join(base_dir, "SiamMask_DAVIS.pth"))
        self.siammask.eval().to(self.device)


    def infer(self, image, shape, state):
        if state is None: # init tracking
            x, y, w, h = shape
            target_pos = np.array([x + w / 2, y + h / 2])
            target_sz = np.array([w, h])
            state = siamese_init(image, target_pos, target_sz, self.siammask,
                self.config['hp'], device=self.device)
        else: # track
            state = siamese_track(state, image, mask_enable=True, refine_enable=True,
                device=self.device)
            shape = state['ploygon'].flatten()

        return {"shape": shape, "state": state}

