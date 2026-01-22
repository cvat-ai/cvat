# Copyright (C) 2026 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import torch
import logging
import os

from pathlib import Path
from segment_anything.build_encoder import SAMEncoder


def find_model(model, weights, ext: str = ".pth"):
    """auto find model from weights folder"""
    suit_models = [p for p in os.listdir(weights)
        if model in p and p.endswith(ext) and os.path.isfile(os.path.join(weights, p))]
    if len(suit_models) > 0:
        if len(suit_models) > 1:
            import warnings
            warnings.warn("detect {} model more than 1, select index 0 for default, got {}".format(
                model, suit_models))
        weight = os.path.join(weights, suit_models[0])
    else:
        raise FileNotFoundError(
            "not found SAM checkpoint about sam_{}*.pth or {}*.pth in {}".format(model, model, weights))
    return weight


def export_onnx(checkpoint, dst: [Path, str] = None, gelu_approximate: bool = False, simplify=False):
    """export onnx SAM Encoder module only."""
    ONNX_LOGGER = logging.getLogger("onnx_logger")
    ONNX_LOGGER.setLevel(logging.INFO)
    console = logging.StreamHandler()
    console.setFormatter(logging.Formatter(
        fmt='[%(asctime)s] [ONX] [%(levelname).1s] %(message)s',
        datefmt='%m/%d/%Y-%H:%M:%S'))
    ONNX_LOGGER.addHandler(console)

    checkpoint = Path(checkpoint)
    ONNX_LOGGER.info("Loading model %s ..." % checkpoint.name)
    sam_encoder = SAMEncoder(checkpoint, device="cpu")

    if gelu_approximate:
        ONNX_LOGGER.info("gelu approximate enabled.")
        for n, m in sam_encoder.image_encoder.named_modules():
            if isinstance(m, torch.nn.GELU):
                m.approximate = "tanh"

    if dst is not None:
        if isinstance(dst, str):
            dst = Path(dst)
    else:
        dst = checkpoint.parent
    model_name = checkpoint.name.rsplit('.', 1)[0]
    model_save = str(dst / ("%s.onnx" % model_name))

    ONNX_LOGGER.info("Exporting onnx model...")
    # Torch2.8 will call optimize=True and set TORCH_ONNX_ENABLE_OPTIMIZATION=1,
    #   but version lower than v2.8 must set env key:value to activate optimize=True
    os.environ["TORCH_ONNX_ENABLE_OPTIMIZATION"] = "1"

    example_imgp = Path(__file__).parent.parent / "assets/notebook1.png"
    if example_imgp.exists():
        import cv2
        import numpy as np
        example_img = cv2.imdecode(np.fromfile(example_imgp, np.uint8), cv2.IMREAD_COLOR)
        example_img = cv2.cvtColor(example_img, cv2.COLOR_BGR2RGB)
        example_tensor = tuple((sam_encoder.preprocess(example_img).to("cpu"), ))
        ONNX_LOGGER.info("Using assets/notebook1.png input to inference model.")
    else:
        example_tensor = tuple((torch.rand(1, 3, *([sam_encoder.image_encoder.img_size] * 2)).to("cpu"), ))
        ONNX_LOGGER.info("Using torch.rand input to inference model.")

    torch.onnx.export(
        sam_encoder.image_encoder,
        example_tensor,
        model_save,
        input_names =["images"],
        output_names=["embeddings"],
        training=torch.onnx.TrainingMode.EVAL,
        export_params=True,
        verbose=False,
        dynamo=True,
        opset_version=18,
        external_data=True,
        optimize=True)  # must set env TORCH_ONNX_ENABLE_OPTIMIZATION=1
    ONNX_LOGGER.info("Model has successfully been run with ONNXRuntime.")
    ONNX_LOGGER.info("Model ONNX exported to %s" % model_save)

    if simplify:
        ONNX_LOGGER.info("ONNX simplify enabled")

        import onnx
        import onnxsim

        model = onnx.load(model_save)
        # fix Error: RuntimeError: The model does not have an ir_version set properly.
        #     resource code add exception such: ... except (ValueError, RuntimeError):
        # References: https://github.com/daquexian/onnx-simplifier/pull/336/files
        model_simp, check = onnxsim.simplify(model)
        assert check, "ONNX simplification failed"

        onnx_sim_model_save = str(dst / ("%s-sim.onnx" % model_name))
        onnx.save(model_simp, onnx_sim_model_save, save_as_external_data=True, location="%s-sim.onnx.data" % model_name)
        ONNX_LOGGER.info("ONNX-sim exported to %s" % onnx_sim_model_save)


