from typing import Literal, Optional, Dict, List, Tuple

import jsonpickle
import numpy as np
import torch
import cv2

from model.network import XMem
from inference.inference_core import InferenceCore
from inference.data.mask_mapper import MaskMapper
from inference.memory_manager import MemoryManager


def prepare_numpy_image(image: np.ndarray, device: Literal["cpu", "cuda"]):
    """Converts a numpy image to a torch tensor with the correct shape and dtype.

    Args:
        image (np.ndarray): The image to convert. Should be in the format (H, W, 3) and dtype uint8.

    Returns:
        torch.Tensor: The converted image, normalized, on the correct device as float32 with shape (3, H, W).
    """

    assert image.shape[2] == 3, "Image should be in the format (H, W, 3)"
    assert len(image.shape) == 3, "Image should be of shape (H, W, 3)"
    assert image.dtype == np.uint8, "Image should be of dtype uint8"
    assert device in ["cpu", "cuda"], "Device should be either 'cpu' or 'cuda'"

    # Put the image on the correct device
    image = torch.from_numpy(image).to(device=device)
    # Convert to float32 and transpose to (3, H, W)
    image = image.permute(2, 0, 1).float()
    # Normalize the image
    image = image / 255.0
    return image


def convert_polygon_to_mask(image: np.ndarray, points: List) -> np.ndarray:
    """Converts a polygon to a mask.

    Args:
        image (np.ndarray): The image to get the shape from.
        points (list): The points of the polygon.

    Returns:
        np.ndarray: The mask of the polygon.
    """
    h, w = image.shape[:2]
    if len(points) == 0:
        return np.zeros((h, w), dtype=np.int32)
    points = np.array(points).reshape(-1, 2).astype(np.int32)
    mask = np.zeros((h, w), dtype=np.int32)
    mask = cv2.fillPoly(mask, [points], 1)
    return mask


def convert_mask_to_polygon(mask: np.ndarray) -> list:
    """Converts a mask to a polygon.

    Since tracking designed on one object at that time, only the largest contour is returned.

    Args:
        mask (np.ndarray): The mask to get contours from.

    Returns:
        list: The polygon of the mask.
    """
    contours = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS
    )[0]

    if len(contours) == 0:
        return []

    contours = max(contours, key=lambda arr: arr.size)

    if contours.shape.count(1):
        contours = np.squeeze(contours)

    if contours.size < 3 * 2:
        return []

    else:
        return contours.reshape(-1).tolist()


class ModelHandler:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.weight_path = "/xmem.pth"  # Absolute path of the model
        self.config = {
            "mem_every": 5,
            "deep_update_every": -1,
            "enable_long_term": True,
            "enable_long_term_count_usage": True,
            "disable_long_term": False,
            "max_mid_term_frames": 10,
            "min_mid_term_frames": 5,
            "max_long_term_elements": 500,
            "num_prototypes": 128,
            "top_k": 30,
            "key_dim": 64,
            "value_dim": 512,
            "hidden_dim": 64,
        }

        self.model = XMem(
            self.config, model_path=self.weight_path, map_location=self.device
        )
        self.model = self.model.eval()
        self.model = self.model.to(self.device)

        weights = torch.load(self.weight_path, map_location=self.device)
        self.model.load_weights(weights, init_as_zero_if_needed=True)

        self.mask_mapper = MaskMapper()
        self.tracker = InferenceCore(self.model, self.config)

    def encode_state(self):
        state = {}
        state["curr_ti"] = jsonpickle.encode(self.tracker.curr_ti)
        state["last_mem_ti"] = jsonpickle.encode(self.tracker.last_mem_ti)
        state["last_deep_update_ti"] = jsonpickle.encode(
            self.tracker.last_deep_update_ti
        )
        state["memory"] = jsonpickle.encode(self.tracker.memory)
        return state

    def clear_memory(self):
        self.tracker.curr_ti = -1
        self.tracker.last_mem_ti = 0
        if not self.tracker.deep_update_sync:
            self.tracker.last_deep_update_ti = -self.tracker.deep_update_every
        self.tracker.memory = MemoryManager(config=self.config)
        if self.device == "cuda":
            torch.cuda.synchronize()
            torch.cuda.empty_cache()

    def decode_state(self, state):
        self.tracker.curr_ti = jsonpickle.decode(state["curr_ti"])
        self.tracker.last_mem_ti = jsonpickle.decode(state["last_mem_ti"])
        self.tracker.last_deep_update_ti = jsonpickle.decode(
            state["last_deep_update_ti"]
        )
        self.tracker.memory = jsonpickle.decode(state["memory"])

    def init_tracker(self, image: np.ndarray, masks: np.ndarray) -> None:
        image = prepare_numpy_image(image, self.device)
        if masks is not None:
            masks, labels = self.mask_mapper.convert_mask(masks, exhaustive=True)
            masks = masks.to(self.device)
            self.tracker.set_all_labels(list(self.mask_mapper.remappings.values()))
        else:
            labels = None
        self.tracker.step(image, masks, labels)

    def track(self, image: np.ndarray) -> np.ndarray:
        image = prepare_numpy_image(image, self.device)
        prob = self.tracker.step(image)
        mask = torch.max(prob, dim=0).indices
        mask = mask.numpy(force=True)
        return mask

    def infer(
        self,
        image: np.ndarray,
        shape: Optional[List[float]] = None,
        state: Optional[Dict] = None,
    ) -> Tuple[List[float], Optional[Dict]]:
        with torch.autograd.set_grad_enabled(False) and torch.inference_mode(True):
            with torch.cuda.amp.autocast(
                enabled=True if self.device == "cuda" else False
            ):
                if state is None:
                    mask = convert_polygon_to_mask(image, shape)
                    self.init_tracker(image, mask)
                    state = self.encode_state()

                else:
                    self.decode_state(state)
                    mask = self.track(image)
                    state = self.encode_state()
                    shape = convert_mask_to_polygon(mask)
                self.clear_memory()

        return shape, state
