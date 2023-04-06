import numpy as np
import cv2
import torch
from segment_anything import sam_model_registry, SamPredictor


def convert_mask_to_polygon(mask):
    contours = None
    if int(cv2.__version__.split('.')[0]) > 3:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0]
    else:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[1]

    contours = max(contours, key=lambda arr: arr.size)
    if contours.shape.count(1):
        contours = np.squeeze(contours)
    if contours.size < 3 * 2:
        raise Exception('Less then three point have been detected. Can not build a polygon.')

    polygon = []
    for point in contours:
        polygon.append([int(point[0]), int(point[1])])

    return polygon

class ModelHandler:
    def __init__(self):
        sam_weights = "/opt/nuclio/sam/sam_vit_h_4b8939.pth"
        device = "cuda"
        model_type = "default"
        sam_model = sam_model_registry[model_type](checkpoint=sam_weights)
        sam_model.to(device=device)
        self.predictor = SamPredictor

    def handle(self, image, pos_points, neg_points):
        self.predictor.set_image(image)
        # we assume that pos_points and neg_points are of type:
        # np.array[[x, y], [x, y], ...]
        pos_points = np.array(pos_points)
        neg_points = np.array(neg_points)
        assert type(pos_points) == np.ndarray, f"found {type(pos_points)}"
        assert type(neg_points) == np.ndarray, f"found {type(neg_points)}"
        # the pos_points get label 1, the neg_points get label 0. Labels in input_labels must be in same order as points in input_points

        input_points = np.concatenate([pos_points, neg_points], axis=0)
        input_labels = np.concatenate([np.array([1]*len(pos_points)), np.array([0]*len(neg_points))])
        masks, _, _ = self.predictor.predict(point_coords=input_points, point_labels=input_labels, multimask_output=False)
        polygon = convert_mask_to_polygon(masks)
        return masks, polygon



        # with torch.no_grad():
        #     # Create IOG image
        #     pos_gt = np.zeros(shape=input_crop.shape[:2], dtype=np.float64)
        #     neg_gt = np.zeros(shape=input_crop.shape[:2], dtype=np.float64)
        #     for p in pos_points:
        #         pos_gt = np.maximum(pos_gt, helpers.make_gaussian(pos_gt.shape, center=p))
        #     for p in neg_points:
        #         neg_gt = np.maximum(neg_gt, helpers.make_gaussian(neg_gt.shape, center=p))
        #     iog_image = np.stack((pos_gt, neg_gt), axis=2).astype(dtype=input_crop.dtype)

        #     # Convert iog_image to an image (0-255 values)
        #     cv2.normalize(iog_image, iog_image, 0, 255, cv2.NORM_MINMAX)

        #     # Concatenate input crop and IOG image
        #     input_blob = np.concatenate((input_crop, iog_image), axis=2)

        #     # numpy image: H x W x C
        #     # torch image: C X H X W
        #     input_blob = input_blob.transpose((2, 0, 1))
        #     # batch size is 1
        #     input_blob = np.array([input_blob])
        #     input_tensor = torch.from_numpy(input_blob)

        #     input_tensor = input_tensor.to(self.device)
        #     output_mask = self.net.forward(input_tensor)[4]
        #     output_mask = output_mask.to(self.device)
        #     pred = np.transpose(output_mask.data.numpy()[0, :, :, :], (1, 2, 0))
        #     pred = pred > threshold
        #     pred = np.squeeze(pred)

        #     # Convert a mask to a polygon
        #     pred = np.array(pred, dtype=np.uint8)
        #     pred = cv2.resize(pred, dsize=(crop_shape[0], crop_shape[1]),
        #         interpolation=cv2.INTER_CUBIC)
        #     cv2.normalize(pred, pred, 0, 255, cv2.NORM_MINMAX)

        #     mask = np.zeros((image.height, image.width), dtype=np.uint8)
        #     x = int(crop_bbox[0])
        #     y = int(crop_bbox[1])
        #     mask[y : y + crop_shape[1], x : x + crop_shape[0]] = pred

        #     polygon = convert_mask_to_polygon(mask)

        #     return mask, polygon
