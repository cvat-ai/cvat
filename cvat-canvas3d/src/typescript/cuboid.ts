// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
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

        const planeTop = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1, 1, 1),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                visible: false,
            }),
        );

        const planeSide = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1, 1, 1),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                visible: false,
            }),
        );

        const planeFront = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1, 1, 1),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                visible: false,
            }),
        );

        this.top.add(planeTop);
        planeTop.rotation.set(0, 0, 0);
        planeTop.position.set(0, 0, 0.5);
        planeTop.name = constants.PLANE_ROTATION_HELPER;

        this.side.add(planeSide);
        planeSide.rotation.set(-Math.PI / 2, 0, Math.PI);
        planeTop.position.set(0, 0.5, 0);
        planeSide.name = constants.PLANE_ROTATION_HELPER;

        this.front.add(planeFront);
        planeFront.rotation.set(0, Math.PI / 2, 0);
        planeTop.position.set(0.5, 0, 0);
        planeFront.name = constants.PLANE_ROTATION_HELPER;

        const cornerPoints = makeCornerPointsMatrix(0.5, 0.5, 0.5);
        for (let i = 0; i < cornerPoints.length; i++) {
            const point = new THREE.Vector3().fromArray(cornerPoints[i]);
            const helper = new THREE.Mesh(new THREE.SphereGeometry(0.1));
            helper.visible = false;
            helper.name = `cuboidNodeHelper_${i}`;
            this.perspective.add(helper);
            helper.position.copy(point);
        }

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
        const topCameraReference = new THREE.Object3D();
        topCameraReference.translateZ(2);
        topCameraReference.name = constants.CAMERA_REFERENCE;
        this.top.add(topCameraReference);

        const sideCameraReference = new THREE.Object3D();
        sideCameraReference.translateY(2);
        sideCameraReference.name = constants.CAMERA_REFERENCE;
        this.side.add(sideCameraReference);

        const frontCameraReference = new THREE.Object3D();
        frontCameraReference.translateX(2);
        frontCameraReference.name = constants.CAMERA_REFERENCE;
        this.front.add(frontCameraReference);
    }

    public getReferenceCoordinates(viewType: string): THREE.Vector3 {
        const camRef = (this as Indexable)[viewType].getObjectByName(constants.CAMERA_REFERENCE);
        return camRef.getWorldPosition(new THREE.Vector3());
    }

    public setName(clientId: any): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].name = clientId;
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
    const sphereGeometry = new THREE.SphereGeometry(0.2);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ff0000', opacity: 1 });
    const cornerPoints = makeCornerPointsMatrix(0.5, 0.5, 0.5);

    for (let i = 0; i < cornerPoints.length; i++) {
        const point = new THREE.Vector3().fromArray(cornerPoints[i]);
        const tmpSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        instance.add(tmpSphere);
        tmpSphere.position.copy(point);
        const globalPosition = tmpSphere.getWorldPosition(new THREE.Vector3());
        instance.remove(tmpSphere);

        const helper = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
        helper.position.copy(globalPosition);
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
        // Create a temporary element to get correct position
        const tmpSphere = new THREE.Mesh(new THREE.SphereGeometry(0.2));
        instance.add(tmpSphere);
        if (viewType === ViewType.TOP) {
            tmpSphere.translateY(constants.ROTATION_HELPER_OFFSET);
        } else {
            tmpSphere.translateZ(constants.ROTATION_HELPER_OFFSET);
        }
        const globalPosition = tmpSphere.getWorldPosition(new THREE.Vector3());
        instance.remove(tmpSphere);

        // Create rotation helper itself first
        const sphereGeometry = new THREE.SphereGeometry(0.2);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#33b864', opacity: 1 });
        const rotationHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
        rotationHelper.name = constants.ROTATION_HELPER_NAME;
        instance.parent.add(rotationHelper);
        rotationHelper.position.copy(globalPosition);
    }
}

export function removeRotationHelper(instance: THREE.Mesh): void {
    const helper = instance.parent.getObjectByName(constants.ROTATION_HELPER_NAME);
    if (helper) {
        instance.parent.remove(helper);
    }
}
