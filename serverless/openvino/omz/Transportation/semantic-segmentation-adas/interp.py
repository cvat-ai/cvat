import numpy as np
from skimage.measure import approximate_polygon, find_contours

import cv2


for frame_results in detections:
    frame_height = frame_results['frame_height']
    frame_width = frame_results['frame_width']
    frame_number = frame_results['frame_id']
    detection = frame_results['detections']
    detection = detection[0, 0, :, :]
    width, height = detection.shape

    for i in range(21):
        zero = np.zeros((width,height),dtype=np.uint8)

        f = float(i)
        zero = ((detection == f) * 255).astype(np.float32)
        zero = cv2.resize(zero, dsize=(frame_width, frame_height), interpolation=cv2.INTER_CUBIC)

        contours = find_contours(zero, 0.8)

        for contour in contours:
            contour = np.flip(contour, axis=1)
            contour = approximate_polygon(contour, tolerance=2.5)
            segmentation = contour.tolist()
            if len(segmentation) < 3:
                continue

            results.add_polygon(segmentation, i, frame_number)
