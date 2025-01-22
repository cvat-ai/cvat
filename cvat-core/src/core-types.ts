// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ModelKind, ModelReturnType, RQStatus, ShapeType,
} from './enums';

export interface ModelAttribute {
    name: string;
    values: string[];
    input_type: 'select' | 'number' | 'checkbox' | 'radio' | 'text';
}

export interface ModelParams {
    canvas: {
        minPosVertices?: number;
        minNegVertices?: number;
        startWithBox?: boolean;
        startWithBoxOptional?: boolean;
    };
}

export interface MLModelTip {
    message: string;
    gif: string;
}

export interface MLModelLabel {
    name: string;
    type: ShapeType | 'unknown';
    attributes: ModelAttribute[];
    sublabels?: MLModelLabel[];
    svg?: string,
}

export interface SerializedModel {
    id?: string | number;
    name?: string;
    labels_v2?: MLModelLabel[];
    version?: number;
    description?: string;
    kind?: ModelKind;
    type?: string;
    return_type?: ModelReturnType;
    owner?: any;
    provider?: string;
    url?: string;
    help_message?: string;
    animated_gif?: string;
    min_pos_points?: number;
    min_neg_points?: number;
    startswith_box?: boolean;
    startswith_box_optional?: boolean;
    created_date?: string;
    updated_date?: string;
}

export interface UpdateStatusData {
    status: RQStatus;
    progress: number;
    message: string;
}

export type PaginatedResource<T> = T[] & { count: number };