def export_tensorrt(onnx_checkpoint, dst: [Path, str] = None, verbose=False):
    """export tensorrt SAM Encoder module only. tensorrt-cu12==10.6.0"""
    import tensorrt as trt

    TRT_LOGGER = trt.Logger(trt.Logger.VERBOSE if verbose else trt.Logger.INFO)

    builder = trt.Builder(TRT_LOGGER)
    network = builder.create_network(0)  # 1 << int(trt.NetworkDefinitionCreationFlag.STRONGLY_TYPED)
    parser = trt.OnnxParser(network, TRT_LOGGER)

    TRT_LOGGER.log(TRT_LOGGER.Severity.INFO, f"Tensorrt load onnx model from {onnx_checkpoint}")
    success = parser.parse_from_file(onnx_checkpoint)
    if not success:
        for idx in range(parser.num_errors):
            TRT_LOGGER.log(TRT_LOGGER.Severity.ERROR, str(parser.get_error(idx)))
        raise ValueError("Tensorrt load onnx model failed.")

    config = builder.create_builder_config()
    # config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, (1 << 30) * 4)  # 4 GB
    # if fp16 and builder.platform_has_fast_fp16:
    #     config.set_flag(trt.BuilderFlag.FP16)
    #     config.set_quantization_flag(trt.tensorrt.QuantizationFlag)
    # if int8 and builder.platform_has_fast_int8:
    #     config.set_flag(trt.BuilderFlag.INT8)
    #     config.set_quantization_flag(trt.tensorrt.QuantizationFlag)

    TRT_LOGGER.log(TRT_LOGGER.Severity.INFO, "Building TensorRT engine (this may take several minutes)...")
    serialized_engine = builder.build_serialized_network(network, config)
    if serialized_engine is None:
        raise RuntimeError("Tensorrt Engine build failed")

    if dst is not None:
        if isinstance(dst, str):
            dst = Path(dst)
    else:
        dst = Path(onnx_checkpoint).parent

    model_name = Path(onnx_checkpoint).name.rsplit('.', 1)[0]
    model_save = dst / ("%s.engine" % model_name)
    with open(model_save, "wb") as f:
        f.write(serialized_engine)

    TRT_LOGGER.log(TRT_LOGGER.Severity.INFO, "TensorRT engine saved to: %s" % model_save)


def sam_encoder_export(
    mode: str, model: str, weights: str, gelu_approximate: bool = False, simplify=False, verbose: bool = False):
    """export SAM Encoder module only"""
    _SUPPORT_MODE = ("trt", "engine", "onnx")
    _SUPPORT_MODEL = ("vit_h", "vit_l", "vit_b", "sam_vit_h", "sam_vit_l", "sam_vit_b")
    assert mode in _SUPPORT_MODE, "SAM Model export only support %s" % str(_SUPPORT_MODE)
    assert model in _SUPPORT_MODEL, "SAM Model only support %s" % str(_SUPPORT_MODEL)

    weight = find_model(model, weights, ext=".pth")  # auto find model with "model keyword" from weights
    onnx_checkpoint = Path(weight.rsplit('.', 1)[0] + ("-sim.onnx" if simplify else ".onnx"))

    # export onnx
    if not os.path.exists(onnx_checkpoint):
        export_onnx(weight, gelu_approximate=gelu_approximate, simplify=simplify)

    # export tensorrt
    if mode in ("trt", "engine"):
        export_tensorrt(str(onnx_checkpoint), verbose=verbose)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str,
                        choices=["onnx", "trt"],
                        help='SAMEncoder mode export format support ("onnx", "trt")')
    parser.add_argument("--model", type=str,
                        choices=["vit_h", "vit_b", "vit_l", "sam_vit_h", "sam_vit_b", "sam_vit_l"],
                        help='SAMEncoder model support ("vit_h", "vit_b", "vit_l", "sam_vit_h", "sam_vit_b", "sam_vit_l")')
    parser.add_argument("--weights", type=str, default="./",
                        help='Weight file from which folder.')
    parser.add_argument("--simplify", action="store_true",
                        help="Simplify onnx model inference graph.")
    opt = parser.parse_args()

    sam_encoder_export(mode=opt.mode, model=opt.model, weights=opt.weights, simplify=opt.simplify)
