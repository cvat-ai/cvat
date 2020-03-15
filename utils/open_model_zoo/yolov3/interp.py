from math import exp


class Parser:
    IOU_THRESHOLD = 0.4
    PROB_THRESHOLD = 0.5

    def __init__(self):
        self.objects = []

    def scale_bbox(self, x, y, h, w, class_id, confidence, h_scale, w_scale):
        xmin = int((x - w / 2) * w_scale)
        ymin = int((y - h / 2) * h_scale)
        xmax = int(xmin + w * w_scale)
        ymax = int(ymin + h * h_scale)

        return dict(xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax, class_id=class_id, confidence=confidence)

    def entry_index(self, side, coord, classes, location, entry):
        side_power_2 = side ** 2
        n = location // side_power_2
        loc = location % side_power_2
        return int(side_power_2 * (n * (coord + classes + 1) + entry) + loc)

    def intersection_over_union(self, box_1, box_2):
        width_of_overlap_area = min(box_1['xmax'], box_2['xmax']) - max(box_1['xmin'], box_2['xmin'])
        height_of_overlap_area = min(box_1['ymax'], box_2['ymax']) - max(box_1['ymin'], box_2['ymin'])
        if width_of_overlap_area < 0 or height_of_overlap_area < 0:
            area_of_overlap = 0
        else:
            area_of_overlap = width_of_overlap_area * height_of_overlap_area
        box_1_area = (box_1['ymax'] - box_1['ymin']) * (box_1['xmax'] - box_1['xmin'])
        box_2_area = (box_2['ymax'] - box_2['ymin']) * (box_2['xmax'] - box_2['xmin'])
        area_of_union = box_1_area + box_2_area - area_of_overlap
        if area_of_union == 0:
            return 0
        return area_of_overlap / area_of_union


    def sort_objects(self):
        self.objects = sorted(self.objects, key=lambda obj : obj['confidence'], reverse=True)

        for i in range(len(self.objects)):
            if self.objects[i]['confidence'] == 0:
                continue
            for j in range(i + 1, len(self.objects)):
                if self.intersection_over_union(self.objects[i], self.objects[j]) > self.IOU_THRESHOLD:
                    self.objects[j]['confidence'] = 0

    def parse_yolo_region(self, blob: 'np.ndarray', original_shape: list, params: dict) -> list:

        # YOLO magic numbers
        # See: https://github.com/opencv/open_model_zoo/blob/acf297c73db8cb3f68791ae1fad4a7cc4a6039e5/demos/python_demos/object_detection_demo_yolov3_async/object_detection_demo_yolov3_async.py#L61
        num = 3
        coords = 4
        classes = 80
        # -----------------

        _, _, out_blob_h, out_blob_w = blob.shape
        assert out_blob_w == out_blob_h, "Invalid size of output blob. It sould be in NCHW layout and height should " \
                                         "be equal to width. Current height = {}, current width = {}" \
                                         "".format(out_blob_h, out_blob_w)

        # ------ Extracting layer parameters --
        orig_im_h, orig_im_w = original_shape
        predictions = blob.flatten()
        side_square = params['side'] * params['side']

        # ------ Parsing YOLO Region output --
        for i in range(side_square):
            row = i // params['side']
            col = i % params['side']
            for n in range(num):
                # -----entry index calcs------
                obj_index = self.entry_index(params['side'], coords, classes, n * side_square + i, coords)
                scale = predictions[obj_index]
                if scale < self.PROB_THRESHOLD:
                    continue
                box_index = self.entry_index(params['side'], coords, classes, n * side_square + i, 0)

                # Network produces location predictions in absolute coordinates of feature maps.
                # Scale it to relative coordinates.
                x = (col + predictions[box_index + 0 * side_square]) / params['side'] * 416
                y = (row + predictions[box_index + 1 * side_square]) / params['side'] * 416
                # Value for exp is very big number in some cases so following construction is using here
                try:
                    h_exp = exp(predictions[box_index + 3 * side_square])
                    w_exp = exp(predictions[box_index + 2 * side_square])
                except OverflowError:
                    continue

                w = w_exp * params['anchors'][2 * n]
                h = h_exp * params['anchors'][2 * n + 1]

                for j in range(classes):
                    class_index = self.entry_index(params['side'], coords, classes, n * side_square + i,
                                              coords + 1 + j)
                    confidence = scale * predictions[class_index]
                    if confidence < self.PROB_THRESHOLD:
                        continue

                    self.objects.append(self.scale_bbox(x=x,
                                                        y=y,
                                                        h=h,
                                                        w=w,
                                                        class_id=j,
                                                        confidence=confidence,
                                                        h_scale=(orig_im_h/416),
                                                        w_scale=(orig_im_w/416)))


for detection in detections:
    frame_number = detection['frame_id']
    height = detection['frame_height']
    width = detection['frame_width']
    detection = detection['detections']

    original_shape = (height, width)

    # https://github.com/opencv/open_model_zoo/blob/master/demos/python_demos/object_detection_demo_yolov3_async/object_detection_demo_yolov3_async.py#L72
    anchors = [10,13,16,30,33,23,30,61,62,45,59,119,116,90,156,198,373,326]
    conv_6 = {'side': 13, 'mask': [6,7,8]}
    conv_14 = {'side': 26, 'mask': [3,4,5]}
    conv_22 = {'side': 52, 'mask': [0,1,2]}

    yolo_params = {'detector/yolo-v3/Conv_6/BiasAdd/YoloRegion': conv_6,
                   'detector/yolo-v3/Conv_14/BiasAdd/YoloRegion': conv_14,
                   'detector/yolo-v3/Conv_22/BiasAdd/YoloRegion': conv_22}

    for conv_net in yolo_params.values():
        mask = conv_net['mask']
        masked_anchors = []
        for idx in mask:
            masked_anchors += [anchors[idx * 2], anchors[idx * 2 + 1]]

        conv_net['anchors'] = masked_anchors

    parser = Parser()

    for name, blob in detection.items():
        parser.parse_yolo_region(blob, original_shape, yolo_params[name])

    parser.sort_objects()

    objects = []
    for obj in parser.objects:
        if obj['confidence'] >= parser.PROB_THRESHOLD:
            label = obj['class_id']
            xmin = obj['xmin']
            xmax = obj['xmax']
            ymin = obj['ymin']
            ymax = obj['ymax']

            # Enforcing extra checks for bounding box coordinates
            xmin = max(0,xmin)
            ymin = max(0,ymin)
            xmax = min(xmax,width)
            ymax = min(ymax,height)

            results.add_box(xmin, ymin, xmax, ymax, label, frame_number)
