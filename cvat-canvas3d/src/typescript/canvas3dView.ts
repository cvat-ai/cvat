// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CameraControls from 'camera-controls';
import { Canvas3dController } from './canvas3dController';
import { Listener, Master } from './master';

import { Canvas3dModel, UpdateReasons, Mode } from './canvas3dModel';

export interface Canvas3dView {
    html(): ViewsDOM;
    render(): void;
    keyControls(keys: any): void;
}

const CAMERA_ACTION = Object.freeze({
    ZOOM_IN: 'KeyI',
    MOVE_UP: 'KeyU',
    MOVE_DOWN: 'KeyO',
    MOVE_LEFT: 'KeyJ',
    ZOOM_OUT: 'KeyK',
    MOVE_RIGHT: 'KeyL',
    TILT_UP: 'ArrowUp',
    TILT_DOWN: 'ArrowDown',
    ROTATE_RIGHT: 'ArrowRight',
    ROTATE_LEFT: 'ArrowLeft',
});

export interface Views {
    perspective: RenderView;
    top: RenderView;
    side: RenderView;
    front: RenderView;
}

export interface RenderView {
    renderer: any;
    scene: any;
    camera?: any;
    controls?: any;
}

export interface ViewsDOM {
    perspective: HTMLDivElement;
    top: HTMLDivElement;
    side: HTMLDivElement;
    front: HTMLDivElement;
}

