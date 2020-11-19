"""
[tricks in https://github.com/610265158/mobilenetv3_centernet]
# backbone:
- mobilenetv3 0.75width large, pretrained
- fpn
# neck:
- 一半upsample, 一半transposeconv
- part1: 先sep-conv(5x5) 再 upsample
- part2: 分组（4）transposeconv(4x4) 替换成： 先upsample, 再sep-conv(3x3)
- 深度: 256->192->**128**
- fpn: +256->+192->+128, 用expansion的结果作为输入
# head:
- dims: hm128, wh:64, reg:64
- group2: conv(1x1)
- group3: sep-conv(3x3)
- group4: sep-conv(5x5)
- group1: maxpool(3x3), sep-conv(3x3)
# loss
- **正则： weight decay, l2 loss**
- change mobilenetv3 backbone to mobilenetv2 backbone

TODOs:
- ASPP for neck stage
- conclusion from Hit-Detector:
    - backbone prefers operations that have large kernel size.
    - head prefer operations with bigger expansion rate
    - neck prefers bigger dilation rate
- debug transpose conv of MNN opencl backend

[tricks in Panoptic-Deeplab]
- ASPP before upsampling, rate: 1,2,3
- upsample: 5×5 depthwise-separable convolution
- fpn: 1x1 conv, same chanels, concat
- head: 5x5 conv + 1x1 conv

!!!!! apply mobilenetv3.pytorch tricks
!!!!! change mobilenetv3 backbone to mobilenetv2

Issues:
# dilate conv is ok on mnn, but too slow on opencl backend
# self.__setattr__(head+'group2'
#                 , nn.Conv2d(self.up_chanels[-1]
#                             ,self.head_dim[head]//2
#                             ,3
#                             ,1
#                             ,2
#                             ,dilation=2)
#                 )

# transpose conv not support by opencl backedn: "ERROR CODE : -52"
# layers.append(nn.ConvTranspose2d(
#                 in_channels=indim,
#                 out_channels=outdim,
#                 kernel_size=4,
#                 stride=2,
#                 padding=1,
#                 output_padding=0,
#                 bias=False))
"""
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import torch
import torch.nn as nn
import math

MODE = 'large'
WIDTH = 0.75
EXPORT = False
JIT= False
BN_MOMENTUM = 0.1
CFGS = {'large': [# t, c, s, fpn
                [1, 16, 1, False],
                [6, 24, 2, False],
                [6, 24, 1, False],
                [6, 32, 2, True],
                [6, 32, 1, False],
                [6, 32, 1, False],
                [6, 64, 2, True],
                [6, 64, 1, False],
                [6, 64, 1, False],
                [6, 64, 1, False],
                [6, 96, 1, False],
                [6, 96, 1, False],
                [6, 96, 1, False],
                [6, 160, 2, True],
                [6, 160, 1, False],
                [6, 160, 1, False],
                [6, 320, 1, False],
                ]
        }

