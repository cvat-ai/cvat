// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Ray } from 'three';

export interface CameraCalibration {
    intrinsicMatrix: number[][];
    extrinsicMatrix: number[][];
}

export function hasCalibration(calibration: Partial<CameraCalibration>): calibration is CameraCalibration {
    return !!calibration.intrinsicMatrix && !!calibration.extrinsicMatrix;
}

export type CameraRay = Ray;