export class Canvas3dViewImpl implements Canvas3dView, Listener {
    private controller: Canvas3dController;
    private views: Views;
    private clock: any;
    private speed: number;

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    public constructor(model: Canvas3dModel & Master, controller: Canvas3dController) {
        this.controller = controller;
        this.clock = new THREE.Clock();
        this.speed = 50;

        this.views = {
            perspective: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
            },
            top: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
            },
            side: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
            },
            front: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
            },
        };
        CameraControls.install({ THREE });

        this.mode = Mode.IDLE;

        this.views.perspective.scene.background = new THREE.Color(0x000000);
        this.views.top.scene.background = new THREE.Color(0x000000);
        this.views.side.scene.background = new THREE.Color(0x000000);
        this.views.front.scene.background = new THREE.Color(0x000000);

        const viewSize = 7;
        const height = window.innerHeight;
        const width = window.innerWidth;
        const aspectRatio = window.innerWidth / window.innerHeight;

        this.clock = new THREE.Clock();
        // setting up the camera and adding it in the scene
        this.views.perspective.camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 500);
        this.views.perspective.camera.position.set(-15, 0, 4);
        this.views.perspective.camera.up.set(0, 0, 1);
        this.views.perspective.camera.lookAt(10, 0, 0);

        this.views.top.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2 - 2,
            (aspectRatio * viewSize) / 2 + 2,
            viewSize / 2 + 2,
            -viewSize / 2 - 2,
            -10,
            10,
        );

        this.views.side.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -10,
            10,
        );
        this.views.side.camera.position.set(0, 5, 0);
        this.views.side.camera.lookAt(0, 0, 0);
        this.views.side.camera.up.set(0, 0, 1);

        this.views.front.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -10,
            10,
        );
        this.views.front.camera.position.set(-7, 0, 0);
        this.views.front.camera.up.set(0, 0, 1);
        this.views.front.camera.lookAt(0, 0, 0);

        this.views.perspective.renderer.setSize(width, height);
        this.views.top.renderer.setSize(width, height);
        this.views.side.renderer.setSize(width, height);
        this.views.front.renderer.setSize(width, height);

        this.views.perspective.controls = new CameraControls(
            this.views.perspective.camera,
            this.views.perspective.renderer.domElement,
        );

        this.views.side.controls = new OrbitControls(this.views.side.camera, this.views.side.renderer.domElement);
        this.views.side.controls.minDistance = 0;
        this.views.side.controls.maxDistance = 100;
        this.views.side.controls.enableRotate = false;
        this.views.side.controls.enablePan = false;

        this.views.front.controls = new OrbitControls(this.views.front.camera, this.views.front.renderer.domElement);
        this.views.front.controls.minDistance = 0;
        this.views.front.controls.maxDistance = 100;
        this.views.front.controls.enableRotate = false;
        this.views.front.controls.enablePan = false;

        this.views.top.controls = new OrbitControls(this.views.top.camera, this.views.top.renderer.domElement);
        this.views.top.controls.minDistance = 0;
        this.views.top.controls.maxDistance = 100;
        this.views.top.controls.enableRotate = false;
        this.views.top.controls.enablePan = false;

        this.views.perspective.renderer.render(this.views.perspective.scene, this.views.perspective.camera);

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
            this.views.perspective.renderer.domElement.dispatchEvent(event);
        }
    }

    private clearScene(): void {
        for (let i = this.views.perspective.scene.children.length - 1; i >= 0; i--) {
            this.views.perspective.scene.remove(this.views.perspective.scene.children[i]);
            this.views.top.scene.remove(this.views.top.scene.children[i]);
            this.views.side.scene.remove(this.views.side.scene.children[i]);
            this.views.front.scene.remove(this.views.front.scene.children[i]);
        }
    }

    private addScene(points: any): void {
        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.03;
        // eslint-disable-next-line no-param-reassign
        points.material.color = new THREE.Color(0x0000ff);
        this.views.perspective.scene.add(points);
        this.views.top.scene.add(points.clone());
        this.views.side.scene.add(points.clone());
        this.views.front.scene.add(points.clone());
    }

    private static resizeRendererToDisplaySize(view: RenderView): void {
        const canvas = view.renderer.domElement;
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        const needResize = canvas.clientWidth !== width || canvas.clientHeight !== height;
        if (needResize) {
            // eslint-disable-next-line no-param-reassign
            view.camera.aspect = width / height;
            view.camera.updateProjectionMatrix();
            view.renderer.setSize(width, height);
        }
    }

    public render(): void {
        this.views.perspective.controls.update(this.clock.getDelta());
        this.views.side.controls.update();
        this.views.top.controls.update();
        this.views.front.controls.update();
        Canvas3dViewImpl.resizeRendererToDisplaySize(this.views.perspective);
        Canvas3dViewImpl.resizeRendererToDisplaySize(this.views.top);
        Canvas3dViewImpl.resizeRendererToDisplaySize(this.views.side);
        Canvas3dViewImpl.resizeRendererToDisplaySize(this.views.front);
        this.views.perspective.renderer.render(this.views.perspective.scene, this.views.perspective.camera);
        this.views.top.renderer.render(this.views.top.scene, this.views.top.camera);
        this.views.side.renderer.render(this.views.side.scene, this.views.side.camera);
        this.views.front.renderer.render(this.views.front.scene, this.views.front.camera);
    }

    public keyControls(key: any): void {
        if (key.altKey === true) {
            switch (key.code) {
                case CAMERA_ACTION.ZOOM_IN:
                    this.views.perspective.controls.dolly(5, true);
                    break;
                case CAMERA_ACTION.ZOOM_OUT:
                    this.views.perspective.controls.dolly(-5, true);
                    break;
                case CAMERA_ACTION.MOVE_LEFT:
                    this.views.perspective.controls.truck(-0.01 * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.MOVE_RIGHT:
                    this.views.perspective.controls.truck(0.01 * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.MOVE_DOWN:
                    this.views.perspective.controls.truck(0, -0.01 * this.speed, true);
                    break;
                case CAMERA_ACTION.MOVE_UP:
                    this.views.perspective.controls.truck(0, 0.01 * this.speed, true);
                    break;
                default:
                    break;
            }
        } else {
            switch (key.code) {
                case CAMERA_ACTION.ROTATE_RIGHT:
                    this.views.perspective.controls.rotate(0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.ROTATE_LEFT:
                    this.views.perspective.controls.rotate(-0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.TILT_UP:
                    this.views.perspective.controls.rotate(0, -0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                    break;
                case CAMERA_ACTION.TILT_DOWN:
                    this.views.perspective.controls.rotate(0, 0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                    break;
                default:
                    break;
            }
        }
    }

    public html(): ViewsDOM {
        return {
            perspective: this.views.perspective.renderer.domElement,
            top: this.views.top.renderer.domElement,
            side: this.views.side.renderer.domElement,
            front: this.views.front.renderer.domElement,
        };
    }
}
