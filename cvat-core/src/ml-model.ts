// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import {
    ModelProviders, ModelKind, ModelReturnType,
} from './enums';
import {
    SerializedModel, ModelParams, MLModelTip, MLModelLabel,
} from './core-types';

export default class MLModel {
    private serialized: SerializedModel;
    private changeToolsBlockerStateCallback?: (event: string) => void;

    constructor(serialized: SerializedModel) {
        this.serialized = { ...serialized };
    }

    public get id(): string | number {
        return this.serialized.id;
    }

    public get name(): string {
        return this.serialized.name;
    }

    public get labels(): MLModelLabel[] {
        return Array.isArray(this.serialized.labels_v2) ? [...this.serialized.labels_v2] : [];
    }

    public get version(): number {
        return this.serialized.version;
    }

    public get framework(): string {
        return this.serialized.framework;
    }

    public get description(): string {
        return this.serialized.description;
    }

    public get kind(): ModelKind {
        return this.serialized.kind;
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

    public get tip(): MLModelTip {
        return {
            message: this.serialized.help_message,
            gif: this.serialized.animated_gif,
        };
    }

    public get owner(): string {
        return this.serialized?.owner?.username || '';
    }

    public get provider(): string {
        return this.serialized?.provider || ModelProviders.CVAT;
    }

    public get isDeletable(): boolean {
        return this.provider !== ModelProviders.CVAT;
    }

    public get createdDate(): string | undefined {
        return this.serialized?.created_date;
    }

    public get updatedDate(): string | undefined {
        return this.serialized?.updated_date;
    }

    public get url(): string | undefined {
        return this.serialized?.url;
    }

    public get returnType(): ModelReturnType | undefined {
        return this.serialized?.return_type;
    }

    // Used to set a callback when the tool is blocked in UI
    public set onChangeToolsBlockerState(onChangeToolsBlockerState: (event: string) => void) {
        this.changeToolsBlockerStateCallback = onChangeToolsBlockerState;
    }

    public async preview(): Promise<string> {
        const result = await PluginRegistry.apiWrapper.call(this, MLModel.prototype.preview);
        return result;
    }
}

Object.defineProperties(MLModel.prototype.preview, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<string | null> {
            return null;
        },
    },
});
