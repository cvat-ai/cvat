// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { OrientationVisibility, ViewType } from './canvas3dModel';
import constants from './consts';
import controlPointTexture from './controlPointTexture';

export interface Indexable {
    [key: string]: any;
}

export interface ObjectArrowHelper {
    x: THREE.ArrowHelper;
    y: THREE.ArrowHelper;
    z: THREE.ArrowHelper;
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

    public orientationArrows: Record<ViewType, ObjectArrowHelper> = {
        [ViewType.PERSPECTIVE]: null,
        [ViewType.TOP]: null,
        [ViewType.SIDE]: null,
        [ViewType.FRONT]: null,
    };

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

        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            this.orientationArrows[view] = this.createArrows();
            Object.values(this.orientationArrows[view]).forEach((arrow) => {
                this[view].add(arrow);
            });
        });

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

    private createArrows(): ObjectArrowHelper {
        return {
            x: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.5, 0, 0), 1, 0xff0000),
            y: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.5, 0), 1, 0x00ff00),
            z: new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0.5), 1, 0x0000ff),
        };
    }

    public getRotationHelperPosition(viewType: ViewType): THREE.Vector3 {
        const position = viewType === ViewType.TOP ?
            new THREE.Vector3(0, constants.ROTATION_HELPER_OFFSET, 0) :
            new THREE.Vector3(0, 0, constants.ROTATION_HELPER_OFFSET);
        return this[viewType].localToWorld(position);
    }

    public getResizeHelperPositions(): THREE.Vector3[] {
        const cornerPoints = makeCornerPointsMatrix(0.5, 0.5, 0.5);
        return cornerPoints.map((point) => {
            const localPoint = new THREE.Vector3().fromArray(point);
            return this.perspective.localToWorld(localPoint.clone());
        });
    }

    public setOrientationVisibility(orientationVisibility: OrientationVisibility): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            Object.entries(this.orientationArrows[view]).forEach(([axis, arrow]) => {
                arrow.visible = orientationVisibility[axis];
            });
        });
    }

    public setPosition(x: number, y: number, z: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].position.set(x, y, z);
        });
    }

    public setScale(x: number, y: number, z: number): void {
        [ViewType.PERSPECTIVE, ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view): void => {
            (this as Indexable)[view].scale.set(x, y, z);

            // Arrow direction specifies its local Y axis, where it points to.
            // When we change its direction to align with the X or Z axis,
            // the arrow’s local coordinate system rotates accordingly.
            // To maintain correct proportions, we apply the X or Z scaling of the cuboid
            // to the arrow's Y axis (its original forward direction).
            const xscale = 1.0 / x;
            const yscale = 1.0 / y;
            const zscale = 1.0 / z;
            this.orientationArrows[view].x.scale.set(yscale, xscale, zscale);
            this.orientationArrows[view].y.scale.set(xscale, yscale, zscale);
            this.orientationArrows[view].z.scale.set(xscale, zscale, yscale);
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

export function createResizeHelper(cuboid: CuboidModel, viewType: ViewType): void {
    const material = new THREE.SpriteMaterial({
        color: '#ff0000',
        opacity: 1,
        map: controlPointTexture,
    });

    const positions = cuboid.getResizeHelperPositions();
    for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const helper = new THREE.Sprite(material);
        helper.renderOrder = Number.MAX_SAFE_INTEGER;
        helper.name = `${constants.RESIZE_HELPER_NAME}_${i}`;
        helper.position.copy(position);
        cuboid[viewType].parent.add(helper);
    }
}

export function removeResizeHelper(instance: THREE.Mesh): void {
    instance.parent.children.filter((child: THREE.Object3D) => child.name.startsWith(constants.RESIZE_HELPER_NAME))
        .forEach((helper) => {
            instance.parent.remove(helper);
        });
}

export function createRotationHelper(cuboid: CuboidModel, viewType: ViewType): void {
    if ([ViewType.TOP, ViewType.SIDE, ViewType.FRONT].includes(viewType)) {
        const helperPosition = cuboid.getRotationHelperPosition(viewType);
        const rotationHelper = new THREE.Sprite(new THREE.SpriteMaterial({
            color: '#33b864',
            opacity: 1,
            map: controlPointTexture,
        }));
        rotationHelper.renderOrder = Number.MAX_SAFE_INTEGER;
        rotationHelper.name = constants.ROTATION_HELPER_NAME;
        rotationHelper.position.copy(helperPosition);
        cuboid[viewType].parent.add(rotationHelper);
    }
}

export function removeRotationHelper(instance: THREE.Mesh): void {
    const helper = instance.parent.getObjectByName(constants.ROTATION_HELPER_NAME);
    if (helper) {
        instance.parent.remove(helper);
    }
}
