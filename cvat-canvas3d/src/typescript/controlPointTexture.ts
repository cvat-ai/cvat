// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';

function getCircleTexture(size: number): THREE.CanvasTexture {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        const r = size / 2;
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

export default getCircleTexture(256);
