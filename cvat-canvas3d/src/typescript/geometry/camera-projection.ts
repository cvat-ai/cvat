// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

import { isFiniteMatrix, isFiniteVector } from './utils';

export interface CameraCalibration {
    intrinsicMatrix: number[][];
    extrinsicMatrix: number[][];
}

export function hasCalibration(calibration: Partial<CameraCalibration>): calibration is CameraCalibration {
    return !!calibration.intrinsicMatrix && !!calibration.extrinsicMatrix;
}

export function cameraRayFromImagePoint(
    calibration: CameraCalibration,
    pixel: [number, number],
): THREE.Ray | null {
    const { intrinsicMatrix, extrinsicMatrix } = calibration;
    if (
        !Number.isFinite(pixel[0]) ||
        !Number.isFinite(pixel[1]) ||
        !isFiniteMatrix(intrinsicMatrix, 3, 3) ||
        !isFiniteMatrix(extrinsicMatrix, 3, 4)
    ) {
        return null;
    }

    const cameraIntrinsic = new THREE.Matrix3().set(
        ...(intrinsicMatrix.flat() as Parameters<THREE.Matrix3['set']>),
    );
    if (Math.abs(cameraIntrinsic.determinant()) < Number.EPSILON) {
        return null;
    }

    const lidarToCamera = new THREE.Matrix4().set(
        ...([...extrinsicMatrix.flat(), 0, 0, 0, 1] as Parameters<THREE.Matrix4['set']>),
    );
    const cameraToLidar = lidarToCamera.invert();

    const origin = new THREE.Vector3().applyMatrix4(cameraToLidar);
    const direction = new THREE.Vector3(pixel[0], pixel[1], 1)
        .applyMatrix3(cameraIntrinsic.invert())
        .transformDirection(cameraToLidar);

    if (
        !isFiniteVector([origin.x, origin.y, origin.z]) ||
        !isFiniteVector([direction.x, direction.y, direction.z]) ||
        direction.lengthSq() < Number.EPSILON
    ) {
        return null;
    }

    return new THREE.Ray(origin, direction);
}
