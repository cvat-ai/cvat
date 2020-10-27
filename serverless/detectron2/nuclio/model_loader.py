
from PIL import Image


from detectron2 import model_zoo
from detectron2.config import get_cfg
from detectron2.data.detection_utils import read_image
from detectron2.utils.logger import setup_logger
from detectron2.engine import DefaultPredictor
from detectron2.data import MetadataCatalog
import numpy as np
from imantics import Polygons, Mask


class ModelLoader:
    def __init__(self, model_path, confidence_threshold):
        self.cfg = get_cfg()
        self.cfg.merge_from_file(model_zoo.get_config_file(model_path))
        self.cfg.MODEL.DEVICE = 'cpu'
        self.cfg.MODEL.ROI_HEADS.SCORE_TRESH_TEST = confidence_threshold
        self.cfg.MODEL.RETINANET.SCORE_THRESH_TEST = confidence_threshold
        self.cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = confidence_threshold
        self.cfg.MODEL.PANOPTIC_FPN.COMBINE.INSTANCES_CONFIDENCE_THRESH = confidence_threshold
        self.cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url(model_path)

        self.predictor = DefaultPredictor(self.cfg)

        self.labels = MetadataCatalog.get(self.cfg.DATASETS.TRAIN[0]).thing_classes

    def __del__(self):
        pass

    def infer(self, image):
        output = self.predictor(image)['instances'].to('cpu')
        result = []
        for i in range(len(output)):
            label = self.labels[output.pred_classes[i]]
            polygons = Mask(np.asarray(output[i].pred_masks)[0]).polygons()
            points = polygons.points[0].ravel().tolist()
            result.append({"confidence": str(output[i].scores), "label": label, "points": points,  "type": "polygon",})
        return result

