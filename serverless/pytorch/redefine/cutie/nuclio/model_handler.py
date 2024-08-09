import torch
import numpy as np
from hydra import compose, initialize
import cv2
from omegaconf import open_dict
import os
from typing import Optional, List, Dict, Tuple, Literal
import jsonpickle
from copy import copy

from cutie.model.cutie import CUTIE
from cutie.inference.inference_core import InferenceCore
from cutie.inference.utils.args_utils import get_dataset_cfg

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

    # contours = None
    # if int(cv2.__version__.split('.')[0]) > 3:
    #     contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    # else:
    #     contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[1]

    # contours = max(contours, key=lambda arr: arr.size)
    # if contours.shape.count(1):
    #     contours = np.squeeze(contours)
    # if contours.size < 3 * 2:
    #     raise Exception('Less then three point have been detected. Can not build a polygon.')

    # polygon = []
    # for point in contours:
    #     polygon.append([int(point[0]), int(point[1])])

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
    image = torch.from_numpy(image.copy()).to(device=device)
    # Convert to float32 and transpose to (3, H, W)
    image = image.permute(2, 0, 1).float()
    # Normalize the image
    image = image / 255.0
    return image

class ModelHandler:
    def __init__(self) -> CUTIE:
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        coco_lvis_weights = '/opt/nuclio/cutie/coco_lvis_h18_itermask.pth'
        cutie_base_weights = '/opt/nuclio/cutie/cutie-base-mega.pth'

        assert os.path.exists(cutie_base_weights), f"{cutie_base_weights} does not exist"

        # load configurations
        initialize(version_base='1.3.2', config_path="./config", job_name="eval_config")
        cfg = compose(config_name="eval_config")
        with open_dict(cfg):
            cfg['weights'] = cutie_base_weights
        get_dataset_cfg(cfg)

        # load model
        cutie = CUTIE(cfg).to(self.device).eval()
        model_weights = torch.load(cutie_base_weights, map_location=torch.device(self.device))
        cutie.load_weights(model_weights)

        # use one processor per video
        # self.processor = InferenceCore(cutie, cfg=cutie.cfg)
        # self.processor.max_internal_size = 480
        self.cutie = cutie

    def encode_state(self, state):
        # state.pop('net', None)

        for k,v in state.items():
            state[k] = jsonpickle.encode(v)

        return state

    def decode_state(self, state):
        for k,v in state.items():
            state[k] = jsonpickle.decode(v)

        # state['net'] = copy(self.cutie)

        self.cutie = state['net']
        self.processor = InferenceCore(self.cutie, cfg=self.cutie.cfg)
        self.processor.max_internal_size = 480

    def handle(self, image: np.array, shape: Optional[List[float]]=None, state: Optional[Dict]=None)->Tuple[List[float], Optional[Dict]]:
        image = prepare_numpy_image(image, self.device)

        if state is None:
            mask = convert_polygon_to_mask(image, shape) # TODO: only handles single object, need to make sure multi-object can be dealt with
            objects = np.unique(mask)
            # background '0' does not count as an object
            objects = objects[objects != 0].tolist()
            mask = torch.from_numpy(mask).to(self.device)
            self.processor = InferenceCore(self.cutie, cfg=self.cutie.cfg)
            self.processor.max_internal_size = 480
            output_prob = self.processor.step(image, mask, objects=objects)
            state = {}
            state['net'] = self.cutie
            state = self.encode_state(state)
        else:
            self.decode_state(state)
            output_prob = self.processor.step(image)
            state = self.encode_state(state)

        mask = self.processor.output_prob_to_mask(output_prob).cpu().numpy().astype(np.uint8)

        shape = convert_mask_to_polygon(mask)# Convert a mask to a polygon


        return shape, state

