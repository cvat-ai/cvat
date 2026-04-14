// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

import { createOpenCVInterface } from './opencv/opencv-interface';
import type { OpenCVInterface } from './opencv/opencv-interface';

export function initializeOpenCVInWorker(): Promise<OpenCVInterface> {
    return new Promise((resolve, reject) => {
        (self as any).Module = {
            onRuntimeInitialized: () => {
                const { cv } = self as any;
                if (!cv) {
                    reject(new Error('OpenCV failed to initialize'));
                    return;
                }

                const cvInterface = createOpenCVInterface(cv);
                delete (self as any).Module;
                resolve(cvInterface);
            },
        };

        try {
            // OPENCV_PATH should be set in the global scope before calling this function
            (self as any).importScripts((self as any).OPENCV_PATH);
        } catch (error: unknown) {
            delete (self as any).Module;
            reject(error);
        }
    });
}
