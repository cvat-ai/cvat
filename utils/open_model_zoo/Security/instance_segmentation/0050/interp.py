import numpy as np
import cv2


THRESHOLD = 0.5

# See: https://github.com/opencv/open_model_zoo/blob/master/demos/python_demos/instance_segmentation_demo/main.py

def segm_postprocess(box, raw_cls_mask, im_h, im_w):
    # Add zero border to prevent upsampling artifacts on segment borders.
    raw_cls_mask = np.pad(raw_cls_mask, ((1, 1), (1, 1)), 'constant', constant_values=0)
    scale = int(raw_cls_mask.shape[0] / (raw_cls_mask.shape[0] - 2.0))
    w_half = (box[2] - box[0]) * .5
    h_half = (box[3] - box[1]) * .5
    x_c = (box[2] + box[0]) * .5
    y_c = (box[3] + box[1]) * .5
    w_half *= scale
    h_half *= scale
    box_exp = np.zeros(box.shape)
    box_exp[0] = x_c - w_half
    box_exp[2] = x_c + w_half
    box_exp[1] = y_c - h_half
    box_exp[3] = y_c + h_half

    extended_box = box_exp.astype(int)

    w, h = np.maximum(extended_box[2:] - extended_box[:2] + 1, 1)
    x0, y0 = np.clip(extended_box[:2], a_min=0, a_max=[im_w, im_h])
    x1, y1 = np.clip(extended_box[2:] + 1, a_min=0, a_max=[im_w, im_h])

    raw_cls_mask = cv2.resize(raw_cls_mask, (w, h)) > 0.5
    mask = raw_cls_mask.astype(np.uint8)
    # Put an object mask in an image mask.
    im_mask = np.zeros((im_h, im_w), dtype=np.uint8)
    im_mask[y0:y1, x0:x1] = mask[(y0 - extended_box[1]):(y1 - extended_box[1]),
                            (x0 - extended_box[0]):(x1 - extended_box[0])]

    return im_mask


for detection in detections:
    frame_number = detection['frame_id']
    height = detection['frame_height']
    width = detection['frame_width']
    detection = detection['detections']

    blob_height = 480
    blob_width = 480

    scale = min(blob_height / height, blob_width / width)

    boxes = detection['boxes'] / scale
    scores = detection['scores']
    classes = detection['classes'].astype(np.uint32)
    masks = []
    for box, cls, raw_mask in zip(boxes, classes, detection['raw_masks']):
        raw_cls_mask = raw_mask[cls, ...]
        mask = segm_postprocess(box, raw_cls_mask, height, width)
        masks.append(mask)

    # Filter out detections with low confidence.
    detections_filter = scores > THRESHOLD
    scores = scores[detections_filter]
    classes = classes[detections_filter]
    boxes = boxes[detections_filter]
    masks = list(segm for segm, is_valid in zip(masks, detections_filter) if is_valid)
    for mask, label in zip(masks, classes):
        # contours, hierarchy
        contour, _ = cv2.findContours(mask,
                                      cv2.RETR_EXTERNAL,
                                      cv2.CHAIN_APPROX_TC89_KCOS)

        contour = contour[0]
        contour = contour.tolist()
        contour = [x[0] for x in contour]

        results.add_polygon(contour, label, frame_number)
