// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedConsensusSettingsData } from './server-response-types';
import PluginRegistry from './plugins';
import serverProxy from './server-proxy';

export default class ConsensusSettings {
    #id: number;
    #task: number;
    #iouThreshold: number;
    #quorum: number;
    #descriptions: Record<string, string>;

    constructor(initialData: SerializedConsensusSettingsData) {
        this.#id = initialData.id;
        this.#task = initialData.task;
        this.#iouThreshold = initialData.iou_threshold;
        this.#quorum = initialData.quorum;
        this.#descriptions = initialData.descriptions;
    }

    get id(): number {
        return this.#id;
    }

    get task(): number {
        return this.#task;
    }

    get iouThreshold(): number {
        return this.#iouThreshold;
    }

    set iouThreshold(newVal: number) {
        this.#iouThreshold = newVal;
    }

    get quorum(): number {
        return this.#quorum;
    }

    set quorum(newVal: number) {
        this.#quorum = newVal;
    }

    get descriptions(): Record<string, string> {
        const descriptions: Record<string, string> = Object.keys(this.#descriptions).reduce((acc, key) => {
            const camelCaseKey = _.camelCase(key);
            acc[camelCaseKey] = this.#descriptions[key];
            return acc;
        }, {});

        return descriptions;
    }

    public toJSON(): SerializedConsensusSettingsData {
        const result: SerializedConsensusSettingsData = {
            iou_threshold: this.#iouThreshold,
            quorum: this.#quorum,
        };

        return result;
    }

    public async save(): Promise<ConsensusSettings> {
        const result = await PluginRegistry.apiWrapper.call(this, ConsensusSettings.prototype.save);
        return result;
    }
}

Object.defineProperties(ConsensusSettings.prototype.save, {
    implementation: {
        writable: false,
        enumerable: false,
        value: async function implementation() {
            const result = await serverProxy.consensus.settings.update(this.id, this.toJSON());
            return new ConsensusSettings(result);
        },
    },
});
