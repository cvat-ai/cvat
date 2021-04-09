// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { ViewType } from './canvas3dModel';

export class CuboidModel {
    public perspective: THREE.Mesh;
    public top: THREE.Mesh;
    public side: THREE.Mesh;
    public front: THREE.Mesh;

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
        const wireframe = new THREE.LineSegments(geo, outline === 'line'
            ? new THREE.LineBasicMaterial({ color: outlineColor, linewidth: 4 })
            : new THREE.LineDashedMaterial({
                color: outlineColor, dashSize: 0.05, gapSize: 0.05,
            }));
        wireframe.computeLineDistances();
        wireframe.renderOrder = 1;
        this.perspective.add(wireframe);
        this.top = new THREE.Mesh(geometry, material);
        this.side = new THREE.Mesh(geometry, material);
        this.front = new THREE.Mesh(geometry, material);
    }

    public setPosition(x: number, y: number, z: number): void {
        this.perspective.position.set(x, y, z);
        this.top.position.set(x, y, z);
        this.side.position.set(x, y, z);
        this.front.position.set(x, y, z);
    }

    public setName(clientId: any): void {
        this.perspective.name = clientId;
        this.top.name = clientId;
        this.side.name = clientId;
        this.front.name = clientId;
    }

    public setOriginalColor(color: string): void {
        // @ts-ignore
        this.perspective.originalColor = color;
        // @ts-ignore
        this.top.originalColor = color;
        // @ts-ignore
        this.side.originalColor = color;
        // @ts-ignore
        this.front.originalColor = color;
    }

    public setColor(color: string): void {
        // @ts-ignore
        this.perspective.material.color.set(color);
        // @ts-ignore
        this.top.material.color.set(color);
        // @ts-ignore
        this.side.material.color.set(color);
        // @ts-ignore
        this.front.material.color.set(color);
    }

    public setOpacity(opacity: number): void {
        // @ts-ignore
        this.perspective.material.opacity = opacity / 100;
        // @ts-ignore
        this.top.material.opacity = opacity / 100;
        // @ts-ignore
        this.side.material.opacity = opacity / 100;
        // @ts-ignore
        this.front.material.opacity = opacity / 100;
    }
}


export function setTranslationHelper(instance: THREE.Mesh): void {
    const sphereGeometry = new THREE.SphereGeometry(0.05);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1 });
    instance.geometry.deleteAttribute('normal');
    instance.geometry.deleteAttribute('uv');
    // eslint-disable-next-line no-param-reassign
    instance.geometry = BufferGeometryUtils.mergeVertices(instance.geometry);
    const vertices = [];
    const positionAttribute = instance.geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        vertices.push(vertex);
    }
    const helpers = [];
    for (let i = 0; i < vertices.length; i++) {
        helpers[i] = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
        helpers[i].position.set(vertices[i].x,
            vertices[i].y,
            vertices[i].z);
        helpers[i].up.set(0,
            0,
            1);
        instance.add(helpers[i]);
    }
}


export function createRotationHelper(instance: THREE.Mesh, viewType: ViewType): void {
    const sphereGeometry = new THREE.SphereGeometry(0.05);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1 });
    const rotationHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
    rotationHelper.name = 'rotationHelper';
    switch (viewType) {
        case 'top':
            // @ts-ignore
            rotationHelper.position.set(instance.geometry.parameters.height / 2 + 0.1,
                instance.position.y,
                instance.position.z);
            instance.add(rotationHelper.clone());
            break;
        case 'side':
        case 'front':

            rotationHelper.position.set(
                instance.position.x,
                // @ts-ignore
                instance.position.y, instance.geometry.parameters.depth / 2 + 0.1,
            );
            instance.add(rotationHelper.clone());
            break;
        default:
            break;
    }
}
