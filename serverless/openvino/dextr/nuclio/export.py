#!/usr/bin/env python3

import sys

import torch
import torch.nn
import torch.onnx

import networks.deeplab_resnet as resnet

net = resnet.resnet101(1, nInputChannels=4, classifier='psp')

state_dict_checkpoint = torch.load(sys.argv[1], map_location=torch.device('cpu'))

net.load_state_dict(state_dict_checkpoint)

full_net = torch.nn.Sequential(
    net,
    torch.nn.Upsample((512, 512), mode='bilinear', align_corners=True),
    torch.nn.Sigmoid(),
)
full_net.eval()

input_tensor = torch.randn((1, 4, 512, 512))

torch.onnx.export(full_net, input_tensor, sys.argv[2])
