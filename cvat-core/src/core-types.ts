// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ModelKind, ModelReturnType } from './enums';

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

export interface ModelTip {
    message: string;
    gif: string;
}

export interface SerializedModel {
    id?: string | number;
    name?: string;
    labels?: string[];
    version?: number;
    attributes?: Record<string, ModelAttribute>;
    framework?: string;
    description?: string;
    kind?: ModelKind;
    type?: string;
    return_type?: ModelReturnType;
    owner?: any;
    provider?: string;
    api_key?: string;
    url?: string;
    help_message?: string;
    animated_gif?: string;
    min_pos_points?: number;
    min_neg_points?: number;
    startswith_box?: boolean;
    created_date?: string;
    updated_date?: string;
}
