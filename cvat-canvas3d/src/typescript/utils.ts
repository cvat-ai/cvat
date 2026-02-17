// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

export function disposeObject3D(object: THREE.Object3D): void {
    if (!object) return;

    while (object.children.length > 0) {
        const child = object.children[0];
        disposeObject3D(child);
        object.remove(child);
    }

    if ((object as any).geometry) {
        const { geometry } = (object as any);
        if (geometry.dispose) {
            geometry.dispose();
        }
    }

    if ((object as any).material) {
        const materials = Array.isArray((object as any).material) ?
            (object as any).material :
            [(object as any).material];

        materials.forEach((material: THREE.Material) => {
            Object.keys(material).forEach((prop) => {
                const value = (material as any)[prop];
                if (value && typeof value === 'object' && 'minFilter' in value) {
                    // It's a texture
                    if (value.dispose) {
                        value.dispose();
                    }
                }
            });

            if (material.dispose) {
                material.dispose();
            }
        });
    }

    if ((object as any).renderTarget) {
        (object as any).renderTarget.dispose();
    }
}

export function disposeScene(scene: THREE.Scene): void {
    if (!scene) return;

    while (scene.children.length > 0) {
        const child = scene.children[0];
        disposeObject3D(child);
        scene.remove(child);
    }
}
