// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import * as THREE from 'three';

export class CuboidModel {
    public perspective: THREE.Mesh;
    public top: THREE.Mesh;
    public side: THREE.Mesh;
    public front: THREE.Mesh;

    public constructor() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        this.perspective = new THREE.Mesh(geometry, material);
        this.top = new THREE.Mesh(geometry, material);
        this.side = new THREE.Mesh(geometry, material);
        this.front = new THREE.Mesh(geometry, material);
    }
}
