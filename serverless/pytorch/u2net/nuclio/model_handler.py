# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from u2net.model import U2NET
from u2net.data_loader import RescaleT
from u2net.data_loader import ToTensorLab
from u2net.data_loader import SalObjDataset

import torch
import cv2 as cv
import numpy as np
import torchvision.transforms as T
from torch.utils.data import DataLoader
from PIL import Image
from skimage import io
from torch.autograd import Variable


import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"


def to_cvat_mask(box: list, mask):
    xtl, ytl, xbr, ybr = box
    flattened = mask[ytl:ybr + 1, xtl:xbr + 1].flat[:].tolist()
    flattened.extend([xtl, ytl, xbr, ybr])
    return flattened

# normalize the predicted SOD probability map
def normPRED(d):
    ma = torch.max(d)
    mi = torch.min(d)

    dn = (d-mi)/(ma-mi)

    return dn


class ModelHandler:
    def __init__(self):
        # Setup device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = U2NET(3,1)
        self.pth_path = "u2net_best_val_model.pth"

    def resize_mask(self, mask, image):
        target_size = image.size
        return cv.resize(mask, target_size, interpolation=cv.INTER_NEAREST)

    def infer(self, image, threshold=0.5):
        
        # Convert PIL Image to numpy array if needed
        if hasattr(image, 'mode'):  # PIL Image
            original_image = np.array(image)
            print("inferencing: PIL Image")
        else:  # Assume it's a file path
            original_image = io.imread(image)
            print("inferencing:", image.split(os.sep)[-1])

        # Apply transforms directly to the image
        transform = T.Compose([RescaleT(320), ToTensorLab(flag=0)])
        
        # Create a sample dict similar to what SalObjDataset would return
        imidx = np.array([0])  # Add the missing imidx
        
        # Create label following the same logic as in SalObjDataset
        label_3 = np.zeros(original_image.shape)  # Create with same shape as image
        label = np.zeros(label_3.shape[0:2])  # Extract 2D shape
        
        # Apply the same dimension handling as in the dataset
        if(3==len(original_image.shape) and 2==len(label.shape)):
            label = label[:,:,np.newaxis]
        elif(2==len(original_image.shape) and 2==len(label.shape)):
            original_image = original_image[:,:,np.newaxis]
            label = label[:,:,np.newaxis]
        
        sample = {'imidx': imidx, 'image': original_image, 'label': label}
        sample = transform(sample)
        
        # Add batch dimension
        inputs_test = sample['image'].unsqueeze(0)
        inputs_test = inputs_test.type(torch.FloatTensor)

        # Load model
        self.model.load_state_dict(torch.load(self.pth_path, map_location=self.device))
        if torch.cuda.is_available():
            self.model.cuda()
            inputs_test = Variable(inputs_test.cuda())
        else:
            inputs_test = Variable(inputs_test)
        
        self.model.eval()

        # Run inference
        d1,d2,d3,d4,d5,d6,d7= self.model(inputs_test)

        # normalization
        pred = d1[:,0,:,:]
        pred = normPRED(pred)

        predict = pred
        predict = predict.squeeze()
        predict_np = predict.cpu().data.numpy()

        # Apply threshold to binarize the mask
        binary_mask = (predict_np > threshold).astype(np.uint8)
        # Convert binary mask to 0-255 range for visualization/processing
        pred_mask = (binary_mask * 255).astype(np.uint8)
        
        # Resize mask to match original image dimensions
        resized_mask = cv.resize(pred_mask, (original_image.shape[1], original_image.shape[0]), interpolation=cv.INTER_NEAREST)

        del d1,d2,d3,d4,d5,d6,d7

        contours, _  = cv.findContours(resized_mask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        results = []
        for contour in contours:
            contour = np.flip(contour, axis=1)
            if len(contour) < 3:
                continue

            x_min = max(0, int(np.min(contour[:,:,0])))
            x_max = max(0, int(np.max(contour[:,:,0])))
            y_min = max(0, int(np.min(contour[:,:,1])))
            y_max = max(0, int(np.max(contour[:,:,1])))

            box = (x_min, y_min, x_max, y_max)

            cvat_mask = to_cvat_mask(box, resized_mask)

            results.append({
                "confidence": None,
                "label": "anomaly",
                "points": contour.ravel().tolist(),
                "mask": cvat_mask,
                "type": "mask",
            })

        print('So far so good! Results obtained.')

        return results
