// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { isBrowser, isNode } from 'browser-or-node';
import serverProxy from './server-proxy';
import PluginRegistry from './plugins';
import { ModelProviders, ModelKind, ModelReturnType } from './enums';
import {
    SerializedModel, ModelAttribute, ModelParams, ModelTip,
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

    public get tip(): ModelTip {
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

    public async save(): Promise<MLModel> {
        const result = await PluginRegistry.apiWrapper.call(this, MLModel.prototype.save);
        return result;
    }

    public async delete(): Promise<MLModel> {
        const result = await PluginRegistry.apiWrapper.call(this, MLModel.prototype.delete);
        return result;
    }

    public async getPreview(): Promise<string> {
        const result = await PluginRegistry.apiWrapper.call(this, MLModel.prototype.getPreview);
        return result;
    }
}

Object.defineProperties(MLModel.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<MLModel> {
            const modelData = {
                provider: this.provider,
                url: this.serialized.url,
                api_key: this.serialized.api_key,
            };

            const model = await serverProxy.functions.create(modelData);
            return new MLModel(model);
        },
    },
});

Object.defineProperties(MLModel.prototype.delete, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<void> {
            if (this.isDeletable) {
                await serverProxy.functions.delete(this.id);
            }
        },
    },
});

Object.defineProperties(MLModel.prototype.getPreview, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation(): Promise<string | ArrayBuffer> {
            if (this.provider === ModelProviders.CVAT) {
                return '';
            }
            return new Promise((resolve, reject) => {
                serverProxy.functions
                    .getPreview(this.id)
                    .then((result) => {
                        if (isNode) {
                            resolve(global.Buffer.from(result, 'binary').toString('base64'));
                        } else if (isBrowser) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                resolve(reader.result);
                            };
                            reader.readAsDataURL(result);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        },
    },
});
