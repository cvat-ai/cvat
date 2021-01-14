// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

export default function waitFor(frequencyHz: number, predicate: CallableFunction): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof predicate !== 'function') {
            reject(new Error(`Predicate must be a function, got ${typeof predicate}`));
        }

        const internalWait = (): void => {
            let result = false;
            try {
                result = predicate();
            } catch (error) {
                reject(error);
            }

            if (result) {
                resolve();
            } else {
                setTimeout(internalWait, 1000 / frequencyHz);
            }
        };

        setTimeout(internalWait);
    });
}
