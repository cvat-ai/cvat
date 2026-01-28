// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedJobValidationLayout, SerializedTaskValidationLayout } from 'server-response-types';
import PluginRegistry from './plugins';

export class JobValidationLayout {
    #honeypotCount: JobValidationLayout['honeypotCount'];
    #honeypotFrames: JobValidationLayout['honeypotFrames'];
    #honeypotRealFrames: JobValidationLayout['honeypotRealFrames'];

    public constructor(data: SerializedJobValidationLayout) {
        this.#honeypotCount = data.honeypot_count ?? 0;
        this.#honeypotFrames = [...(data.honeypot_frames ?? [])];
        this.#honeypotRealFrames = [...(data.honeypot_real_frames ?? [])];
    }

    public get honeypotCount(): number {
        return this.#honeypotCount;
    }

    public get honeypotFrames(): number[] {
        return [...this.#honeypotFrames];
    }

    public get honeypotRealFrames(): number[] {
        return [...this.#honeypotRealFrames];
    }

    async getRealFrame(frame: number): Promise<number | null> {
        const result = await PluginRegistry.apiWrapper.call(this, JobValidationLayout.prototype.getRealFrame, frame);
        return result;
    }
}

Object.defineProperties(JobValidationLayout.prototype.getRealFrame, {
    implementation: {
        writable: false,
        enumerable: false,
        value: function implementation(this: JobValidationLayout, frame: number): number | null {
            const index = this.honeypotFrames.indexOf(frame);
            if (index !== -1) {
                return this.honeypotRealFrames[index];
            }

            return null;
        },
    },
});

export class TaskValidationLayout extends JobValidationLayout {
    #mode: TaskValidationLayout['mode'];
    #validationFrames: TaskValidationLayout['validationFrames'];
    #disabledFrames: TaskValidationLayout['disabledFrames'];

    public constructor(data: SerializedTaskValidationLayout) {
        super(data);
        this.#mode = data.mode;
        this.#validationFrames = [...(data.validation_frames ?? [])];
        this.#disabledFrames = [...(data.disabled_frames ?? [])];
    }

    public get mode(): NonNullable<SerializedTaskValidationLayout['mode']> {
        return this.#mode;
    }

    public get validationFrames(): number[] {
        return [...this.#validationFrames];
    }

    public get disabledFrames(): number[] {
        return [...this.#disabledFrames];
    }
}
