from abc import ABC, abstractmethod
import torch
import cv2 as cv
import numpy as np
from anomalib.data import PredictDataset
from anomalib.engine import Engine

class BaseModelHandler(ABC):
    def __init__(self):
        self.model = None
        self.engine = Engine()
        self.ckpt_path = None
        self.initialize_model()  # Automatically initialize the model during instantiation

    def resize_mask(self, mask, image):
        target_size = image.size
        return cv.resize(mask, target_size, interpolation=cv.INTER_NEAREST)

    @abstractmethod
    def initialize_model(self):
        """Initialize the specific model. Must be implemented by subclasses."""
        pass

    def infer(self, image, ckpt_path=None):
        if ckpt_path is not None:
            self.ckpt_path = ckpt_path
            print(f'Using checkpoint path: {self.ckpt_path}')
        else:
            print('No checkpoint path provided, using default.')

        images = [image]
        dataset = PredictDataset(images=images)

        predictions = self.engine.predict(
            model=self.model,
            dataset=dataset,
            ckpt_path=self.ckpt_path,
        )

        results = []
        if predictions is not None:
            for prediction in predictions:
                pred_mask_dense = prediction.pred_mask.to_dense()
                pred_mask_binary = pred_mask_dense.to(torch.uint8).squeeze(0)
                pred_mask_numpy = pred_mask_binary.cpu().numpy()
                resized_mask = self.resize_mask(pred_mask_numpy, image)

                contours, _ = cv.findContours(resized_mask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

                for contour in contours:
                    contour = np.flip(contour, axis=1)
                    if len(contour) < 3:
                        continue

                    x_min = max(0, int(np.min(contour[:, :, 0])))
                    x_max = max(0, int(np.max(contour[:, :, 0])))
                    y_min = max(0, int(np.min(contour[:, :, 1])))
                    y_max = max(0, int(np.max(contour[:, :, 1])))

                    box = (x_min, y_min, x_max, y_max)
                    cvat_mask = self.to_cvat_mask(box, resized_mask)

                    results.append({
                        "confidence": None,
                        "label": "anomaly",
                        "points": contour.ravel().tolist(),
                        "mask": cvat_mask,
                        "type": "mask",
                    })

        return results

    def to_cvat_mask(self, box, mask):
        xtl, ytl, xbr, ybr = box
        flattened = mask[ytl:ybr + 1, xtl:xbr + 1].flat[:].tolist()
        flattened.extend([xtl, ytl, xbr, ybr])
        return flattened


# def load_yaml_config(config_path: str) -> dict:
#     """Load configuration from YAML file.

#     Args:
#         config_path: Path to the YAML configuration file.

#     Returns:
#         Dictionary containing the configuration.
#     """
#     with open(config_path, 'r') as file:
#         config = yaml.safe_load(file)
#     return config

# def instantiate_class_from_config(class_config: dict) -> Any:
#     """Instantiate a class from its configuration.

#     Args:
#         class_config: Configuration dictionary with 'class_path' and 'init_args' keys.

#     Returns:
#         Instantiated class object.
#     """
#     class_path = class_config['class_path']
#     init_args = class_config.get('init_args', {})

#     # Split module and class name
#     module_path, class_name = class_path.rsplit('.', 1)

#     # Import the module and get the class
#     module = importlib.import_module(module_path)
#     cls = getattr(module, class_name)

#     # Instantiate the class with init_args
#     return cls(**init_args)


# Example subclasses for specific models
class CfaModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Cfa
        self.model = Cfa()
        self.ckpt_path = "cfa/model.ckpt"

class CflowModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Cflow
        self.model = Cflow()
        self.ckpt_path = "cflow/model.ckpt"

class CsflowModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Csflow
        self.model = Csflow()
        self.ckpt_path = "csflow/model.ckpt"

class PatchcoreModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Patchcore
        self.model = Patchcore()
        self.ckpt_path = "patchcore/model.ckpt"

class UflowModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Uflow
        self.model = Uflow()
        self.ckpt_path = "uflow/model.ckpt"

class DraemModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Draem
        self.model = Draem()
        self.ckpt_path = "draem/model.ckpt"

class DsrModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Dsr
        self.model = Dsr()
        self.ckpt_path = "dsr/model.ckpt"

class EfficientAdModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import EfficientAd
        self.model = EfficientAd()
        self.ckpt_path = "efficient_ad/model.ckpt"

class FastflowModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Fastflow
        self.model = Fastflow()
        self.ckpt_path = "fastflow/model.ckpt"

class FreModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Fre
        self.model = Fre()
        self.ckpt_path = "fre/model.ckpt"

class PadimModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Padim
        self.model = Padim()
        self.ckpt_path = "padim/model.ckpt"

class ReverseDistillationModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import ReverseDistillation
        self.model = ReverseDistillation()
        self.ckpt_path = "reverse_distillation/model.ckpt"

class StfpmModelHandler(BaseModelHandler):
    def initialize_model(self):
        from anomalib.models import Stfpm
        self.model = Stfpm()
        self.ckpt_path = "stfpm/model.ckpt"