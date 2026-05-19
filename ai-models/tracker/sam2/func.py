# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import collections
import dataclasses
from typing import TypedDict

import cv2
import cvat_sdk.auto_annotation as cvataa
import numpy as np
import PIL.Image
import torch
import torchvision.transforms
from cvat_sdk.masks import decode_mask, encode_mask
from sam2.sam2_video_predictor import SAM2VideoPredictor
from sam2.utils.misc import fill_holes_in_mask_scores


@dataclasses.dataclass(frozen=True, kw_only=True)
class _PreprocessedImage:
    original_width: int
    original_height: int
    vision_feats: list[torch.Tensor]
    vision_pos_embeds: list[torch.Tensor]
    feat_sizes: list[tuple[int, int]]


class _PredictorOutputs(TypedDict):
    # We always keep 1 cond_frame_outputs and up to num_maskmem non_cond_frame_outputs.

    cond_frame_outputs: dict[int, dict]
    # We make this an OrderedDict to make popping old elements easier.
    non_cond_frame_outputs: collections.OrderedDict[int, dict]


@dataclasses.dataclass(kw_only=True)
class _TrackingState:
    frame_idx: int
    predictor_outputs: _PredictorOutputs


class _Sam2Tracker:
    def __init__(self, model_id: str, device: str = "cpu", **kwargs) -> None:
        self._device = torch.device(device)

        if self._device.type == "cuda":
            torch.set_autocast_enabled(True)
            torch.set_autocast_gpu_dtype(torch.bfloat16)
            if torch.cuda.get_device_properties(self._device).major >= 8:
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True

        self._predictor = SAM2VideoPredictor.from_pretrained(
            model_id, device=self._device, **kwargs
        )
        self._transform = torchvision.transforms.Compose(
            [
                torchvision.transforms.Resize(
                    (self._predictor.image_size, self._predictor.image_size)
                ),
                torchvision.transforms.ToTensor(),
                torchvision.transforms.Normalize(
                    # see load_video_frames in the SAM2 source
                    mean=(0.485, 0.456, 0.406),
                    std=(0.229, 0.224, 0.225),
                ),
            ]
        )

    spec = cvataa.TrackingFunctionSpec(supported_shape_types=["mask", "polygon"])

    @torch.inference_mode()
    def preprocess_image(
        self, context: cvataa.TrackingFunctionContext, image: PIL.Image.Image
    ) -> _PreprocessedImage:
        image = image.convert("RGB")

        image_tensor = self._transform(image).unsqueeze(0).to(device=self._device)
        backbone_out = self._predictor.forward_image(image_tensor)
        vision_feats = backbone_out["backbone_fpn"][-self._predictor.num_feature_levels :]
        vision_pos_embeds = backbone_out["vision_pos_enc"][-self._predictor.num_feature_levels :]

        return _PreprocessedImage(
            original_width=image.width,
            original_height=image.height,
            vision_feats=[x.flatten(2).permute(2, 0, 1) for x in vision_feats],
            vision_pos_embeds=[x.flatten(2).permute(2, 0, 1) for x in vision_pos_embeds],
            feat_sizes=[(x.shape[-2], x.shape[-1]) for x in vision_pos_embeds],
        )

    def _call_predictor(self, *, pp_image: _PreprocessedImage, frame_idx: int, **kwargs) -> dict:
        out = self._predictor.track_step(
            current_vision_feats=pp_image.vision_feats,
            current_vision_pos_embeds=pp_image.vision_pos_embeds,
            feat_sizes=pp_image.feat_sizes,
            point_inputs=None,
            frame_idx=frame_idx,
            num_frames=frame_idx + 1,
            **kwargs,
        )

        return {
            "maskmem_features": out["maskmem_features"],
            "maskmem_pos_enc": out["maskmem_pos_enc"][-1:],
            "pred_masks": fill_holes_in_mask_scores(
                out["pred_masks"], self._predictor.fill_hole_area
            ),
            "obj_ptr": out["obj_ptr"],
        }

    def _shape_to_mask(
        self, pp_image: _PreprocessedImage, shape: cvataa.TrackableShape
    ) -> np.ndarray:
        if shape.type == "mask":
            return decode_mask(
                shape.points,
                image_width=pp_image.original_width,
                image_height=pp_image.original_height,
            )

        if shape.type == "polygon":
            mask = np.zeros((pp_image.original_height, pp_image.original_width), dtype=np.uint8)
            points_array = np.array(shape.points, dtype=np.int32).reshape((-1, 2))
            cv2.fillPoly(mask, [points_array], 1)
            return mask

        assert False, f"unexpected shape type {shape.type!r}"

    @torch.inference_mode()
    def init_tracking_state(
        self,
        context: cvataa.TrackingFunctionShapeContext,
        pp_image: _PreprocessedImage,
        shape: cvataa.TrackableShape,
    ) -> _TrackingState:
        mask = torch.from_numpy(self._shape_to_mask(pp_image, shape))

        resized_mask = torch.nn.functional.interpolate(
            mask.float()[None, None],  # add batch and channel dimensions
            (self._predictor.image_size, self._predictor.image_size),
            mode="bilinear",
            align_corners=False,
        )
        resized_mask = (resized_mask >= 0.5).float().to(device=self._device)

        current_out = self._call_predictor(
            pp_image=pp_image,
            frame_idx=0,
            is_init_cond_frame=True,
            mask_inputs=resized_mask,
            output_dict={},
        )

        return _TrackingState(
            frame_idx=0,
            predictor_outputs={
                "cond_frame_outputs": {0: current_out},
                "non_cond_frame_outputs": collections.OrderedDict(),
            },
        )

    def _mask_to_shape(
        self, context: cvataa.TrackingFunctionShapeContext, mask: torch.Tensor
    ) -> cvataa.TrackableShape | None:
        if context.original_shape_type == "mask":
            return cvataa.TrackableShape(type="mask", points=encode_mask(mask))

        if context.original_shape_type == "polygon":
            mask_np = np.asarray(mask, dtype=np.uint8)
            contours, _ = cv2.findContours(mask_np, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return None

            largest_contour = max(contours, key=cv2.contourArea)
            approx_contour = cv2.approxPolyDP(largest_contour, epsilon=1.0, closed=True)
            if approx_contour.shape[0] < 3:
                return None

            return cvataa.TrackableShape(type="polygon", points=approx_contour.flatten().tolist())

        assert False, f"unexpected shape type {context.original_shape_type!r}"

    @torch.inference_mode()
    def track(
        self,
        context: cvataa.TrackingFunctionShapeContext,
        pp_image: _PreprocessedImage,
        state: _TrackingState,
    ) -> cvataa.TrackableShape | None:
        state.frame_idx += 1

        current_out = self._call_predictor(
            pp_image=pp_image,
            frame_idx=state.frame_idx,
            is_init_cond_frame=False,
            mask_inputs=None,
            output_dict=state.predictor_outputs,
        )

        non_cond_frame_outputs = state.predictor_outputs["non_cond_frame_outputs"]
        non_cond_frame_outputs[state.frame_idx] = current_out

        # discard old outputs as the predictor uses up to num_maskmem elements
        while len(non_cond_frame_outputs) > self._predictor.num_maskmem:
            non_cond_frame_outputs.popitem(last=False)

        output_mask = (
            torch.nn.functional.interpolate(
                current_out["pred_masks"],
                size=(pp_image.original_height, pp_image.original_width),
                align_corners=False,
                mode="bilinear",
                antialias=True,
            )[0, 0]
            > 0
        )

        if output_mask.any():
            return self._mask_to_shape(context, output_mask.cpu())
        else:
            return None


create = _Sam2Tracker
