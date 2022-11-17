// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ModelType } from './enums';

interface ModelAttribute {
    name: string;
    values: string[];
    input_type: 'select' | 'number' | 'checkbox' | 'radio' | 'text';
}

interface ModelParams {
    canvas: {
        minPosVertices?: number;
        minNegVertices?: number;
        startWithBox?: boolean;
        onChangeToolsBlockerState?: (event: string) => void;
    };
}

interface ModelTip {
    message: string;
    gif: string;
}

interface SerializedModel {
    id: string;
    name: string;
    labels: string[];
    version: number;
    attributes: Record<string, ModelAttribute>;
    framework: string;
    description: string;
    type: ModelType;
    help_message?: string;
    animated_gif?: string;
    min_pos_points?: number;
    min_neg_points?: number;
    startswith_box?: boolean;
}

export default class MLModel {
    private serialized: SerializedModel;
    private changeToolsBlockerStateCallback?: (event: string) => void;

    constructor(serialized: SerializedModel) {
        this.serialized = { ...serialized };
    }

    public get id(): string {
        return this.serialized.id;
    }

    public get name(): string {
        return this.serialized.name;
    }

    public get labels(): string[] {
        return Array.isArray(this.serialized.labels) ? [...this.serialized.labels] : [];
    }

    public get version(): number {
        return this.serialized.version;
    }

    public get attributes(): Record<string, ModelAttribute> {
        return this.serialized.attributes || {};
    }

    public get framework(): string {
        return this.serialized.framework;
    }

    public get description(): string {
        return this.serialized.description;
    }

    public get type(): ModelType {
        return this.serialized.type;
    }

    public get params(): ModelParams {
        const result: ModelParams = {
            canvas: {
                minPosVertices: this.serialized.min_pos_points,
                minNegVertices: this.serialized.min_neg_points,
                startWithBox: this.serialized.startswith_box,
            },
        };

        if (this.changeToolsBlockerStateCallback) {
            result.canvas.onChangeToolsBlockerState = this.changeToolsBlockerStateCallback;
        }

        return result;
    }

    public get tip(): ModelTip {
        return {
            message: this.serialized.help_message,
            gif: this.serialized.animated_gif,
        };
    }

    // Used to set a callback when the tool is blocked in UI
    public set onChangeToolsBlockerState(onChangeToolsBlockerState: (event: string) => void) {
        this.changeToolsBlockerStateCallback = onChangeToolsBlockerState;
    }
}
