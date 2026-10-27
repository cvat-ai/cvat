// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

import type { CameraCalibration, CameraRay } from './types';
import { isFiniteMatrix, isFiniteVector } from './utils';

const CAMERA_RAY_EPSILON = 1e-6;

export function cameraRayFromImagePoint(
    calibration: CameraCalibration,
    pixel: [number, number],
): CameraRay | null {
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

export function areCameraRaysEqual(ray1: CameraRay | null, ray2: CameraRay | null): boolean {
    if (ray1 === ray2) {
        return true;
    }

    if (!ray1 || !ray2) {
        return false;
    }

    const epsilonSquared = CAMERA_RAY_EPSILON ** 2;
    return ray1.origin.distanceToSquared(ray2.origin) < epsilonSquared &&
        ray1.direction.distanceToSquared(ray2.direction) < epsilonSquared;
}
