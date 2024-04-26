// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ModelKind, ModelReturnType, ShapeType } from './enums';

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
        onChangeToolsBlockerState?: (event: string) => void;
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
    framework?: string;
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
    created_date?: string;
    updated_date?: string;
}

export type PaginatedResource<T> = T[] & { count: number };
