// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { CuboidModel, makeCornerPointsMatrix } from './cuboid';
import { ViewType } from './canvas3dModel';

export interface IssueCuboid {
    id: number;
    position: number[];
    highlighted: boolean;
}

// Use the annotation cuboid format: center, Euler rotation, dimensions, and seven reserved values.
// Point issues continue to use [x, y, z]. Both live in the shared Issue.position field.
export function isIssueCuboid(position: number[] | null | undefined): boolean {
    return Array.isArray(position) && position.length === 16 && position.every(Number.isFinite) &&
        position.slice(6, 9).every((value) => value > 0);
}

export function isIssuePoint(position: number[] | null | undefined): boolean {
    return Array.isArray(position) && position.length === 3 && position.every(Number.isFinite);
}

export function issueCuboidCorners(position: number[]): THREE.Vector3[] {
    if (!isIssueCuboid(position)) return [];
    const center = new THREE.Vector3(...position.slice(0, 3));
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...position.slice(3, 6)));
    return makeCornerPointsMatrix(...position.slice(6, 9).map((value) => value / 2) as [number, number, number])
        .map((corner) => new THREE.Vector3(...corner).applyQuaternion(rotation).add(center));
}

export function resizeIssueCuboid(
    position: number[], corner: number, delta: THREE.Vector3, cameraDirection: THREE.Vector3,
): number[] | null {
    if (!isIssueCuboid(position) || !Number.isInteger(corner) || corner < 0 || corner > 7) return null;
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...position.slice(3, 6)));
    const inverse = rotation.clone().invert();
    const normal = cameraDirection.clone().applyQuaternion(inverse);
    const offset = delta.clone().applyQuaternion(inverse);
    const hiddenAxis = normal.toArray().reduce((best, value, axis, values) => (
        Math.abs(value) > Math.abs(values[best]) ? axis : best
    ), 0);
    // Preserve one local dimension while making the corner follow the pointer in the view plane.
    offset.addScaledVector(normal, -offset.getComponent(hiddenAxis) / normal.getComponent(hiddenAxis));
    offset.setComponent(hiddenAxis, 0);
    const signs = makeCornerPointsMatrix(1, 1, 1)[corner];
    const result = [...position];
    for (let axis = 0; axis < 3; axis++) {
        result[6 + axis] = position[6 + axis] + signs[axis] * offset.getComponent(axis);
        if (result[6 + axis] <= 0) return null;
        offset.setComponent(axis, (signs[axis] * (result[6 + axis] - position[6 + axis])) / 2);
    }
    offset.applyQuaternion(rotation);
    result.splice(0, 3, ...new THREE.Vector3(...position.slice(0, 3)).add(offset).toArray());
    return result;
}

export class IssueCuboids {
    private cuboids = new Map<number, CuboidModel>();
    private scenes: Record<ViewType, THREE.Scene>;

    public constructor(scenes: Record<ViewType, THREE.Scene>) {
        this.scenes = scenes;
    }

    public setup(regions: IssueCuboid[]): void {
        const ids = new Set(regions.map((region) => region.id));
        for (const [id, cuboid] of this.cuboids) {
            if (!ids.has(id)) {
                Object.values(ViewType).forEach((view) => cuboid[view].removeFromParent());
                cuboid.dispose();
                this.cuboids.delete(id);
            }
        }
        for (const region of regions) {
            if (!isIssueCuboid(region.position)) continue;
            let cuboid = this.cuboids.get(region.id);
            if (!cuboid) {
                cuboid = new CuboidModel('line', 'red');
                cuboid.setName(`cvat-issue-cuboid-${region.id}`);
                cuboid.setOrientationVisibility({ x: false, y: false, z: false });
                for (const view of Object.values(ViewType)) {
                    if (view !== ViewType.PERSPECTIVE) cuboid[view].add(cuboid.wireframe.clone());
                    this.scenes[view].children[0].add(cuboid[view]);
                }
                const material = cuboid.perspective.material as THREE.MeshBasicMaterial;
                material.depthWrite = false;
                material.depthTest = false;
                cuboid.setOpacity(20);
                this.cuboids.set(region.id, cuboid);
            }
            const { position } = region;
            cuboid.setPosition(position[0], position[1], position[2]);
            cuboid.setRotation(position[3], position[4], position[5]);
            cuboid.setScale(position[6], position[7], position[8]);
            cuboid.setColor(region.highlighted ? 'yellow' : 'red');
            for (const view of Object.values(ViewType)) {
                cuboid[view].updateMatrixWorld(true);
            }
        }
    }

    public pick(raycaster: THREE.Raycaster, view: ViewType, preferredID: number | null): number | null {
        const meshes = [...this.cuboids.values()].map((cuboid) => cuboid[view]);
        const preferredMesh = this.cuboids.get(preferredID)?.[view];
        const hits = raycaster.intersectObjects(meshes, false);
        const hit = hits.find(({ object }) => object === preferredMesh) ?? hits[0];
        return hit ? Number(hit.object.name.replace('cvat-issue-cuboid-', '')) : null;
    }

    public clear(): void {
        this.setup([]);
    }
}
