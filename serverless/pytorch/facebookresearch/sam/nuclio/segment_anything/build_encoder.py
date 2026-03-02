# Copyright (C) 2026 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import re
import tensorrt as trt
import numpy as np
import torch.nn.functional as F
import torch

from pathlib import Path
from typing import Union, BinaryIO
from functools import partial

from segment_anything.modeling import ImageEncoderViT
from segment_anything.utils.transforms import ResizeLongestSide


class SAMEncoderTRTInference:
    """SAM Encoder tensorrt inference handle"""
    _TRT2TORCH_DTYPE_MAP = {
        trt.DataType.FLOAT: torch.float32,
        trt.DataType.HALF: torch.float16,
        trt.DataType.INT8: torch.int8
    }

    def __init__(self, checkpoint: Path, device: Union[str, torch.device]):
        # load checkpoint
        torch.cuda.set_device(device)
        trt_logger = trt.Logger(trt.Logger.INFO)
        with open(checkpoint, "rb") as f, trt.Runtime(trt_logger) as runtime:
            # using IStreamReaderV2 can accelerate import and reduce memory usage, but bug occupy lower v10.9.0.
            # References: https://github.com/NVIDIA/TensorRT/issues/4327#issuecomment-2715799757
            if tuple(trt.__version__.split('.')) >= ('10', '9', '0'):
                class FileStreamReaderV2(trt.IStreamReaderV2):  # memory efficient impl
                    """
                    Class that supplies data to TensorRT from a stream, without loading the whole file into memory.
                    Moves engine file directly to CUDA memory, without first allocating it all in CPU memory.
                    Args:
                         file (BinaryIO):
                             The file to the serialized engine file.
                    """

                    def __init__(self, file: BinaryIO):
                        super(FileStreamReaderV2, self).__init__()
                        self._file = file
                        # Determine the file length (used for boundary checking and seeking).
                        self._file.seek(0, 2)  # Move to the end of the file.
                        self._length = self._file.tell()
                        self._file.seek(0, 0)  # Return to the start of the file.

                    def read(self, size: int, cudaStreamPtr):
                        """
                        Reads a chunk of the engine file from disk.

                        Args:
                            size (int): The number of bytes to read.
                            cudaStreamPtr: A pointer to a CUDA stream (not used in this implementation).

                        Returns:
                            bytes: The next chunk of data from the file.

                        Raises:
                            ValueError: If the requested read would exceed the file's length.
                        """
                        current_pos = self._file.tell()
                        if current_pos >= self._length:
                            return b""  # EOF
                        data = self._file.read(size)
                        return data

                    def seek(self, offset: int, where: trt.SeekPosition):
                        """
                        Repositions the file pointer based on the offset and seek position.

                        Args:
                            offset (int): The offset to seek.
                            where (trt.SeekPosition): The reference position which can be:
                                - trt.SeekPosition.SET: Begin at the start of the file.
                                - trt.SeekPosition.CUR: Relative to the current file position.
                                - trt.SeekPosition.END: Relative to the end of the file.

                        Raises:
                            ValueError: If an invalid seek position is provided.
                        """
                        if where == trt.SeekPosition.SET:
                            self._file.seek(offset, 0)
                        elif where == trt.SeekPosition.CUR:
                            self._file.seek(offset, 1)
                        elif where == trt.SeekPosition.END:
                            self._file.seek(-offset, 2)
                        else:
                            raise ValueError(f"Invalid seek position: {where}")
                reader = FileStreamReaderV2(f)  # lower memory method
                engine: trt.ICudaEngine = runtime.deserialize_cuda_engine(reader)
            else:
                engine: trt.ICudaEngine = runtime.deserialize_cuda_engine(f.read())

        # define cuda stream and context
        self.stream = torch.cuda.Stream(device)
        self.context = engine.create_execution_context()

        # load input and output infos for define cuda tensor (shape, dtype)
        inp_name, out_name = [], []
        inp_shape, inp_dtype, out_shape, out_dtype = None, None, None, None
        for bind_name in engine:
            mode = engine.get_tensor_mode(bind_name)
            if mode == trt.TensorIOMode.INPUT:
                inp_name.append(bind_name)
                inp_shape = tuple(i for i in engine.get_tensor_shape(bind_name))
                inp_dtype = self._TRT2TORCH_DTYPE_MAP[engine.get_tensor_dtype(bind_name)]
            else:
                out_name.append(bind_name)
                out_shape = tuple(i for i in engine.get_tensor_shape(bind_name))
                out_dtype = self._TRT2TORCH_DTYPE_MAP[engine.get_tensor_dtype(bind_name)]

        assert len(inp_name) == 1, "SAMEncoder input bind should be 1, got %s" % str(inp_name)
        assert len(out_name) == 1, "SAMEncoder output bind should be 1, got %s" % str(out_name)

        self.inp_name, self.out_name = inp_name[0], out_name[0]
        self.inp_dtype = inp_dtype

        # copy output torch cuda tensor addr to tensorrt engine
        self._output = torch.zeros(out_shape, dtype=out_dtype, device=device).contiguous()
        self.context.set_tensor_address(self.out_name, self._output.data_ptr())

    def __call__(self, x: torch.Tensor) -> torch.Tensor:
        """tensorrt inference engine"""
        # copy input torch cuda tensor addr to tensorrt engine
        self.context.set_tensor_address(self.inp_name, x.data_ptr())
        with torch.cuda.stream(self.stream):
            self.context.execute_async_v3(self.stream.cuda_stream)
            self.stream.synchronize()
        return self._output


