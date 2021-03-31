// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import CameraControls from 'camera-controls';
import { Canvas3dController } from './canvas3dController';
import { Listener, Master } from './master';
import CONST from './consts';
import {
    Canvas3dModel, UpdateReasons, Mode, DrawData, ViewType, MouseInteraction,
} from './canvas3dModel';
import { CuboidModel } from './cuboid';

export interface Canvas3dView {
    html(): ViewsDOM;
    render(): void;
    keyControls(keys: KeyboardEvent): void;
    mouseControls(type: MouseInteraction, event: MouseEvent): void;
}

export enum CAMERA_ACTION {
    ZOOM_IN = 'KeyI',
    MOVE_UP = 'KeyU',
    MOVE_DOWN = 'KeyO',
    MOVE_LEFT = 'KeyJ',
    ZOOM_OUT = 'KeyK',
    MOVE_RIGHT = 'KeyL',
    TILT_UP = 'ArrowUp',
    TILT_DOWN = 'ArrowDown',
    ROTATE_RIGHT = 'ArrowRight',
    ROTATE_LEFT = 'ArrowLeft',
}

export interface RayCast {
    renderer: THREE.Raycaster;
    mouseVector: THREE.Vector2;
}

export interface Views {
    perspective: RenderView;
    top: RenderView;
    side: RenderView;
    front: RenderView;
}

export interface CubeObject {
    perspective: THREE.Mesh;
    top: THREE.Mesh;
    side: THREE.Mesh;
    front: THREE.Mesh;
}

export interface RenderView {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    controls?: CameraControls;
    rayCaster?: RayCast;
}

export interface ViewsDOM {
    perspective: HTMLCanvasElement;
    top: HTMLCanvasElement;
    side: HTMLCanvasElement;
    front: HTMLCanvasElement;
}

export class Canvas3dViewImpl implements Canvas3dView, Listener {
    private controller: Canvas3dController;
    private views: Views;
    private clock: THREE.Clock;
    private speed: number;
    private cube: CuboidModel;
    private highlighted: boolean;
    private selected: CubeObject;

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    public constructor(model: Canvas3dModel & Master, controller: Canvas3dController) {
        this.controller = controller;
        this.clock = new THREE.Clock();
        this.speed = CONST.MOVEMENT_FACTOR;
        this.cube = new CuboidModel();
        this.highlighted = false;
        this.selected = this.cube;

        this.views = {
            perspective: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
                rayCaster: {
                    renderer: new THREE.Raycaster(),
                    mouseVector: new THREE.Vector2(),
                },
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

        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.background = new THREE.Color(0x000000);
        });

        const viewSize = CONST.ZOOM_FACTOR;
        const height = window.innerHeight;
        const width = window.innerWidth;
        const aspectRatio = window.innerWidth / window.innerHeight;

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

