// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

function disposeMaterials(material: THREE.Material | THREE.Material[]): void {
    const materials = Array.isArray(material) ? material : [material];

    materials.forEach((mat: THREE.Material) => {
        if (!mat) return;

        Object.keys(mat).forEach((prop) => {
            const value = (mat as any)[prop];
            if (value && typeof value === 'object' && 'minFilter' in value) {
                if (value.dispose) {
                    value.dispose();
                }
            }
        });

        if (mat.dispose) {
            mat.dispose();
        }
    });
}

export function disposeObjectResources(object: THREE.Object3D): void {
    if (!object) return;

    if ((object as any).geometry) {
        const { geometry } = (object as any);
        if (geometry?.dispose) {
            geometry.dispose();
        }
    }

    if ((object as any).material) {
        disposeMaterials((object as any).material);
    }

    if ((object as any).renderTarget) {
        (object as any).renderTarget.dispose();
    }
}

export function disposeObject3D(object: THREE.Object3D): void {
    if (!object) return;

    while (object.children.length > 0) {
        const child = object.children[0];
        disposeObject3D(child);
        object.remove(child);
    }

    disposeObjectResources(object);
}

export function disposeScene(scene: THREE.Scene): void {
    if (!scene) return;

    while (scene.children.length > 0) {
        const child = scene.children[0];
        disposeObject3D(child);
        scene.remove(child);
    }
}
