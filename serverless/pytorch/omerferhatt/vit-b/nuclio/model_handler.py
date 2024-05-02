from typing import Tuple

import torch
import torchvision as tv
from PIL import Image


class ModelHandler:
    weights = tv.models.ViT_B_16_Weights.DEFAULT
    preprocess = weights.transforms()

    def __init__(self) -> None:
        self.model = tv.models.vit_b_16(weights=self.weights)
        self.model.eval()
        self.device = torch.device("cpu")
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
        self.model = self.model.to(self.device)

    def infer(self, image: Image) -> Tuple[int, str, float]:
        with torch.inference_mode():
            batch = self.preprocess(image).unsqueeze(0).to(self.device)
            prediction = self.model(batch).squeeze(0).softmax(0)
            class_id = prediction.argmax().item()
            score = prediction[class_id].item()
            category_name = self.weights.meta["categories"][class_id]
        return (class_id, category_name, score)