def _make_divisible(v, divisor, min_value=None):
    """
    This function is taken from the original tf repo.
    It ensures that all layers have a channel number that is divisible by 8
    It can be seen here:
    https://github.com/tensorflow/models/blob/master/research/slim/nets/mobilenet/mobilenet.py
    :param v:
    :param divisor:
    :param min_value:
    :return:
    """
    if min_value is None:
        min_value = divisor
    new_v = max(min_value, int(v + divisor / 2) // divisor * divisor)
    # Make sure that round down does not go down by more than 10%.
    if new_v < 0.9 * v:
        new_v += divisor
    return new_v

def conv_3x3_bn(inp, oup, stride):
    return nn.Sequential(
        nn.Conv2d(inp, oup, 3, stride, 1, bias=False),
        nn.BatchNorm2d(oup),
        nn.ReLU6()
    )

def conv_1x1_bn(inp, oup):
    return nn.Sequential(
        nn.Conv2d(inp, oup, 1, 1, 0, bias=False),
        nn.BatchNorm2d(oup),
        nn.ReLU6()
    )

class InvertedResidual_part1(nn.Module):
    def __init__(self, inp, hidden_dim, oup, kernel_size, stride):
        super(InvertedResidual_part1, self).__init__()
        assert stride in [1, 2]
        self.conv = nn.Sequential(
                # pw
                nn.Conv2d(inp, hidden_dim, 1, 1, 0, bias=False),
                nn.BatchNorm2d(hidden_dim),
                nn.ReLU6(inplace=True),
        )
    def forward(self, x):
        return self.conv(x)

class InvertedResidual_part2(nn.Module):
    def __init__(self, inp, hidden_dim, oup, kernel_size, stride):
        super(InvertedResidual_part2, self).__init__()
        self.conv = nn.Sequential(
                # dw
                nn.Conv2d(hidden_dim, hidden_dim, kernel_size, stride, (kernel_size - 1) // 2, groups=hidden_dim, bias=False),
                nn.BatchNorm2d(hidden_dim),
                nn.ReLU6(inplace=True),
                # pw-linear
                nn.Conv2d(hidden_dim, oup, 1, 1, 0, bias=False),
                nn.BatchNorm2d(oup),
            )
    def forward(self, x):
        return self.conv(x)

class SeparableConv2d(nn.Module):
    # borrow from https://github.com/tstandley/Xception-PyTorch/blob/master/xception.py
    def __init__(self,in_channels,out_channels,kernel_size=1,stride=1,padding=0,dilation=1,bias=False):
        super(SeparableConv2d,self).__init__()

        self.conv1 = nn.Conv2d(in_channels,in_channels,kernel_size,stride,padding,dilation,groups=in_channels,bias=bias)
        self.pointwise = nn.Conv2d(in_channels,out_channels,1,1,0,1,1,bias=bias)

    def forward(self,x):
        x = self.conv1(x)
        x = self.pointwise(x)
        return x

class PoseMobileNetV2(nn.Module):
    def __init__(self
                , heads
                , head_conv
                , mode
                , width_mult=0.75):
        super(PoseMobileNetV2, self).__init__()
        self.heads = heads
        self.width_mult = width_mult
        self.mode = mode
        self.cfgs = CFGS[self.mode]
        self.up_chanels = [256, 192, 128]
        # backbone stage
        input_channel = _make_divisible(16 * width_mult, 8)
        self.first_conv = conv_3x3_bn(3, input_channel, 2)
        self.features_part1 = nn.ModuleList([])
        self.features_part2 = nn.ModuleList([])
        self.fpnlist = []
        self.identify_list = []
        self.fpnop = nn.ModuleList([])
        upcnt = -1
        for exp_size, c, s, f in self.cfgs:
            exp_size = exp_size * c
            output_channel = _make_divisible(c * width_mult, 8)
            exp_size = _make_divisible(exp_size * width_mult, 8)
            if input_channel == output_channel and s == 1:
                self.identify_list.append(True)
            else:
                self.identify_list.append(False)
            if input_channel == exp_size:
                self.features_part1.append(nn.Identity())
            else:
                self.features_part1.append(\
                    InvertedResidual_part1(input_channel
                                            , exp_size
                                            , output_channel
                                            , 3
                                            , s))
            self.features_part2.append(\
                InvertedResidual_part2(input_channel
                                        , exp_size
                                        , output_channel
                                        , 3
                                        , s))
            # fpn
            if f:
                self.fpnlist.append(True)
                self.fpnop.append(SeparableConv2d(exp_size
                                                , self.up_chanels[upcnt]
                                                , kernel_size=3
                                                , padding=1
                                                , bias=True))
                upcnt -= 1
            else:
                self.fpnlist.append(False)
            input_channel = output_channel
        last_conv_channel = _make_divisible(1280.0 * width_mult, 8)
        self.last_conv = conv_1x1_bn(input_channel, last_conv_channel)

        # neck stage
        self.deconv1_part1 = self._make_upsample_part1(last_conv_channel//2, self.up_chanels[0]//2)
        self.deconv2_part1 = self._make_upsample_part1(self.up_chanels[0]//2, self.up_chanels[1]//2)
        self.deconv3_part1 = self._make_upsample_part1(self.up_chanels[1]//2, self.up_chanels[2]//2)
        self.deconv1_part2 = self._make_upsample_part2(last_conv_channel//2, self.up_chanels[0]//2)
        self.deconv2_part2 = self._make_upsample_part2(self.up_chanels[0]//2, self.up_chanels[1]//2)
        self.deconv3_part2 = self._make_upsample_part2(self.up_chanels[1]//2, self.up_chanels[2]//2)

        # head stage
        self.head_dim = {'hm':128, 'wh':64, 'reg':64}
        for head in sorted(self.heads):
            # 5x5
            self.__setattr__(head+'group4'
                            , nn.Sequential(*[
                                SeparableConv2d(self.up_chanels[-1]//4, self.head_dim[head]//4, kernel_size=5, padding=2, bias=True)
                                ,nn.BatchNorm2d(self.head_dim[head]//4, momentum=BN_MOMENTUM)
                                ,nn.ReLU(inplace=True)
                                ])
                            )
            # maxpool + 3x3
            self.__setattr__(head+'group1'
                            , nn.Sequential(*[
                                nn.MaxPool2d(3, stride=1, padding=1)
                                ,SeparableConv2d(self.up_chanels[-1]//4, self.head_dim[head]//4, kernel_size=3, padding=1, bias=True)
                                ,nn.BatchNorm2d(self.head_dim[head]//4, momentum=BN_MOMENTUM)
                                ,nn.ReLU(inplace=True)
                                ])
                            )
            # 1x1
            self.__setattr__(head+'group2'
                            , nn.Sequential(*[
                                nn.Conv2d(in_channels=self.up_chanels[-1]//4,
                                        out_channels=self.head_dim[head]//4,
                                        kernel_size=3,
                                        stride=1,
                                        padding=1)
                                ,nn.BatchNorm2d(self.head_dim[head]//4, momentum=BN_MOMENTUM)
                                ,nn.ReLU(inplace=True)
                                ])
                            )
            # 3x3
            self.__setattr__(head+'group3'
                            , nn.Sequential(*[
                                SeparableConv2d(self.up_chanels[-1]//4, self.head_dim[head]//4, kernel_size=3, padding=1, bias=True)
                                ,nn.BatchNorm2d(self.head_dim[head]//4, momentum=BN_MOMENTUM)
                                ,nn.ReLU(inplace=True)
                                ])
                            )
            self.__setattr__(head+'final'
                            , nn.Conv2d(in_channels=self.head_dim[head],
                                        out_channels=self.heads[head],
                                        kernel_size=1,
                                        stride=1,
                                        padding=0)
                            )

    def _make_upsample_part1(self, indim, outdim, dilation=1, padding=2):
        layers = []
        layers.append(SeparableConv2d(indim, outdim, kernel_size=5, padding=padding, bias=True ,dilation=dilation))
        layers.append(nn.BatchNorm2d(outdim, momentum=BN_MOMENTUM))
        layers.append(nn.ReLU(inplace=True))
        layers.append(nn.Upsample(scale_factor=2, mode='nearest'))
        return nn.Sequential(*layers)

    def _make_upsample_part2(self, indim, outdim, dilation=1, padding=1):
        layers = []
        layers.append(nn.Upsample(scale_factor=2, mode='nearest'))
        layers.append(SeparableConv2d(indim, outdim, kernel_size=3, padding=padding, bias=True ,dilation=dilation))
        layers.append(nn.BatchNorm2d(outdim, momentum=BN_MOMENTUM))
        layers.append(nn.ReLU(inplace=True))
        return nn.Sequential(*layers)

    def forward(self, x):
        _,_,inputh, inputw = x.size()

        # backbone stage
        fpnlist = []
        idx = 0
        x = self.first_conv(x)
        # print('###### x', x.size())
        for part1, part2, fpn, identify in zip(self.features_part1, self.features_part2, self.fpnlist, self.identify_list):
            hidden = part1(x)
            # print('##### hidden', hidden.size())
            y = part2(hidden)
            # print('##### y', y.size())
            if identify:
                x = x + y
            else:
                x = y
            # print('###### x', x.size())
            if fpn:
                # print('###### hidden', hidden.size())
                fpnlist.append(self.fpnop[idx](hidden))
                idx += 1
                # print('###### fpn', fpnlist[-1].size())
        x = self.last_conv(x)
        # print('###### x', x.size())
        _,_,backboneh, backbonew = x.size()
        assert inputh == backboneh * 32, "inputh: {}, backboneh: {}".format(inputh, backboneh)
        assert inputw == backbonew * 32, "inputw: {}, backbonew: {}".format(inputw, backbonew)

        # neck stage
        assert int(x.size()[1]) == 960, x.size()
        part1, part2 = torch.split(x, int(x.size()[1])//2, dim = 1)
        # print('###### part1', part1.size())
        # print('###### part2', part2.size())
        x = torch.cat([self.deconv1_part1(part1),self.deconv1_part2(part2)], dim=1) \
                    + fpnlist[2]
        # print('###### x', x.size())
        assert int(x.size()[1]) == self.up_chanels[0]
        part1, part2 = torch.split(x, int(x.size()[1])//2, dim = 1)
        # print('###### part1', part1.size())
        # print('###### part2', part2.size())
        x = torch.cat([self.deconv2_part1(part1) ,self.deconv2_part2(part2)], dim=1) \
                    + fpnlist[1]
        # print('###### x', x.size())
        assert int(x.size()[1]) == self.up_chanels[1]
        part1, part2 = torch.split(x, int(x.size()[1])//2, dim = 1)
        # print('###### part1', part1.size())
        # print('###### part2', part2.size())
        x = torch.cat([self.deconv3_part1(part1) ,self.deconv3_part2(part2)], dim=1) \
                    + fpnlist[0]
        # print('###### x', x.size())
        assert int(x.size()[1]) == self.up_chanels[2]

        _, _, neckh, neckw = x.size()
        assert inputh == neckh * 4, "inputh: {}, neckh: {}".format(inputh, neckh)
        assert inputw == neckw * 4, "inputw: {}, neckw: {}".format(inputw, neckw)

        # head stage
        ret = {}
        for head in self.heads:
            p1,p2,p3,p4 = torch.split(x, int(x.size()[1])//4, dim = 1)
            # print('###### p1', p1.size())
            # print('###### p2', p2.size())
            # print('###### p3', p3.size())
            # print('###### p4', p4.size())
            g1 = self.__getattr__(head+'group1')(p1)
            g2 = self.__getattr__(head+'group2')(p2)
            g3 = self.__getattr__(head+'group3')(p3)
            g4 = self.__getattr__(head+'group4')(p4)
            # print('###### g1', g1.size())
            # print('###### g2', g2.size())
            # print('###### g3', g3.size())
            # print('###### g4', g4.size())
            ret[head] = self.__getattr__(head+'final')(torch.cat([g1,g2,g3,g4],dim=1))
            # print('###### ', head, ret[head].size())
            if EXPORT:
                if head == 'hm':
                    ret[head] = ret[head].sigmoid_()
                    ret['hm_pool'] = nn.functional.max_pool2d(ret[head], (3, 3), stride=1, padding=1)
        if JIT:
            return tuple([v for k, v in ret.items()])
        else:
            return [ret]

def get_pose_net(num_layers, heads, head_conv):
    model = PoseMobileNetV2(heads, head_conv, mode=MODE, width_mult=WIDTH)
    return model


# if __name__ == "__main__":
#     import torch
#     model = get_pose_net(0, {'hm':29,'wh':2,'reg':2}, 0)
#     import sys
#     sys.path.append('/workspace/centernet/src/lib')
#     from models.model import load_model
#     model = load_model(model, '/workspace/centernet/exp/ctdet/baiguang_mobilenetv3magicv3_384x512/model_297.pth')
#     model.eval()
#     _ = torch.onnx._export(model
#             , torch.rand(1, 3, 288, 384)
#             , "/workspace/centernet/models/ctdet_mobilenetv3_magicv3.onnx"
#             , export_params=True
#             , opset_version = 10
#             , output_names=['hm', 'hm_pool', 'wh', 'reg'])
