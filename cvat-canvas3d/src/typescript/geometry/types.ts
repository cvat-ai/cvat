// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { Ray } from 'three';

export interface CameraCalibration {
    intrinsicMatrix: number[][];
    extrinsicMatrix: number[][];
}

export type CameraRay = Ray;
