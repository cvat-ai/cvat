// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedValidationLayout } from 'server-response-types';
import PluginRegistry from './plugins';

export default class ValidationLayout {
    #honeypotFrames: number[];
    #honeypotRealFrames: number[];

    public constructor(data: Required<SerializedValidationLayout>) {
        this.#honeypotFrames = [...data.honeypot_frames];
        this.#honeypotRealFrames = [...data.honeypot_real_frames];
    }

    public get honeypotFrames() {
        return [...this.#honeypotFrames];
    }

    public get honeypotRealFrames() {
        return [...this.#honeypotRealFrames];
    }

    async getRealFrame(frame: number): Promise<number | null> {
        const result = await PluginRegistry.apiWrapper.call(this, ValidationLayout.prototype.getRealFrame, frame);
        return result;
    }
}

Object.defineProperties(ValidationLayout.prototype.getRealFrame, {
    implementation: {
        writable: false,
        enumerable: false,
        value: function implementation(this: ValidationLayout, frame: number): number | null {
            const index = this.honeypotFrames.indexOf(frame);
            if (index !== -1) {
                return this.honeypotRealFrames[index];
            }

            return null;
        },
    },
});
