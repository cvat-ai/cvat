// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

function disposeMaterial(material: THREE.Material): void {
    Object.keys(material).forEach((prop) => {
        const value = material[prop];
        if (value instanceof THREE.Texture) {
            value?.dispose();
        }
    });
    material.dispose();
}

export function disposeObjectResources(object: THREE.Object3D): void {
    if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
        object.geometry.dispose();
    }

    if ('material' in object) {
        if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
                if (material instanceof THREE.Material) {
                    disposeMaterial(material);
                }
            });
        } else if (object.material instanceof THREE.Material) {
            disposeMaterial(object.material);
        }
    }

    if ('renderTarget' in object && object.renderTarget instanceof THREE.WebGLRenderTarget) {
        object.renderTarget.dispose();
    }
}

export function disposeObject3D(object: THREE.Object3D): void {
    while (object.children.length > 0) {
        const child = object.children[0];
        object.remove(child);
        disposeObject3D(child);
    }

    disposeObjectResources(object);
}

export function disposeScene(scene: THREE.Scene): void {
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        disposeObject3D(child);
    }
}