        Object.keys(this.views).forEach((view: string): void => {
            const viewType = this.views[view as keyof Views];
            viewType.renderer.setSize(width, height);
            if (view !== ViewType.PERSPECTIVE) {
                viewType.controls = new CameraControls(viewType.camera, viewType.renderer.domElement);
                viewType.controls.mouseButtons.left = CameraControls.ACTION.NONE;
                viewType.controls.mouseButtons.right = CameraControls.ACTION.NONE;
            } else {
                viewType.controls = new CameraControls(viewType.camera, viewType.renderer.domElement);
            }
            viewType.controls.minDistance = CONST.MIN_DISTANCE;
            viewType.controls.maxDistance = CONST.MAX_DISTANCE;
        });

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
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled && this.mode === Mode.IDLE) {
                this.mode = Mode.DRAW;
                this.cube = new CuboidModel();
            } else if (this.mode !== Mode.IDLE) {
                this.cube = new CuboidModel();
            }
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.controller.drawData.enabled = false;
                Object.keys(this.views).forEach((view: string): void => {
                    this.views[view as keyof Views].scene.children[0].remove(this.cube[view as keyof Views]);
                });
            }
            this.mode = Mode.IDLE;
            const event: CustomEvent = new CustomEvent('canvas.canceled');
            this.views.perspective.renderer.domElement.dispatchEvent(event);
        }
    }

    private clearScene(): void {
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children = [];
        });
    }

    private addScene(points: any): void {
        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.08;
        // eslint-disable-next-line no-param-reassign
        points.material.color = new THREE.Color(0x0000ff);
        const sphereCenter = points.geometry.boundingSphere.center;
        const { radius } = points.geometry.boundingSphere;
        const xRange = -radius / 2 < this.views.perspective.camera.position.x - sphereCenter.x
            && radius / 2 > this.views.perspective.camera.position.x - sphereCenter.x;
        const yRange = -radius / 2 < this.views.perspective.camera.position.y - sphereCenter.y
            && radius / 2 > this.views.perspective.camera.position.y - sphereCenter.y;
        const zRange = -radius / 2 < this.views.perspective.camera.position.z - sphereCenter.z
            && radius / 2 > this.views.perspective.camera.position.z - sphereCenter.z;
        let newX = 0;
        let newY = 0;
        let newZ = 0;
        if (!xRange) {
            newX = sphereCenter.x;
        }
        if (!yRange) {
            newY = sphereCenter.y;
        }
        if (!zRange) {
            newZ = sphereCenter.z;
        }
        if (newX || newY || newZ) {
            this.positionAllViews(newX, newY, newZ);
        }
        this.views.perspective.scene.add(points);
        this.views.top.scene.add(points.clone());
        this.views.side.scene.add(points.clone());
        this.views.front.scene.add(points.clone());
    }

    private positionAllViews(x: number, y: number, z: number): void {
        this.views.perspective.controls.setLookAt(x - 8, y - 8, z + 3, x, y, z, false);
        this.views.top.controls.setLookAt(x, y, z + 8, x, y, z, false);
        this.views.side.controls.setLookAt(x, y + 8, z, x, y, z, false);
        this.views.front.controls.setLookAt(x + 8, y, z, x, y, z, false);
    }

    private static resizeRendererToDisplaySize(viewName: string, view: RenderView): void {
        const { camera, renderer } = view;
        const canvas = renderer.domElement;
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        const needResize = canvas.clientWidth !== width || canvas.clientHeight !== height;
        if (needResize) {
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = width / height;
            } else {
                const topViewFactor = 0; // viewName === ViewType.TOP ? 2 : 0;
                const viewSize = CONST.ZOOM_FACTOR;
                const aspectRatio = width / height;
                if (!(camera instanceof THREE.PerspectiveCamera)) {
                    camera.left = (-aspectRatio * viewSize) / 2 - topViewFactor;
                    camera.right = (aspectRatio * viewSize) / 2 + topViewFactor;
                    camera.top = viewSize / 2 + topViewFactor;
                    camera.bottom = -viewSize / 2 - topViewFactor;
                }
                camera.near = -10;
                camera.far = 10;
            }
            view.renderer.setSize(width, height);
            view.camera.updateProjectionMatrix();
        }
    }

    private renderRayCaster = (viewType: RenderView): void => {
        viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector, viewType.camera);
        if (this.mode === Mode.DRAW) {
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children,
                false,
            );
            if (intersects.length > 0) {
                this.views.perspective.scene.children[0].add(this.cube.perspective);
                const newPoints = intersects[0].point;
                this.cube.perspective.position.copy(newPoints);
            }
        } else if (this.mode === Mode.IDLE) {
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children[0].children,
                false,
            );
            if (intersects.length !== 0) {
                this.views.perspective.scene.children[0].children.forEach((sceneItem: THREE.Mesh): void => {
                    if (this.selected.perspective !== sceneItem) {
                        // eslint-disable-next-line no-param-reassign
                        sceneItem.material.color = new THREE.Color(0xff0000);
                    }
                });
                const selectedObject = intersects[0].object as THREE.Mesh;
                if (this.selected.perspective !== selectedObject) {
                    selectedObject.material.color = new THREE.Color(0xffff00);
                    this.highlighted = true;
                }
            } else {
                if (this.highlighted) {
                    this.views.perspective.scene.children[0].children.forEach((sceneItem: THREE.Mesh): void => {
                        if (this.selected.perspective !== sceneItem) {
                            // eslint-disable-next-line no-param-reassign
                            sceneItem.material.color = new THREE.Color(0xff0000);
                        }
                    });
                }
                this.highlighted = false;
            }
        }
    };

    public render(): void {
        Object.keys(this.views).forEach((view: string): void => {
            const viewType = this.views[view as keyof Views];
            Canvas3dViewImpl.resizeRendererToDisplaySize(view, viewType);
            viewType.controls.update(this.clock.getDelta());
            viewType.renderer.render(viewType.scene, viewType.camera);
            if (view === ViewType.PERSPECTIVE && viewType.scene.children.length !== 0) {
                this.renderRayCaster(viewType);
            }
        });
    }

    public keyControls(key: any): void {
        const { controls } = this.views.perspective;
        switch (key.code) {
            case CAMERA_ACTION.ROTATE_RIGHT:
                controls.rotate(0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                break;
            case CAMERA_ACTION.ROTATE_LEFT:
                controls.rotate(-0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                break;
            case CAMERA_ACTION.TILT_UP:
                controls.rotate(0, -0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                break;
            case CAMERA_ACTION.TILT_DOWN:
                controls.rotate(0, 0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                break;
            default:
                break;
        }
        if (key.altKey === true) {
            switch (key.code) {
                case CAMERA_ACTION.ZOOM_IN:
                    controls.dolly(CONST.DOLLY_FACTOR, true);
                    break;
                case CAMERA_ACTION.ZOOM_OUT:
                    controls.dolly(-CONST.DOLLY_FACTOR, true);
                    break;
                case CAMERA_ACTION.MOVE_LEFT:
                    controls.truck(-0.01 * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.MOVE_RIGHT:
                    controls.truck(0.01 * this.speed, 0, true);
                    break;
                case CAMERA_ACTION.MOVE_DOWN:
                    controls.truck(0, -0.01 * this.speed, true);
                    break;
                case CAMERA_ACTION.MOVE_UP:
                    controls.truck(0, 0.01 * this.speed, true);
                    break;
                default:
                    break;
            }
        }
    }

    public mouseControls(type: MouseInteraction, event: MouseEvent): void {
        event.preventDefault();
        if (type === MouseInteraction.DOUBLE_CLICK && this.mode === Mode.DRAW) {
            this.controller.drawData.enabled = false;
            this.mode = Mode.IDLE;
            const cancelEvent: CustomEvent = new CustomEvent('canvas.canceled');
            this.views.perspective.renderer.domElement.dispatchEvent(cancelEvent);
        } else {
            const canvas = this.views.perspective.renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const { mouseVector } = this.views.perspective.rayCaster;
            mouseVector.x = ((event.clientX - (canvas.offsetLeft + rect.left)) / canvas.clientWidth) * 2 - 1;
            mouseVector.y = -((event.clientY - (canvas.offsetTop + rect.top)) / canvas.clientHeight) * 2 + 1;

            if (type === MouseInteraction.CLICK && this.mode === Mode.IDLE) {
                const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                    this.views.perspective.scene.children[0].children,
                    false,
                );
                if (intersects.length !== 0) {
                    this.views.perspective.scene.children[0].children.forEach((sceneItem: THREE.Mesh): void => {
                        // eslint-disable-next-line no-param-reassign
                        sceneItem.material.color = new THREE.Color(0xff0000);
                    });
                    const selectedObject = intersects[0].object;
                    selectedObject.material.color = new THREE.Color(0x00ffff);
                    Object.keys(this.views).forEach((view: string): void => {
                        if (view !== ViewType.PERSPECTIVE) {
                            this.views[view as keyof Views].scene.children[0].children = [selectedObject.clone()];
                            this.views[view as keyof Views].controls.fitToBox(selectedObject, false);
                            this.views[view as keyof Views].controls.zoom(view === ViewType.TOP ? -5 : -5, false);
                        }
                        this.views[view as keyof Views].scene.background = new THREE.Color(0x000000);
                    });
                    this.selected.perspective = selectedObject as THREE.Mesh;
                }
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