class SAMEncoder:
    """
    trt inference example: (pycuda)
    References: https://github.com/NVIDIA/object-detection-tensorrt-example/blob/master/SSD_Model/utils/inference.py
    pth inference example:
    References: https://github.com/facebookresearch/segment-anything/blob/dca509fe793f601edb92606367a655c15ac00fdf/segment_anything/predictor.py#L89
    """

    SAMEncoderParams = {
        "vit_h": dict(
            encoder_embed_dim=1280,
            encoder_depth=32,
            encoder_num_heads=16,
            encoder_global_attn_indexes=[7, 15, 23, 31],
        ),
        "vit_l": dict(
            encoder_embed_dim=1024,
            encoder_depth=24,
            encoder_num_heads=16,
            encoder_global_attn_indexes=[5, 11, 17, 23],
        ),
        "vit_b": dict(
            encoder_embed_dim=768,
            encoder_depth=12,
            encoder_num_heads=12,
            encoder_global_attn_indexes=[2, 5, 8, 11],
        ),
    }
    ImageSize = 1024

    def __init__(self, checkpoint: [str, Path], device: [str, torch.device] = "cpu"):
        self.device = torch.device(device)
        if not isinstance(checkpoint, Path):
            checkpoint = Path(checkpoint)

        if checkpoint.suffix in (".engine", ".trt"):
            assert self.device.type == "cuda", "SAM Encoder trt must use cuda device, got %s" % device
            self.image_encoder, self.inp_dtype = self.builder_trt(checkpoint)
        elif checkpoint.suffix in (".pth", ):
            self.image_encoder, self.inp_dtype = self.builder_pth(checkpoint)
            self.image_encoder.to(device)
        else:
            raise TypeError("SAMEncoder not support type {}, got {}".format(checkpoint.suffix, checkpoint))

        self.transform = ResizeLongestSide(self.ImageSize)
        self.pixel_mean = torch.Tensor([123.675, 116.28, 103.53]).view(-1, 1, 1).to(self.inp_dtype).to(device)
        self.pixel_std = torch.Tensor([58.395, 57.12, 57.375]).view(-1, 1, 1).to(self.inp_dtype).to(device)
        self.forward(np.random.randint(0, 255, (1024, 1024, 3), np.uint8))  # warmup

    def builder_trt(self, checkpoint: Path) -> tuple[SAMEncoderTRTInference, torch.dtype]:
        """load tensorrt engine model from checkpoint"""
        sam_encoder = SAMEncoderTRTInference(checkpoint, self.device)
        return sam_encoder, sam_encoder.inp_dtype

    def builder_pth(self, checkpoint: Path) -> tuple[ImageEncoderViT, torch.dtype]:
        """load pytorch engine model from checkpoint"""
        model_type = re.search(r"_(vit_[a-z])_", checkpoint.name.rsplit('.', 1)[0].lower())
        assert model_type, "Model Type NotFound Error: can't not found keyword such vit_* from %s" % checkpoint.name
        params = self.SAMEncoderParams[model_type.group(1)]

        prompt_embed_dim = 256
        vit_patch_size = 16
        sam_encoder = ImageEncoderViT(
            depth=params["encoder_depth"],
            embed_dim=params["encoder_embed_dim"],
            img_size=self.ImageSize,
            mlp_ratio=4,
            norm_layer=partial(torch.nn.LayerNorm, eps=1e-6),  # type: ignore[assignment, misc]
            num_heads=params["encoder_num_heads"],
            patch_size=vit_patch_size,
            qkv_bias=True,
            use_rel_pos=True,
            global_attn_indexes=params["encoder_global_attn_indexes"],
            window_size=14,
            out_chans=prompt_embed_dim).eval()
        if checkpoint is not None:
            # Load full SAM model checkpoint and pruning
            with open(checkpoint, "rb") as f:
                kw = "image_encoder."
                state_dict = torch.load(f, weights_only=True)
                state_dict = {k[len(kw): ]: v for k, v in state_dict.items() if k.startswith(kw)}
            sam_encoder.load_state_dict(state_dict)
        inp_dtype = state_dict[list(state_dict.keys())[0]].dtype
        return sam_encoder, inp_dtype

    def preprocess(self, x: np.ndarray) -> torch.Tensor:
        """Normalize pixel values and pad to a square input."""
        # NOTE: x color_format must RGB
        # resize and convert numpy to tensor
        x = self.transform.apply_image(x)
        x = torch.as_tensor(x, dtype=self.inp_dtype, device=self.device)
        x = x.permute(2, 0, 1)[None, :, :, :]

        # Normalize colors
        x = (x - self.pixel_mean) / self.pixel_std

        # Padding tensor size
        h, w = x.shape[-2:]
        padh = self.ImageSize - h
        padw = self.ImageSize - w
        x = F.pad(x, (0, padw, 0, padh))
        return x.contiguous()

    @torch.no_grad()
    def forward(self, x: np.ndarray) -> torch.Tensor:
        """model forward function"""
        # NOTE: return must contiguous() when model mode is trt
        x = self.preprocess(x)
        features = self.image_encoder(x)
        return features

    def __call__(self, x: np.ndarray) -> torch.Tensor:
        return self.forward(x)
