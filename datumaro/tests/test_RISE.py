from collections import namedtuple
import numpy as np

from unittest import TestCase

from datumaro.components.extractor import Label, Bbox
from datumaro.components.launcher import Launcher
from datumaro.components.algorithms.rise import RISE


class RiseTest(TestCase):
    def test_rise_can_be_applied_to_classification_model(self):
        class TestLauncher(Launcher):
            def __init__(self, class_count, roi, **kwargs):
                self.class_count = class_count
                self.roi = roi

            def launch(self, inputs):
                for inp in inputs:
                    yield self._process(inp)

            def _process(self, image):
                roi = self.roi
                roi_area = (roi[1] - roi[0]) * (roi[3] - roi[2])
                if 0.5 * roi_area < np.sum(image[roi[0]:roi[1], roi[2]:roi[3], 0]):
                    cls = 0
                else:
                    cls = 1

                cls_conf = 0.5
                other_conf = (1.0 - cls_conf) / (self.class_count - 1)

                return [
                    Label(i, attributes={
                        'score': cls_conf if cls == i else other_conf }) \
                    for i in range(self.class_count)
                ]

        roi = [70, 90, 7, 90]
        model = TestLauncher(class_count=3, roi=roi)

        rise = RISE(model, max_samples=(7 * 7) ** 2, mask_width=7, mask_height=7)

        image = np.ones((100, 100, 3))
        heatmaps = next(rise.apply(image))

        self.assertEqual(1, len(heatmaps))

        heatmap = heatmaps[0]
        self.assertEqual(image.shape[:2], heatmap.shape)

        h_sum = np.sum(heatmap)
        h_area = np.prod(heatmap.shape)
        roi_sum = np.sum(heatmap[roi[0]:roi[1], roi[2]:roi[3]])
        roi_area = (roi[1] - roi[0]) * (roi[3] - roi[2])
        roi_den = roi_sum / roi_area
        hrest_den = (h_sum - roi_sum) / (h_area - roi_area)
        self.assertLess(hrest_den, roi_den)

    def test_rise_can_be_applied_to_detection_model(self):
        ROI = namedtuple('ROI',
            ['threshold', 'x', 'y', 'w', 'h', 'label'])

        class TestLauncher(Launcher):
            def __init__(self, rois, class_count, fp_count=4, pixel_jitter=20, **kwargs):
                self.rois = rois
                self.roi_base_sums = [None, ] * len(rois)
                self.class_count = class_count
                self.fp_count = fp_count
                self.pixel_jitter = pixel_jitter

            @staticmethod
            def roi_value(roi, image):
                return np.sum(
                    image[roi.y:roi.y + roi.h, roi.x:roi.x + roi.w, :])

            def launch(self, inputs):
                for inp in inputs:
                    yield self._process(inp)

            def _process(self, image):
                detections = []
                for i, roi in enumerate(self.rois):
                    roi_sum = self.roi_value(roi, image)
                    roi_base_sum = self.roi_base_sums[i]
                    first_run = roi_base_sum is None
                    if first_run:
                        roi_base_sum = roi_sum
                        self.roi_base_sums[i] = roi_base_sum

                    cls_conf = roi_sum / roi_base_sum

                    if roi.threshold < roi_sum / roi_base_sum:
                        cls = roi.label
                        detections.append(
                            Bbox(roi.x, roi.y, roi.w, roi.h,
                                label=cls, attributes={'score': cls_conf})
                        )

                    if first_run:
                        continue
                    for j in range(self.fp_count):
                        if roi.threshold < cls_conf:
                            cls = roi.label
                        else:
                            cls = (i + j) % self.class_count
                        box = [roi.x, roi.y, roi.w, roi.h]
                        offset = (np.random.rand(4) - 0.5) * self.pixel_jitter
                        detections.append(
                            Bbox(*(box + offset),
                                label=cls, attributes={'score': cls_conf})
                        )

                return detections

        rois = [
            ROI(0.3, 10, 40, 30, 10, 0),
            ROI(0.5, 70, 90, 7, 10, 0),
            ROI(0.7, 5, 20, 40, 60, 2),
            ROI(0.9, 30, 20, 10, 40, 1),
        ]
        model = model = TestLauncher(class_count=3, rois=rois)

        rise = RISE(model, max_samples=(7 * 7) ** 2, mask_width=7, mask_height=7)

        image = np.ones((100, 100, 3))
        heatmaps = next(rise.apply(image))
        heatmaps_class_count = len(set([roi.label for roi in rois]))
        self.assertEqual(heatmaps_class_count + len(rois), len(heatmaps))

        # import cv2
        # roi_image = image.copy()
        # for i, roi in enumerate(rois):
        #     cv2.rectangle(roi_image, (roi.x, roi.y), (roi.x + roi.w, roi.y + roi.h), (32 * i) * 3)
        # cv2.imshow('img', roi_image)

        for c in range(heatmaps_class_count):
            class_roi = np.zeros(image.shape[:2])
            for i, roi in enumerate(rois):
                if roi.label != c:
                    continue
                class_roi[roi.y:roi.y + roi.h, roi.x:roi.x + roi.w] \
                    += roi.threshold

            heatmap = heatmaps[c]

            roi_pixels = heatmap[class_roi != 0]
            h_sum = np.sum(roi_pixels)
            h_area = np.sum(roi_pixels != 0)
            h_den = h_sum / h_area

            rest_pixels = heatmap[class_roi == 0]
            r_sum = np.sum(rest_pixels)
            r_area = np.sum(rest_pixels != 0)
            r_den = r_sum / r_area

            # print(r_den, h_den)
            # cv2.imshow('class %s' % c, heatmap)
            self.assertLess(r_den, h_den)

        for i, roi in enumerate(rois):
            heatmap = heatmaps[heatmaps_class_count + i]
            h_sum = np.sum(heatmap)
            h_area = np.prod(heatmap.shape)
            roi_sum = np.sum(heatmap[roi.y:roi.y + roi.h, roi.x:roi.x + roi.w])
            roi_area = roi.h * roi.w
            roi_den = roi_sum / roi_area
            hrest_den = (h_sum - roi_sum) / (h_area - roi_area)
            # print(hrest_den, h_den)
            # cv2.imshow('roi %s' % i, heatmap)
            self.assertLess(hrest_den, roi_den)
        # cv2.waitKey(0)

    @staticmethod
    def DISABLED_test_roi_nms():
        ROI = namedtuple('ROI',
            ['conf', 'x', 'y', 'w', 'h', 'label'])

        class_count = 3
        noisy_count = 3
        rois = [
            ROI(0.3, 10, 40, 30, 10, 0),
            ROI(0.5, 70, 90, 7, 10, 0),
            ROI(0.7, 5, 20, 40, 60, 2),
            ROI(0.9, 30, 20, 10, 40, 1),
        ]
        pixel_jitter = 10

        detections = []
        for i, roi in enumerate(rois):
            detections.append(
                Bbox(roi.x, roi.y, roi.w, roi.h,
                    label=roi.label, attributes={'score': roi.conf})
            )

            for j in range(noisy_count):
                cls_conf = roi.conf * j / noisy_count
                cls = (i + j) % class_count
                box = [roi.x, roi.y, roi.w, roi.h]
                offset = (np.random.rand(4) - 0.5) * pixel_jitter
                detections.append(
                    Bbox(*(box + offset),
                        label=cls, attributes={'score': cls_conf})
                )

        import cv2
        image = np.zeros((100, 100, 3))
        for i, det in enumerate(detections):
            roi = ROI(det.attributes['score'], *det.get_bbox(), det.label)
            p1 = (int(roi.x), int(roi.y))
            p2 = (int(roi.x + roi.w), int(roi.y + roi.h))
            c = (0, 1 * (i % (1 + noisy_count) == 0), 1)
            cv2.rectangle(image, p1, p2, c)
            cv2.putText(image, 'd%s-%s-%.2f' % (i, roi.label, roi.conf),
                p1, cv2.FONT_HERSHEY_SIMPLEX, 0.25, c)
        cv2.imshow('nms_image', image)
        cv2.waitKey(0)

        nms_boxes = RISE.nms(detections, iou_thresh=0.25)
        print(len(detections), len(nms_boxes))

        for i, det in enumerate(nms_boxes):
            roi = ROI(det.attributes['score'], *det.get_bbox(), det.label)
            p1 = (int(roi.x), int(roi.y))
            p2 = (int(roi.x + roi.w), int(roi.y + roi.h))
            c = (0, 1, 0)
            cv2.rectangle(image, p1, p2, c)
            cv2.putText(image, 'p%s-%s-%.2f' % (i, roi.label, roi.conf),
                p1, cv2.FONT_HERSHEY_SIMPLEX, 0.25, c)
        cv2.imshow('nms_image', image)
        cv2.waitKey(0)