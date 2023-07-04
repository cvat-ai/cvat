// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

export interface SerializedQualitySettingsData {
    id?: number;
    task_id?: number;
    project_id?: number;
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
    #id: number;
    #task_id: number | null;
    #project_id: number | null;
    #iouThreshold: number;
    #oksSigma: number;
    #lineThickness: number;
    #lowOverlapThreshold: number;
    #orientedLines: boolean;
    #lineOrientationThreshold: number;
    #compareGroups: boolean;
    #groupMatchThreshold: number;
    #checkCoveredAnnotations: boolean;
    #objectVisibilityThreshold: number;
    #panopticComparison: boolean;
    #compareAttributes: boolean;

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

    get id(): number {
        return this.#id;
    }

    get task(): number {
        return this.#task_id;
    }

    get project(): number {
        return this.#project_id;
    }

    get iouThreshold(): number {
        return this.#iouThreshold;
    }

    set iouThreshold(newVal: number) {
        this.#iouThreshold = newVal;
    }

    get oksSigma(): number {
        return this.#oksSigma;
    }

    set oksSigma(newVal: number) {
        this.#oksSigma = newVal;
    }

    get lineThickness(): number {
        return this.#lineThickness;
    }

    set lineThickness(newVal: number) {
        this.#lineThickness = newVal;
    }

    get lowOverlapThreshold(): number {
        return this.#lowOverlapThreshold;
    }

    set lowOverlapThreshold(newVal: number) {
        this.#lowOverlapThreshold = newVal;
    }

    get orientedLines(): boolean {
        return this.#orientedLines;
    }

    set orientedLines(newVal: boolean) {
        this.#orientedLines = newVal;
    }

    get lineOrientationThreshold(): number {
        return this.#lineOrientationThreshold;
    }

    set lineOrientationThreshold(newVal: number) {
        this.#lineOrientationThreshold = newVal;
    }

    get compareGroups(): boolean {
        return this.#compareGroups;
    }

    set compareGroups(newVal: boolean) {
        this.#compareGroups = newVal;
    }

    get groupMatchThreshold(): number {
        return this.#groupMatchThreshold;
    }

    set groupMatchThreshold(newVal: number) {
        this.#groupMatchThreshold = newVal;
    }

    get checkCoveredAnnotations(): boolean {
        return this.#checkCoveredAnnotations;
    }

    set checkCoveredAnnotations(newVal: boolean) {
        this.#checkCoveredAnnotations = newVal;
    }

    get objectVisibilityThreshold(): number {
        return this.#objectVisibilityThreshold;
    }

    set objectVisibilityThreshold(newVal: number) {
        this.#objectVisibilityThreshold = newVal;
    }

    get panopticComparison(): boolean {
        return this.#panopticComparison;
    }

    set panopticComparison(newVal: boolean) {
        this.#panopticComparison = newVal;
    }

    get compareAttributes(): boolean {
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
            ...(this.#task_id ? {task_id: this.#task_id} : {}),
        };

        return result;
    }

    public async save(): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.save);
        return result;
    }

    public async create(): Promise<QualitySettings> {
        const result = await PluginRegistry.apiWrapper.call(this, QualitySettings.prototype.create);
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
                const result = await serverProxy.analytics.quality.settings.update(this.id, this.toJSON());
                return new QualitySettings(result);
            },
        }),
        create: Object.freeze({
            writable: false,
            enumerable: false,
            value: async function implementation() {
                const result = await serverProxy.analytics.quality.settings.create(this.toJSON());
                return result;
            },
        }),
    }),
);
