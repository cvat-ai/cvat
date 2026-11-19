// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

export class ThickArrowHelper extends THREE.ArrowHelper {
    private lineMaterial: LineMaterial;

    public constructor(
        direction: THREE.Vector3,
        origin: THREE.Vector3,
        length: number,
        color: THREE.ColorRepresentation,
        headLength: number,
        headWidth: number,
        lineWidth: number,
        resolution: THREE.Vector2,
    ) {
        super(direction, origin, length, color, headLength, headWidth);

        this.line.visible = false;

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions([0, 0, 0, 0, length - headLength, 0]);

        this.lineMaterial = new LineMaterial({ color, linewidth: lineWidth });
        this.lineMaterial.resolution.copy(resolution);

        this.add(new Line2(lineGeometry, this.lineMaterial));
    }

    public setResolution(resolution: THREE.Vector2): void {
        this.lineMaterial.resolution.copy(resolution);
    }
}
