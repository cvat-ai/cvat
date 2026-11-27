// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { ViewType } from './canvas3dModel';
import { displayPixelRatio } from './utils';

export interface IssueSprite {
    id: number;
    view: ViewType;
    position: number[];
    width: number;
    height: number;
    offset: [number, number];
    highlighted: boolean;
    corner?: number;
    label?: { text: string; resolved: boolean; font: string; order: number };
}

function spriteTexture(data: IssueSprite, ratio: number): THREE.CanvasTexture {
    const image = document.createElement('canvas');
    image.width = Math.ceil(data.width * ratio);
    image.height = Math.ceil(data.height * ratio);
    const context = image.getContext('2d');
    context.scale(ratio, ratio);
    if (data.label) {
        context.fillStyle = '#fafafa';
        context.strokeStyle = '#d9d9d9';
        context.beginPath();
        context.roundRect(0.5, 0.5, data.width - 1, data.height - 1, 8);
        context.fill();
        context.stroke();
        context.strokeStyle = data.label.resolved ? '#61c200' : '#ff4136';
        const cy = data.height / 2;
        context.beginPath();
        context.arc(13, cy, 5, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        if (data.label.resolved) {
            context.moveTo(10, cy);
            context.lineTo(12, cy + 2);
            context.lineTo(16, cy - 2);
        } else {
            context.moveTo(11, cy - 2);
            context.lineTo(15, cy + 2);
            context.moveTo(15, cy - 2);
            context.lineTo(11, cy + 2);
        }
        context.stroke();
        context.font = data.label.font;
        context.fillStyle = '#303030';
        context.textBaseline = 'middle';
        let { text } = data.label;
        const available = Math.max(0, data.width - 32);
        if (context.measureText(text).width > available) {
            while (text && context.measureText(`${text}…`).width > available) text = text.slice(0, -1);
            text += '…';
        }
        context.fillText(text, 24, cy);
    } else {
        const handle = data.corner !== undefined;
        if (handle) {
            context.fillStyle = '#fff';
            context.strokeStyle = 'red';
        } else {
            context.fillStyle = data.highlighted ? '#40a9ff' : '#d9b300';
            context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        }
        context.beginPath();
        context.arc(data.width / 2, data.height / 2, handle ? (data.width - 1) / 2 : 4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export class IssueSprites {
    private sprites = new Map<string, { sprite: THREE.Sprite; data: IssueSprite; signature: string }>();

    public constructor(private scenes: Record<ViewType, THREE.Scene>) {}

    public setup(items: IssueSprite[]): void {
        const keys = new Set<string>();
        const pixelRatio = displayPixelRatio();
        for (const data of items) {
            const handle = data.corner !== undefined;
            const kind = data.label ? 'label' : 'point';
            const key = `${data.view}:${data.id}:${handle ? `handle-${data.corner}` : kind}`;
            keys.add(key);
            const signature = JSON.stringify([
                pixelRatio, data.width, data.height, !data.label && !handle && data.highlighted,
                data.label?.text, data.label?.resolved, data.label?.font,
            ]);
            let entry = this.sprites.get(key);
            if (!entry) {
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                    depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false,
                }));
                sprite.name = `cvat-issue-sprite-${key}`;
                sprite.frustumCulled = false;
                // HTML handles review interaction; sprites must not intercept annotation drawing rays.
                sprite.raycast = () => {};
                this.scenes[data.view].add(sprite);
                entry = { sprite, data, signature: '' };
                this.sprites.set(key, entry);
            }
            if (entry.signature !== signature) {
                entry.sprite.material.map?.dispose();
                entry.sprite.material.map = spriteTexture(data, pixelRatio);
                entry.sprite.material.needsUpdate = true;
                entry.signature = signature;
            }
            entry.sprite.renderOrder = data.label ? 101 + data.label.order : 100;
            entry.sprite.center.set(
                (data.label ? 0 : 0.5) - data.offset[0] / data.width,
                (data.label ? 1 : 0.5) + data.offset[1] / data.height,
            );
            entry.data = data;
        }
        for (const [key, { sprite }] of this.sprites) {
            if (!keys.has(key)) {
                sprite.removeFromParent();
                sprite.material.map?.dispose();
                sprite.material.dispose();
                this.sprites.delete(key);
            }
        }
    }

    public update(view: ViewType, camera: THREE.Camera, height: number): void {
        if (!height) return;
        for (const { sprite, data } of this.sprites.values()) {
            if (data.view !== view) continue;
            sprite.position.fromArray(data.position);
            // Orthographic review points remain movable outside the selected annotation's depth slice.
            if (camera instanceof THREE.OrthographicCamera) {
                sprite.position.project(camera).setZ(0).unproject(camera);
            }
            const unitsPerPixel = 2 / (camera.projectionMatrix.elements[5] * height);
            sprite.scale.set(data.width * unitsPerPixel, data.height * unitsPerPixel, 1);
        }
    }
}
