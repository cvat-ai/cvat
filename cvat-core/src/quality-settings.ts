// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

export interface SerializedQualitySettingsData {
    id?: number;
    task?: number;
    iou_threshold?: number;
    oks_sigma?: number;
    line_thickness?: number;
    low_overlap_threshold?: number;
    compare_line_orientation?: boolean;
    line_orientation_threshold?: number;
    compare_groups?: boolean;
    group_match_threshold?: number;
    check_covered_annotations?: boolean;
    object_visibility_threshold?: number;
    panoptic_comparison?: boolean;
    compare_attributes?: boolean;
}

export default class QualitySettings {
    public readonly id: number;
    public readonly task: number;
    public iouThreshold: number;
    public oksSigma: number;
    public lineThickness: number;
    public lowOverlapThreshold: number;
    public orientedLines: boolean;
    public lineOrientationThreshold: number;
    public compareGroups: boolean;
    public groupMatchThreshold: number;
    public checkCoveredAnnotations: boolean;
    public objectVisibilityThreshold: number;
    public panopticComparison: boolean;
    public compareAttributes: boolean;

    constructor(initialData: SerializedQualitySettingsData) {
        const data: SerializedQualitySettingsData = {
            id: undefined,
            task: undefined,
            iou_threshold: undefined,
            oks_sigma: undefined,
            line_thickness: undefined,
            low_overlap_threshold: undefined,
            compare_line_orientation: undefined,
            line_orientation_threshold: undefined,
            compare_groups: undefined,
            group_match_threshold: undefined,
            check_covered_annotations: undefined,
            object_visibility_threshold: undefined,
            panoptic_comparison: undefined,
            compare_attributes: undefined,
        };

        for (const property in data) {
            if (Object.prototype.hasOwnProperty.call(data, property) && property in initialData) {
                data[property] = initialData[property];
            }
        }

        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    get: () => data.id,
                },
                task: {
                    get: () => data.task,
                },
                iouThreshold: {
                    get: () => data.iou_threshold,
                    set: (value: number) => {
                        data.iou_threshold = value;
                    },
                },
                oksSigma: {
                    get: () => data.oks_sigma,
                    set: (value: number) => {
                        data.oks_sigma = value;
                    },
                },
                lineThickness: {
                    get: () => data.line_thickness,
                    set: (value: number) => {
                        data.line_thickness = value;
                    },
                },
                lowOverlapThreshold: {
                    get: () => data.low_overlap_threshold,
                    set: (value: number) => {
                        data.low_overlap_threshold = value;
                    },
                },
                orientedLines: {
                    get: () => data.compare_line_orientation,
                    set: (value: boolean) => {
                        data.compare_line_orientation = value;
                    },
                },
                lineOrientationThreshold: {
                    get: () => data.line_orientation_threshold,
                    set: (value: number) => {
                        data.line_orientation_threshold = value;
                    },
                },
                compareGroups: {
                    get: () => data.compare_groups,
                    set: (value: boolean) => {
                        data.compare_groups = value;
                    },
                },
                groupMatchThreshold: {
                    get: () => data.group_match_threshold,
                    set: (value: number) => {
                        data.group_match_threshold = value;
                    },
                },
                checkCoveredAnnotations: {
                    get: () => data.check_covered_annotations,
                    set: (value: boolean) => {
                        data.check_covered_annotations = value;
                    },
                },
                objectVisibilityThreshold: {
                    get: () => data.object_visibility_threshold,
                    set: (value: number) => {
                        data.object_visibility_threshold = value;
                    },
                },
                panopticComparison: {
                    get: () => data.panoptic_comparison,
                    set: (value: boolean) => {
                        data.panoptic_comparison = value;
                    },
                },
                compareAttributes: {
                    get: () => data.compare_attributes,
                    set: (value: boolean) => {
                        data.compare_attributes = value;
                    },
                },
            }),
        );
    }

    public toJSON(): SerializedQualitySettingsData {
        const result: SerializedQualitySettingsData = {
            iou_threshold: this.iouThreshold,
            oks_sigma: this.oksSigma,
            line_thickness: this.lineThickness,
            low_overlap_threshold: this.lowOverlapThreshold,
            compare_line_orientation: this.orientedLines,
            line_orientation_threshold: this.lineOrientationThreshold,
            compare_groups: this.compareGroups,
            group_match_threshold: this.groupMatchThreshold,
            check_covered_annotations: this.checkCoveredAnnotations,
            object_visibility_threshold: this.objectVisibilityThreshold,
            panoptic_comparison: this.panopticComparison,
            compare_attributes: this.compareAttributes,
        };

        return result;
    }

    public async save(): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.save);
        return result;
    }
}

Object.defineProperties(QualitySettings.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            const result = await serverProxy.analytics.quality.settings.update(this.id, this.toJSON());
            return new QualitySettings(result);
        },
    },
});
