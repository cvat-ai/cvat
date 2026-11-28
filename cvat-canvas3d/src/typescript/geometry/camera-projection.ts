// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

import { CUBOID_EDGES, CUBOID_FACES, makeCornerPointsMatrix } from '../cuboid';
import { isFiniteMatrixOfShape, isFiniteVector } from './utils';

export interface CameraCalibration {
    intrinsicMatrix: number[][];
    extrinsicMatrix: number[][];
}

export type ProjectedPoint = [number, number];

export interface ProjectedCuboid {
    faces: ProjectedPoint[][];
    edges: [ProjectedPoint, ProjectedPoint][];
}

// Keeping the clipped geometry a finite distance from the camera avoids unstable perspective division.
const CAMERA_NEAR_DEPTH = 0.1;
const CLIPPING_TOLERANCE = 1e-9;

function clipFaceToNearPlane(face: THREE.Vector3[], nearPlane: THREE.Plane): THREE.Vector3[] {
    const clippedFace: THREE.Vector3[] = [];
    let previousPoint = face[face.length - 1];
    let isPreviousPointVisible = nearPlane.distanceToPoint(previousPoint) >= 0;

    for (const currentPoint of face) {
        const isCurrentPointVisible = nearPlane.distanceToPoint(currentPoint) >= 0;

        if (isCurrentPointVisible !== isPreviousPointVisible) {
            const intersection = nearPlane.intersectLine(
                new THREE.Line3(previousPoint, currentPoint),
                new THREE.Vector3(),
            );

            if (intersection) {
                clippedFace.push(intersection);
            }
        }

        if (isCurrentPointVisible) {
            clippedFace.push(currentPoint);
        }

        previousPoint = currentPoint;
        isPreviousPointVisible = isCurrentPointVisible;
    }

    return clippedFace;
}

function clipEdgeToNearPlane(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    nearPlane: THREE.Plane,
): [THREE.Vector3, THREE.Vector3] | null {
    const isStartPointVisible = nearPlane.distanceToPoint(startPoint) >= 0;
    const isEndPointVisible = nearPlane.distanceToPoint(endPoint) >= 0;

    if (!isStartPointVisible && !isEndPointVisible) {
        return null;
    }

    if (isStartPointVisible && isEndPointVisible) {
        return [startPoint, endPoint];
    }

    const intersection = nearPlane.intersectLine(
        new THREE.Line3(startPoint, endPoint),
        new THREE.Vector3(),
    );

    if (!intersection) {
        return null;
    }

    return isStartPointVisible ? [startPoint, intersection] : [intersection, endPoint];
}

function makeNearPlaneFace(clippedFaces: THREE.Vector3[][], nearPlane: THREE.Plane): THREE.Vector3[] {
    const nearPlanePoints: THREE.Vector3[] = [];

    for (const clippedFace of clippedFaces) {
        for (const facePoint of clippedFace) {
            if (
                Math.abs(nearPlane.distanceToPoint(facePoint)) < CLIPPING_TOLERANCE &&
                !nearPlanePoints.some((candidatePoint) => (
                    candidatePoint.distanceToSquared(facePoint) < CLIPPING_TOLERANCE ** 2
                ))
            ) {
                nearPlanePoints.push(facePoint);
            }
        }
    }

    if (nearPlanePoints.length < 3) {
        return [];
    }

    const centerPoint = nearPlanePoints.reduce(
        (sum, facePoint) => sum.add(facePoint),
        new THREE.Vector3(),
    ).multiplyScalar(1 / nearPlanePoints.length);

    // Order the vertices around their center to form a non-self-intersecting polygon.
    return nearPlanePoints.sort((leftPoint, rightPoint) => (
        Math.atan2(leftPoint.y - centerPoint.y, leftPoint.x - centerPoint.x) -
        Math.atan2(rightPoint.y - centerPoint.y, rightPoint.x - centerPoint.x)
    ));
}

