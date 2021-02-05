// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { Canvas3dController } from './canvas3dController';
import { Listener, Master } from './master';

import { Canvas3dModel, UpdateReasons, Mode } from './canvas3dModel';

export interface Canvas3dView {
    html(): HTMLDivElement;
    render(): void;
}

export class Canvas3dViewImpl implements Canvas3dView, Listener {
    private controller: Canvas3dController;
    private renderer: any;
    private scene: any;
    private camera: any;

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    public constructor(model: Canvas3dModel & Master, controller: Canvas3dController) {
        this.controller = controller;

        this.mode = Mode.IDLE;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // setting up the camera and adding it in the scene
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 500);
        this.camera.position.set(-15, 0, 4);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        model.subscribe(this);
    }

    public notify(model: Canvas3dModel & Master, reason: UpdateReasons): void {
        if (reason === UpdateReasons.IMAGE_CHANGED) {
            const loader = new PCDLoader();
            this.clearScene();
            const objectURL = URL.createObjectURL(model.data.image.imageData);
            loader.load(objectURL, this.addScene.bind(this));
            URL.revokeObjectURL(objectURL);
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.renderer.domElement.dispatchEvent(event);
        }
    }

    private clearScene(): void {
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            this.scene.remove(this.scene.children[i]);
        }
    }

    private addScene(points: any): void {
        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.03;
        // eslint-disable-next-line no-param-reassign
        points.material.color = new THREE.Color(0x0000ff);
        this.scene.add(points);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public html(): any {
        return this.renderer.domElement;
    }
}
