// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable no-restricted-globals */

import { createOpenCVInterface } from './opencv/opencv-interface';
import type { OpenCVInterface } from './opencv/opencv-interface';

export async function initializeOpenCVInWorker(opencvPath: string): Promise<OpenCVInterface> {
    (self as any).importScripts(opencvPath);
    const cv = await (self as any).cv;
    if (!cv || typeof cv.Mat !== 'function') {
        throw new Error('OpenCV failed to initialize');
    }

    return createOpenCVInterface(cv);
}
