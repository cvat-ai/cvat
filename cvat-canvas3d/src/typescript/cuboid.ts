// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { ViewType } from './canvas3dModel';
import constants from './consts';

export interface Indexable {
    [key: string]: any;
}

export function makeCornerPointsMatrix(x: number, y: number, z: number): number[][] {
    return ([
        [1 * x, 1 * y, 1 * z],
        [1 * x, 1 * y, -1 * z],
        [1 * x, -1 * y, 1 * z],
        [1 * x, -1 * y, -1 * z],
        [-1 * x, 1 * y, 1 * z],
        [-1 * x, 1 * y, -1 * z],
        [-1 * x, -1 * y, 1 * z],
        [-1 * x, -1 * y, -1 * z],
    ]);
}

export function cuboidSize(cuboid: THREE.Mesh): {
    x: number, y: number, z: number,
} {
    cuboid.geometry.computeBoundingBox();
    const bbox = cuboid.geometry.boundingBox;
    const x = (bbox.max.x - bbox.min.x) * cuboid.scale.x;
    const y = (bbox.max.y - bbox.min.y) * cuboid.scale.y;
    const z = (bbox.max.z - bbox.min.z) * cuboid.scale.z;

    return { x, y, z };
}

export class CuboidModel {
    public perspective: THREE.Mesh;
    public top: THREE.Mesh;
    public side: THREE.Mesh;
    public front: THREE.Mesh;
    public wireframe: THREE.LineSegments;

    public constructor(outline: string, outlineColor: string) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: false,
            transparent: true,
            opacity: 0.4,
        });
        this.perspective = new THREE.Mesh(geometry, material);
        const geo = new THREE.EdgesGeometry(this.perspective.geometry);
        this.wireframe = new THREE.LineSegments(
            geo,
            outline === 'line' ? new THREE.LineBasicMaterial({ color: outlineColor, linewidth: 4 }) :
                new THREE.LineDashedMaterial({
                    color: outlineColor,
                    dashSize: 0.05,
                    gapSize: 0.05,
                }),
        );
        this.wireframe.computeLineDistances();
        this.wireframe.renderOrder = 1;
        this.perspective.add(this.wireframe);

        this.top = new THREE.Mesh(geometry, material);
        this.side = new THREE.Mesh(geometry, material);
        this.front = new THREE.Mesh(geometry, material);

        const camRotateHelper = new THREE.Object3D();
        camRotateHelper.translateX(-2);
        camRotateHelper.name = 'camRefRot';
        camRotateHelper.up = new THREE.Vector3(0, 0, 1);
        camRotateHelper.lookAt(new THREE.Vector3(0, 0, 0));
        this.front.add(camRotateHelper.clone());
    }

    public setPosition(x: number, y: number, z: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].position.set(x, y, z);
        });
    }

    public setScale(x: number, y: number, z: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].scale.set(x, y, z);
        });
    }

    public setRotation(x: number, y: number, z: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].rotation.set(x, y, z);
        });
    }

    public attachCameraReference(): void {
        // Attach Cam Reference
        const topCameraReference = new THREE.Object3D();
        topCameraReference.translateZ(2);
        topCameraReference.name = constants.CAMERA_REFERENCE;
        this.top.add(topCameraReference);
        this.top.userData = { ...this.top.userData, camReference: topCameraReference };

        const sideCameraReference = new THREE.Object3D();
        sideCameraReference.translateY(2);
        sideCameraReference.name = constants.CAMERA_REFERENCE;
        this.side.add(sideCameraReference);
        this.side.userData = { ...this.side.userData, camReference: sideCameraReference };

        const frontCameraReference = new THREE.Object3D();
        frontCameraReference.translateX(2);
        frontCameraReference.name = constants.CAMERA_REFERENCE;
        this.front.add(frontCameraReference);
        this.front.userData = { ...this.front.userData, camReference: frontCameraReference };
    }

    public getReferenceCoordinates(viewType: string): THREE.Vector3 {
        const { elements } = (this as Indexable)[viewType].getObjectByName(constants.CAMERA_REFERENCE).matrixWorld;
        return new THREE.Vector3(elements[12], elements[13], elements[14]);
    }

    public setName(clientId: any): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].name = clientId;
        });
    }

    public setOriginalColor(color: string): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            ((this as Indexable)[view] as any).originalColor = color;
        });
    }

    public setColor(color: string): void {
        this.setOutlineColor(color);
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            ((this as Indexable)[view].material as THREE.MeshBasicMaterial).color.set(color);
        });
    }

    public setOutlineColor(color: string): void {
        (this.wireframe.material as THREE.MeshBasicMaterial).color.set(color);
    }

    public setOpacity(opacity: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            ((this as Indexable)[view].material as THREE.MeshBasicMaterial).opacity = opacity / 100;
        });
    }
}

export function createCuboidEdges(instance: THREE.Mesh): THREE.LineSegments {
    const geometry = new THREE.EdgesGeometry(instance.geometry);
    const edges = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 3 }));
    edges.name = constants.CUBOID_EDGE_NAME;
    instance.add(edges);
    return edges;
}

export function removeCuboidEdges(instance: THREE.Mesh): void {
    const edges = instance.getObjectByName(constants.CUBOID_EDGE_NAME);
    instance.remove(edges);
}

export function createResizeHelper(instance: THREE.Mesh): void {
    const sphereGeometry = new THREE.SphereGeometry(0.1);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1 });
    const { x, y, z } = cuboidSize(instance);
    const cornerPoints = makeCornerPointsMatrix(x / 2, y / 2, z / 2);

    const vertices = [];
    for (const offset of cornerPoints) {
        const scaleVector = new THREE.Vector3().fromArray(offset);
        const vertex = instance.position.clone();
        vertices.push(vertex.add(scaleVector));
    }

    for (let i = 0; i < vertices.length; i++) {
        const helper = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
        helper.position.set(vertices[i].x, vertices[i].y, vertices[i].z);
        helper.up.set(0, 0, 1);
        helper.rotateY(90);
        helper.name = `${constants.RESIZE_HELPER_NAME}_${i}`;
        instance.parent.add(helper);
    }
}

export function removeResizeHelper(instance: THREE.Mesh): void {
    instance.parent.children.filter((child: THREE.Object3D) => child.name.startsWith(constants.RESIZE_HELPER_NAME))
        .forEach((helper) => {
            instance.parent.remove(helper);
        });
}

export function createRotationHelper(instance: THREE.Mesh, viewType: ViewType): void {
    if ([ViewType.TOP, ViewType.SIDE, ViewType.FRONT].includes(viewType)) {
        const sphereGeometry = new THREE.SphereGeometry(0.1);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1 });
        const rotationHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
        rotationHelper.name = constants.ROTATION_HELPER_NAME;
        instance.parent.add(rotationHelper);

        const { y, z } = cuboidSize(instance);

        switch (viewType) {
            case ViewType.TOP:
                rotationHelper.position.set(
                    instance.position.x,
                    instance.position.y + (y / 2) * instance.scale.y + constants.ROTATION_HELPER_OFFSET,
                    instance.position.z,
                );
                break;
            case ViewType.SIDE:
            case ViewType.FRONT:
                rotationHelper.position.set(
                    instance.position.x,
                    instance.position.y,
                    instance.position.z + (z / 2) * instance.scale.z + constants.ROTATION_HELPER_OFFSET,
                );
                break;
            default:
                break;
        }
    }
}

export function removeRotationHelper(instance: THREE.Mesh): void {
    const helper = instance.parent.getObjectByName(constants.ROTATION_HELPER_NAME);
    if (helper) {
        instance.parent.remove(helper);
    }
}
