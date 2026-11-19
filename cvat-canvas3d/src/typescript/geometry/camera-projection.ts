// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

import { isFiniteMatrixOfShape, isFiniteVector } from './utils';

export interface CameraCalibration {
    intrinsicMatrix: number[][];
    extrinsicMatrix: number[][];
}

// 8 projected cuboid corner points, each represented as an `[x, y]` image-coordinate pair.
export type ProjectedCuboid = [number, number][];

export function cameraRayFromImagePoint(
    calibration: CameraCalibration,
    pixel: [number, number],
): THREE.Ray | null {
    const { intrinsicMatrix, extrinsicMatrix } = calibration;
    if (
        !Number.isFinite(pixel[0]) ||
        !Number.isFinite(pixel[1]) ||
        !isFiniteMatrixOfShape(intrinsicMatrix, 3, 3) ||
        !isFiniteMatrixOfShape(extrinsicMatrix, 3, 4)
    ) {
        return null;
    }

    const cameraIntrinsic = new THREE.Matrix3().set(
        ...(intrinsicMatrix.flat() as Parameters<THREE.Matrix3['set']>),
    );
    if (Math.abs(cameraIntrinsic.determinant()) < Number.EPSILON) {
        // Singular intrinsic matrix, cannot be inverted to compute ray
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

/**
 * Projects a 3D cuboid onto a calibrated image plane.
 *
 * @param calibration - Camera intrinsic and LiDAR-to-camera extrinsic matrices.
 * @param cuboidPoints - Cuboid points whose first nine values must be
 * `[x, y, z, rotationX, rotationY, rotationZ, width, height, depth]`.
 * Additional values are ignored.
 * @returns The projected cuboid corners, or `null` when the input is invalid or behind the camera.
 */
export function projectCuboid(
    calibration: CameraCalibration,
    cuboidPoints: number[],
): ProjectedCuboid | null {
    const { intrinsicMatrix, extrinsicMatrix } = calibration;
    if (
        cuboidPoints.length < 9 ||
        !isFiniteVector(cuboidPoints.slice(0, 9))
    ) {
        return null;
    }

    const [x, y, z, rotationX, rotationY, rotationZ, width, height, depth] = cuboidPoints;
    const lidarToCamera = new THREE.Matrix4().set(
        ...([...extrinsicMatrix.flat(), 0, 0, 0, 1] as Parameters<THREE.Matrix4['set']>),
    );
    const rotation = new THREE.Euler(rotationX, rotationY, rotationZ);
    const points = [
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    ].map(([cornerX, cornerY, cornerZ]): [number, number] | null => {
        const point = new THREE.Vector3(
            (cornerX * width) / 2,
            (cornerY * height) / 2,
            (cornerZ * depth) / 2,
        ).applyEuler(rotation).add(new THREE.Vector3(x, y, z)).applyMatrix4(lidarToCamera);

        if (!Number.isFinite(point.z) || point.z <= Number.EPSILON) {
            return null;
        }

        const projectedX = intrinsicMatrix[0][0] * point.x +
            intrinsicMatrix[0][1] * point.y + intrinsicMatrix[0][2] * point.z;
        const projectedY = intrinsicMatrix[1][0] * point.x +
            intrinsicMatrix[1][1] * point.y + intrinsicMatrix[1][2] * point.z;
        const projectedZ = intrinsicMatrix[2][0] * point.x +
            intrinsicMatrix[2][1] * point.y + intrinsicMatrix[2][2] * point.z;
        if (!Number.isFinite(projectedZ) || Math.abs(projectedZ) < Number.EPSILON) {
            return null;
        }

        const projectedPoint: [number, number] = [projectedX / projectedZ, projectedY / projectedZ];
        return isFiniteVector(projectedPoint) ? projectedPoint : null;
    });

    if (points.some((point): point is null => point === null)) {
        return null;
    }

    return points as ProjectedCuboid;
}
