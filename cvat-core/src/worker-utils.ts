// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

import { createOpenCVInterface } from './opencv/opencv-interface';
import type { OpenCVInterface } from './opencv/opencv-interface';

export function initializeOpenCVInWorker(opencvPath: string): Promise<OpenCVInterface> {
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
            (self as any).importScripts(opencvPath);
        } catch (error: unknown) {
            delete (self as any).Module;
            reject(error);
        }
    });
}
