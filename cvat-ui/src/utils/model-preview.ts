// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    LabelType, MLModel, ModelKind, ShapeType,
} from 'cvat-core-wrapper';

import boundingBoxTrackerPreview from 'assets/models-previews/bounding-box-tracker.webp';
import humanPoseEstimationPreview from 'assets/models-previews/human-pose-estimation.webp';
import imageClassificationPreview from 'assets/models-previews/image-classification.webp';
import instanceSegmentationPreview from 'assets/models-previews/instance-segmentation.webp';
import interactiveSegmentationPreview from 'assets/models-previews/interactive-segmentation.webp';
import maskPolygonTrackerPreview from 'assets/models-previews/mask-polygon-tracker.webp';
import objectDetectionPreview from 'assets/models-previews/object-detection.webp';
import textPromptSegmentationPreview from 'assets/models-previews/text-prompt-segmentation.webp';

export default function resolveModelPreviewFallback(model: MLModel): string | null {
    if (model.kind === ModelKind.INTERACTOR) {
        // TODO: Expose text-prompt support in the model interface. Checking the SAM3 ID is a temporary workaround.
        return model.id === 'pth-facebookresearch-sam3-v2' ?
            textPromptSegmentationPreview : interactiveSegmentationPreview;
    }

    if (model.kind === ModelKind.TRACKER) {
        const supportedShapes = new Set(model.supportedShapeTypes || [ShapeType.RECTANGLE]);
        const tracksSegmentation = supportedShapes.has(ShapeType.MASK) || supportedShapes.has(ShapeType.POLYGON);
        return tracksSegmentation ? maskPolygonTrackerPreview : boundingBoxTrackerPreview;
    }

    if (model.kind === ModelKind.DETECTOR) {
        const labelTypes = new Set(model.labels.map((label) => label.type));
        if (labelTypes.has(LabelType.SKELETON)) {
            return humanPoseEstimationPreview;
        }
        if (labelTypes.has(LabelType.MASK) || labelTypes.has(LabelType.POLYGON)) {
            return instanceSegmentationPreview;
        }
        if (labelTypes.has(LabelType.RECTANGLE)) {
            return objectDetectionPreview;
        }
        if (labelTypes.has(LabelType.TAG)) {
            return imageClassificationPreview;
        }
    }

    return null;
}
