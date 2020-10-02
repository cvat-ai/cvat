// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */


type ProgressCallback = (percent: number) => void;
type ScissorsState = { };
type ScissorsResult = {
    points: number[];
    state: ScissorsState | null;
};


class OpenCVWrapper {
    public constructor() {
        // todo
    }

    public async initialize(onProgress: ProgressCallback): Promise<void> {
        // todo
    }

    public initialized(): boolean {
        // todo
        return false;
    }

	public intelligentScissors(points: number[], image: ImageData, state: ScissorsState | null = null): ScissorsResult {
        // todo
        return {
            points: [],
            state: null,
        };
    }
}

export default new OpenCVWrapper();
