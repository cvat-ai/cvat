
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import os
import os.path as osp

from datumaro.components.project import Project
from datumaro.util.command_targets import (TargetKinds, target_selector,
    ProjectTarget, SourceTarget, ImageTarget, is_project_path)
from datumaro.util.image import load_image, save_image
from ..util import MultilineFormatter
from ..util.project import load_project


def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor(help="Run Explainable AI algorithm",
        description="Runs an explainable AI algorithm for a model.")

    parser.add_argument('-m', '--model', required=True,
        help="Model to use for inference")
    parser.add_argument('-t', '--target', default=None,
        help="Inference target - image, source, project "
             "(default: current dir)")
    parser.add_argument('-o', '--output-dir', dest='save_dir', default=None,
        help="Directory to save output (default: display only)")

    method_sp = parser.add_subparsers(dest='algorithm')

    rise_parser = method_sp.add_parser('rise',
        description="""
        RISE: Randomized Input Sampling for
        Explanation of Black-box Models algorithm|n
        |n
        See explanations at: https://arxiv.org/pdf/1806.07421.pdf
        """,
        formatter_class=MultilineFormatter)
    rise_parser.add_argument('-s', '--max-samples', default=None, type=int,
        help="Number of algorithm iterations (default: mask size ^ 2)")
    rise_parser.add_argument('--mw', '--mask-width',
        dest='mask_width', default=7, type=int,
        help="Mask width (default: %(default)s)")
    rise_parser.add_argument('--mh', '--mask-height',
        dest='mask_height', default=7, type=int,
        help="Mask height (default: %(default)s)")
    rise_parser.add_argument('--prob', default=0.5, type=float,
        help="Mask pixel inclusion probability (default: %(default)s)")
    rise_parser.add_argument('--iou', '--iou-thresh',
        dest='iou_thresh', default=0.9, type=float,
        help="IoU match threshold for detections (default: %(default)s)")
    rise_parser.add_argument('--nms', '--nms-iou-thresh',
        dest='nms_iou_thresh', default=0.0, type=float,
        help="IoU match threshold in Non-maxima suppression (default: no NMS)")
    rise_parser.add_argument('--conf', '--det-conf-thresh',
        dest='det_conf_thresh', default=0.0, type=float,
        help="Confidence threshold for detections (default: include all)")
    rise_parser.add_argument('-b', '--batch-size', default=1, type=int,
        help="Inference batch size (default: %(default)s)")
    rise_parser.add_argument('--progressive', action='store_true',
        help="Visualize results during computations")

    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=explain_command)

    return parser

def explain_command(args):
    project_path = args.project_dir
    if is_project_path(project_path):
        project = Project.load(project_path)
    else:
        project = None
    args.target = target_selector(
        ProjectTarget(is_default=True, project=project),
        SourceTarget(project=project),
        ImageTarget()
    )(args.target)
    if args.target[0] == TargetKinds.project:
        if is_project_path(args.target[1]):
            args.project_dir = osp.dirname(osp.abspath(args.target[1]))


    import cv2
    from matplotlib import cm

    project = load_project(args.project_dir)

    model = project.make_executable_model(args.model)

    if str(args.algorithm).lower() != 'rise':
        raise NotImplementedError()

    from datumaro.components.algorithms.rise import RISE
    rise = RISE(model,
        max_samples=args.max_samples,
        mask_width=args.mask_width,
        mask_height=args.mask_height,
        prob=args.prob,
        iou_thresh=args.iou_thresh,
        nms_thresh=args.nms_iou_thresh,
        det_conf_thresh=args.det_conf_thresh,
        batch_size=args.batch_size)

    if args.target[0] == TargetKinds.image:
        image_path = args.target[1]
        image = load_image(image_path)
        if model.preferred_input_size() is not None:
            h, w = model.preferred_input_size()
            image = cv2.resize(image, (w, h))

        log.info("Running inference explanation for '%s'" % image_path)
        heatmap_iter = rise.apply(image, progressive=args.progressive)

        image = image / 255.0
        file_name = osp.splitext(osp.basename(image_path))[0]
        if args.progressive:
            for i, heatmaps in enumerate(heatmap_iter):
                for j, heatmap in enumerate(heatmaps):
                    hm_painted = cm.jet(heatmap)[:, :, 2::-1]
                    disp = (image + hm_painted) / 2
                    cv2.imshow('heatmap-%s' % j, hm_painted)
                    cv2.imshow(file_name + '-heatmap-%s' % j, disp)
                cv2.waitKey(10)
                print("Iter", i, "of", args.max_samples, end='\r')
        else:
            heatmaps = next(heatmap_iter)

        if args.save_dir is not None:
            log.info("Saving inference heatmaps at '%s'" % args.save_dir)
            os.makedirs(args.save_dir, exist_ok=True)

            for j, heatmap in enumerate(heatmaps):
                save_path = osp.join(args.save_dir,
                    file_name + '-heatmap-%s.png' % j)
                save_image(save_path, heatmap * 255.0)
        else:
            for j, heatmap in enumerate(heatmaps):
                disp = (image + cm.jet(heatmap)[:, :, 2::-1]) / 2
                cv2.imshow(file_name + '-heatmap-%s' % j, disp)
            cv2.waitKey(0)
    elif args.target[0] == TargetKinds.source or \
         args.target[0] == TargetKinds.project:
        if args.target[0] == TargetKinds.source:
            source_name = args.target[1]
            dataset = project.make_source_project(source_name).make_dataset()
            log.info("Running inference explanation for '%s'" % source_name)
        else:
            project_name = project.config.project_name
            dataset = project.make_dataset()
            log.info("Running inference explanation for '%s'" % project_name)

        for item in dataset:
            image = item.image
            if image is None:
                log.warn(
                    "Dataset item %s does not have image data. Skipping." % \
                    (item.id))
                continue

            if model.preferred_input_size() is not None:
                h, w = model.preferred_input_size()
                image = cv2.resize(image, (w, h))
            heatmap_iter = rise.apply(image)

            image = image / 255.0
            file_name = osp.splitext(osp.basename(image_path))[0]
            heatmaps = next(heatmap_iter)

            if args.save_dir is not None:
                log.info("Saving inference heatmaps at '%s'" % args.save_dir)
                os.makedirs(args.save_dir, exist_ok=True)

                for j, heatmap in enumerate(heatmaps):
                    save_path = osp.join(args.save_dir,
                        file_name + '-heatmap-%s.png' % j)
                    save_image(save_path, heatmap * 255.0)

            if args.progressive:
                for j, heatmap in enumerate(heatmaps):
                    disp = (image + cm.jet(heatmap)[:, :, 2::-1]) / 2
                    cv2.imshow(file_name + '-heatmap-%s' % j, disp)
                cv2.waitKey(0)
    else:
        raise NotImplementedError()

    return 0