function projectCameraPoint(
    intrinsicMatrix: number[][],
    cameraPoint: THREE.Vector3,
): ProjectedPoint | null {
    const projectedX = intrinsicMatrix[0][0] * cameraPoint.x +
        intrinsicMatrix[0][1] * cameraPoint.y + intrinsicMatrix[0][2] * cameraPoint.z;
    const projectedY = intrinsicMatrix[1][0] * cameraPoint.x +
        intrinsicMatrix[1][1] * cameraPoint.y + intrinsicMatrix[1][2] * cameraPoint.z;
    const projectedZ = intrinsicMatrix[2][0] * cameraPoint.x +
        intrinsicMatrix[2][1] * cameraPoint.y + intrinsicMatrix[2][2] * cameraPoint.z;

    if (!Number.isFinite(projectedZ) || Math.abs(projectedZ) < Number.EPSILON) {
        return null;
    }

    const projectedPoint: ProjectedPoint = [projectedX / projectedZ, projectedY / projectedZ];
    return isFiniteVector(projectedPoint) ? projectedPoint : null;
}

function projectCuboidGeometry(
    intrinsicMatrix: number[][],
    cameraFaces: THREE.Vector3[][],
    cameraEdges: [THREE.Vector3, THREE.Vector3][],
): ProjectedCuboid | null {
    const projectedFaces: ProjectedPoint[][] = [];
    for (const cameraFace of cameraFaces) {
        const projectedFace = cameraFace.map((cameraPoint) => projectCameraPoint(intrinsicMatrix, cameraPoint));
        if (projectedFace.some((projectedPoint): projectedPoint is null => projectedPoint === null)) {
            return null;
        }

        projectedFaces.push(projectedFace);
    }

    if (!projectedFaces.length) {
        return null;
    }

    const projectedEdges: [ProjectedPoint, ProjectedPoint][] = [];
    for (const [fromPoint, toPoint] of cameraEdges) {
        const projectedFromPoint = projectCameraPoint(intrinsicMatrix, fromPoint);
        const projectedToPoint = projectCameraPoint(intrinsicMatrix, toPoint);
        if (!projectedFromPoint || !projectedToPoint) {
            return null;
        }

        projectedEdges.push([projectedFromPoint, projectedToPoint]);
    }

    return {
        faces: projectedFaces,
        edges: projectedEdges,
    };
}

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
 * @returns The projected cuboid faces and edges, or `null` when the input is invalid or behind the camera.
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
    const cameraPoints = makeCornerPointsMatrix(width / 2, height / 2, depth / 2)
        .map(([cornerX, cornerY, cornerZ]) => new THREE.Vector3(
            cornerX,
            cornerY,
            cornerZ,
        ).applyEuler(rotation).add(new THREE.Vector3(x, y, z)).applyMatrix4(lidarToCamera));
    const numberOfPointsInFront = cameraPoints.filter((cameraPoint) => cameraPoint.z > CAMERA_NEAR_DEPTH).length;

    if (!numberOfPointsInFront) {
        return null;
    }

    if (numberOfPointsInFront === cameraPoints.length) {
        return projectCuboidGeometry(
            intrinsicMatrix,
            CUBOID_FACES.map((cornerIndices) => cornerIndices.map((index) => cameraPoints[index])),
            CUBOID_EDGES.map(([fromIndex, toIndex]) => [cameraPoints[fromIndex], cameraPoints[toIndex]]),
        );
    }

    const nearPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -CAMERA_NEAR_DEPTH);
    const clippedFaces = CUBOID_FACES
        .map((cornerIndices) => clipFaceToNearPlane(cornerIndices.map((index) => cameraPoints[index]), nearPlane))
        .filter((clippedFace) => clippedFace.length >= 3);
    const nearPlaneCapFace = makeNearPlaneFace(clippedFaces, nearPlane);

    if (nearPlaneCapFace.length >= 3) {
        clippedFaces.push(nearPlaneCapFace);
    }

    const clippedEdges = CUBOID_EDGES
        .map(([fromIndex, toIndex]) => clipEdgeToNearPlane(
            cameraPoints[fromIndex],
            cameraPoints[toIndex],
            nearPlane,
        ))
        .filter((edge): edge is [THREE.Vector3, THREE.Vector3] => edge !== null);

    return projectCuboidGeometry(intrinsicMatrix, clippedFaces, clippedEdges);
}
