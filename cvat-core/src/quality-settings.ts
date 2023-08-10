// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Camelized } from 'type-utils';
import { ApiCommonFilterParams, SerializedQualitySettingsData } from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

export default class QualitySettings {
    #id: QualitySettings['id'];;
    #task_id: QualitySettings['task'];
    #project_id: QualitySettings['project'];
    #iouThreshold: QualitySettings['iouThreshold'];
    #oksSigma: QualitySettings['oksSigma'];
    #lineThickness: QualitySettings['lineThickness'];
    #lowOverlapThreshold: QualitySettings['lowOverlapThreshold'];
    #orientedLines: QualitySettings['orientedLines'];
    #lineOrientationThreshold: QualitySettings['lineOrientationThreshold'];
    #compareGroups: QualitySettings['compareGroups'];
    #groupMatchThreshold: QualitySettings['groupMatchThreshold'];
    #checkCoveredAnnotations: QualitySettings['checkCoveredAnnotations'];
    #objectVisibilityThreshold: QualitySettings['objectVisibilityThreshold'];
    #panopticComparison: QualitySettings['panopticComparison'];
    #compareAttributes: QualitySettings['compareAttributes'];

    constructor(initialData: SerializedQualitySettingsData) {
        this.#id = initialData.id;
        this.#task_id = initialData.task_id || null;
        this.#project_id = initialData.project_id || null;
        this.#iouThreshold = initialData.iou_threshold;
        this.#oksSigma = initialData.oks_sigma;
        this.#lineThickness = initialData.line_thickness;
        this.#lowOverlapThreshold = initialData.low_overlap_threshold;
        this.#orientedLines = initialData.compare_line_orientation;
        this.#lineOrientationThreshold = initialData.line_orientation_threshold;
        this.#compareGroups = initialData.compare_groups;
        this.#groupMatchThreshold = initialData.group_match_threshold;
        this.#checkCoveredAnnotations = initialData.check_covered_annotations;
        this.#objectVisibilityThreshold = initialData.object_visibility_threshold;
        this.#panopticComparison = initialData.panoptic_comparison;
        this.#compareAttributes = initialData.compare_attributes;
    }

    get id(): number | undefined {
        return this.#id;
    }

    get task(): number | null {
        return this.#task_id;
    }

    get project(): number | null {
        return this.#project_id;
    }

    get iouThreshold(): number | undefined {
        return this.#iouThreshold;
    }

    set iouThreshold(newVal: number) {
        this.#iouThreshold = newVal;
    }

    get oksSigma(): number | undefined {
        return this.#oksSigma;
    }

    set oksSigma(newVal: number) {
        this.#oksSigma = newVal;
    }

    get lineThickness(): number | undefined {
        return this.#lineThickness;
    }

    set lineThickness(newVal: number) {
        this.#lineThickness = newVal;
    }

    get lowOverlapThreshold(): number | undefined {
        return this.#lowOverlapThreshold;
    }

    set lowOverlapThreshold(newVal: number) {
        this.#lowOverlapThreshold = newVal;
    }

    get orientedLines(): boolean | undefined {
        return this.#orientedLines;
    }

    set orientedLines(newVal: boolean) {
        this.#orientedLines = newVal;
    }

    get lineOrientationThreshold(): number | undefined {
        return this.#lineOrientationThreshold;
    }

    set lineOrientationThreshold(newVal: number) {
        this.#lineOrientationThreshold = newVal;
    }

    get compareGroups(): boolean | undefined {
        return this.#compareGroups;
    }

    set compareGroups(newVal: boolean) {
        this.#compareGroups = newVal;
    }

    get groupMatchThreshold(): number | undefined {
        return this.#groupMatchThreshold;
    }

    set groupMatchThreshold(newVal: number) {
        this.#groupMatchThreshold = newVal;
    }

    get checkCoveredAnnotations(): boolean | undefined {
        return this.#checkCoveredAnnotations;
    }

    set checkCoveredAnnotations(newVal: boolean) {
        this.#checkCoveredAnnotations = newVal;
    }

    get objectVisibilityThreshold(): number | undefined {
        return this.#objectVisibilityThreshold;
    }

    set objectVisibilityThreshold(newVal: number) {
        this.#objectVisibilityThreshold = newVal;
    }

    get panopticComparison(): boolean | undefined {
        return this.#panopticComparison;
    }

    set panopticComparison(newVal: boolean) {
        this.#panopticComparison = newVal;
    }

    get compareAttributes(): boolean | undefined {
        return this.#compareAttributes;
    }

    set compareAttributes(newVal: boolean) {
        this.#compareAttributes = newVal;
    }

    public toJSON(): SerializedQualitySettingsData {
        const result: SerializedQualitySettingsData = {
            iou_threshold: this.#iouThreshold,
            oks_sigma: this.#oksSigma,
            line_thickness: this.#lineThickness,
            low_overlap_threshold: this.#lowOverlapThreshold,
            compare_line_orientation: this.#orientedLines,
            line_orientation_threshold: this.#lineOrientationThreshold,
            compare_groups: this.#compareGroups,
            group_match_threshold: this.#groupMatchThreshold,
            check_covered_annotations: this.#checkCoveredAnnotations,
            object_visibility_threshold: this.#objectVisibilityThreshold,
            panoptic_comparison: this.#panopticComparison,
            compare_attributes: this.#compareAttributes,
            ...(this.#project_id ? { project_id: this.#project_id } : {}),
            ...(this.#task_id ? { task_id: this.#task_id } : {}),
        };

        return result;
    }

    public async save(): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.save);
        return result;
    }
}

Object.defineProperties(
    QualitySettings.prototype,
    Object.freeze({
        save: Object.freeze({
            writable: false,
            enumerable: false,
            value: async function implementation() {
                let result = null;
                if (Number.isInteger(this.id)) {
                    result = await serverProxy.analytics.quality.settings.update(this.id, this.toJSON());
                } else {
                    result = await serverProxy.analytics.quality.settings.create(this.toJSON());
                }

                return new QualitySettings(result);
            },
        }),
    }),
);

export interface ApiQualitySettingsFilter extends ApiCommonFilterParams {
    task_id?: number;
    project_id?: number;
}

export type QualitySettingsFilter = Camelized<ApiQualitySettingsFilter>;
