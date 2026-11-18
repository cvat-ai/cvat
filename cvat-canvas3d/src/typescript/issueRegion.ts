// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { disposeObjectResources } from './utils';

export const ISSUE_REGION_NAME = 'cvat-issue-region';

export interface IssueRegion {
    highlighted: boolean;
}

export function setIssueRegion(mesh: THREE.Mesh, region: IssueRegion | null): void {
    if (!mesh) return;
    let overlay = mesh.getObjectByName(ISSUE_REGION_NAME) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    if (!region) {
        if (overlay) {
            mesh.remove(overlay);
            disposeObjectResources(overlay);
        }
        return;
    }

    if (!overlay) {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                regionColor: { value: new THREE.Color() },
                regionOpacity: { value: 0.2 },
            },
            vertexShader: `
                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 regionColor;
                uniform float regionOpacity;
                void main() {
                    gl_FragColor = vec4(regionColor, regionOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: false,
        });
        overlay = new THREE.Mesh(mesh.geometry.clone(), material);
        overlay.name = ISSUE_REGION_NAME;
        overlay.renderOrder = 2;
        overlay.onBeforeRender = (): void => {
            const annotationMaterial = mesh.material as THREE.MeshBasicMaterial;
            overlay.material.uniforms.regionOpacity.value = Math.max(annotationMaterial.opacity, 0.2);
        };
        mesh.add(overlay);
    }

    // Use one translucent color so points stay visible without a striped pattern.
    overlay.material.uniforms.regionColor.value.set(region.highlighted ? 'yellow' : 'red');
}
