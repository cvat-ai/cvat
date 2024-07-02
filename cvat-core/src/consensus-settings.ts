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
    #agreementScoreThreshold: number;

    constructor(initialData: SerializedConsensusSettingsData) {
        this.#id = initialData.id;
        this.#task = initialData.task;
        this.#iouThreshold = initialData.iou_threshold;
        this.#agreementScoreThreshold = initialData.agreement_score_threshold;
        this.#quorum = initialData.quorum;
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

    get agreementScoreThreshold(): number {
        return this.#agreementScoreThreshold;
    }

    set agreementScoreThreshold(newVal: number) {
        this.#agreementScoreThreshold = newVal;
    }

    public toJSON(): SerializedConsensusSettingsData {
        const result: SerializedConsensusSettingsData = {
            iou_threshold: this.#iouThreshold,
            quorum: this.#quorum,
            agreement_score_threshold: this.#agreementScoreThreshold,
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
