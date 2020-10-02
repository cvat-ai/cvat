// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */

type ScissorsState = { };
type ScissorsResult = {
    points: number[];
    state: ScissorsState | null;
};
interface Scissors {
    run(points: number[], image: ImageData, threshold: number, state: ScissorsState | null): Promise<ScissorsResult>;
    params: object;
}

class OpenCVWrapper {
    public constructor() {
        // todo
    }

    public async initialize(onProgress: (percent: number) => void): Promise<void> {
        // temporary stub
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                onProgress(progress);
                if (progress >= 100) {
                    reject(new Error('An error message'));
                    clearInterval(interval);
                    resolve();
                }
            }, 500);
        })
    }

    public initialized(): boolean {
        // todo
        return false;
    }

    public intelligentScissors(): Scissors {
        return {
            run: this.runIntelligentScissors,
            params: {
                shapeType: 'polygon',
                minPosVertices: 1,
            },
        };
    }

    private runIntelligentScissors = async (
        points: number[], image: ImageData, threshold: number, state: ScissorsState | null = null,
    ): Promise<ScissorsResult> => {
        // todo
        return new Promise((resolve, reject) => {
            resolve({
                points: [],
                state: null,
            });
        });
    }
}

export default new OpenCVWrapper();
