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
    Canvas3dModel, DrawData, Mode, UpdateReasons, ViewType,
} from './canvas3dModel';
import { createRotationHelper, CuboidModel, setTranslationHelper } from './cuboid';

export interface Canvas3dView {
    html(): ViewsDOM;
    render(): void;
    keyControls(keys: KeyboardEvent): void;
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
    private model: Canvas3dModel & Master;
    private action: any;

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
        this.cube = new CuboidModel('line', '#ffffff');
        this.highlighted = false;
        this.selected = this.cube;
        this.model = model;
        this.action = {
            topScan: false,
            translation: {
                status: false,
                helper: null,
            },
            rotation: {
                status: false,
                helper: null,
            },
            resize: {
                status: false,
                helper: null,
            },
        };

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
                rayCaster: {
                    renderer: new THREE.Raycaster(),
                    mouseVector: new THREE.Vector2(),
                },

            },
            side: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
                rayCaster: {
                    renderer: new THREE.Raycaster(),
                    mouseVector: new THREE.Vector2(),
                },
            },
            front: {
                renderer: new THREE.WebGLRenderer({ antialias: true }),
                scene: new THREE.Scene(),
                rayCaster: {
                    renderer: new THREE.Raycaster(),
                    mouseVector: new THREE.Vector2(),
                },
            },
        };
        CameraControls.install({ THREE });

        this.views.perspective.renderer.domElement.addEventListener('contextmenu', (e: MouseEvent): void => {
            if (this.controller.focused.clientID !== null) {
                const event: CustomEvent = new CustomEvent('canvas.contextmenu', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        clientID: this.controller.focused.clientID,
                        clientX: e.clientX,
                        clientY: e.clientY,
                    },
                });
                this.views.perspective.renderer.domElement.dispatchEvent(event);
            }
        });

        this.views.top.renderer.domElement.addEventListener('mousedown', (event: MouseEvent): void => {
            const canvas = this.views.top.renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const { mouseVector } = this.views.top.rayCaster;
            mouseVector.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
            mouseVector.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
            this.action.topScan = true;
        });

        this.views.top.renderer.domElement.addEventListener('mousemove', (event: MouseEvent): void => {
            event.preventDefault();
            if (!this.action.topScan) return;
            const canvas = this.views.top.renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const { mouseVector } = this.views.top.rayCaster;
            mouseVector.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
            mouseVector.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
        });

        this.views.top.renderer.domElement.addEventListener('mouseup', (): void => {
            this.action = {
                topScan: false,
                translation: {
                    status: false,
                    helper: null,
                },
                rotation: {
                    status: false,
                    helper: null,
                },
                resize: {
                    status: false,
                    helper: null,
                },
            };
        });

        this.views.perspective.renderer.domElement.addEventListener('mousemove', (event: MouseEvent): void => {
            event.preventDefault();
            if (this.mode === Mode.DRAG_CANVAS) return;
            const canvas = this.views.perspective.renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const { mouseVector } = this.views.perspective.rayCaster;
            mouseVector.x = ((event.clientX - (canvas.offsetLeft + rect.left)) / canvas.clientWidth) * 2 - 1;
            mouseVector.y = -((event.clientY - (canvas.offsetTop + rect.top)) / canvas.clientHeight) * 2 + 1;
        });

        this.views.perspective.renderer.domElement.addEventListener('click', (e: MouseEvent): void => {
            e.preventDefault();
            if (this.mode !== Mode.IDLE) return;
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children[0].children,
                false,
            );
            if (intersects.length !== 0) {
                const event: CustomEvent = new CustomEvent('canvas.selected', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        clientID: intersects[0].object.name,
                    },
                });
                this.views.perspective.renderer.domElement.dispatchEvent(event);
            }
        });

        this.views.perspective.renderer.domElement.addEventListener('dblclick', (e: MouseEvent): void => {
            e.preventDefault();
            if (this.mode !== Mode.DRAW) return;
            this.controller.drawData.enabled = false;
            this.mode = Mode.IDLE;
            // @ts-ignore
            const { x, y, z } = this.cube.perspective.position;
            // @ts-ignore
            const { width, height, depth } = this.cube.perspective.geometry.parameters;
            // @ts-ignore
            const { _x: rotationX, _y: rotationY, _x: rotationZ } = this.cube.perspective.rotation;
            const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
            if (this.model.data.drawData.initialState) {
                const event: CustomEvent = new CustomEvent('canvas.drawn', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        state: {
                            shapeType: this.model.data.drawData.initialState.shapeType,
                            objectType: this.model.data.drawData.initialState.objectType,
                            points,
                            occluded: this.model.data.drawData.initialState.occluded,
                            attributes: { ...this.model.data.drawData.initialState.attributes },
                            label: this.model.data.drawData.initialState.label,
                            color: this.model.data.drawData.initialState.color,
                            zOrder: 0 || 0,
                        },
                        continue: undefined,
                        duration: 0,
                    },
                });
                this.views.perspective.renderer.domElement.dispatchEvent(event);
            } else {
                const event: CustomEvent = new CustomEvent('canvas.drawn', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        state: {
                            shapeType: 'cuboid',
                            frame: this.model.data.imageID,
                            points,
                            zOrder: 0 || 0,
                        },
                        continue: undefined,
                        duration: 0,
                    },
                });
                this.views.perspective.renderer.domElement.dispatchEvent(event);
            }
            const cancelEvent: CustomEvent = new CustomEvent('canvas.canceled');
            this.views.perspective.renderer.domElement.dispatchEvent(cancelEvent);
        });


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

        this.views.top.camera.position.set(0, 0, 5);
        this.views.top.camera.lookAt(0, 0, 0);
        this.views.top.camera.up.set(0, 0, 1);

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
            loader.load(objectURL, this.addScene.bind(this, model));
            URL.revokeObjectURL(objectURL);
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.views.perspective.renderer.domElement.dispatchEvent(event);
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            const { clientID } = this.model.data.activeElement;
            Object.keys(this.views).forEach((view: string): void => {
                const viewType = this.views[view as keyof Views];
                // @ts-ignore
                const object = viewType.scene.getObjectByName(clientID);
                if (view !== ViewType.PERSPECTIVE) {
                    if (object !== undefined) {
                        viewType.controls.fitToBox(object, false);
                        viewType.controls.zoom(-4, false);
                    }
                }
            });
            this.model.updateObject();
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled && this.mode === Mode.IDLE) {
                this.mode = Mode.DRAW;
                this.cube = new CuboidModel('line', '#ffffff');
                this.views.perspective.renderer.domElement.style.cursor = 'copy';
            } else if (this.mode !== Mode.IDLE) {
                this.cube = new CuboidModel('line', '#ffffff');
            }
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            if (this.views.perspective.scene.children[0]) {
                const {
                    opacity,
                    outlined,
                    outlineColor,
                    selectedOpacity,
                    colorBy,
                } = this.model.data.shapeProperties;
                this.views.perspective.scene.children[0].children = [];
                this.views.top.scene.children[0].children = [];
                this.views.side.scene.children[0].children = [];
                this.views.front.scene.children[0].children = [];
                for (let i = 0; i < model.data.objects.length; i++) {
                    const object = model.data.objects[i];
                    if (object.hidden) {
                        continue;
                    }
                    const cuboid = new CuboidModel(object.occluded ? 'dashed' : 'line',
                        outlined ? outlineColor : '#ffffff');
                    cuboid.setName(object.clientID);
                    let color = '';
                    if (colorBy === 'Label') {
                        // eslint-disable-next-line prefer-destructuring
                        color = object.label.color;
                    } else if (colorBy === 'Instance') {
                        // eslint-disable-next-line prefer-destructuring
                        color = object.color;
                    } else {
                        // eslint-disable-next-line prefer-destructuring
                        color = object.group.color;
                    }
                    cuboid.setOriginalColor(color);
                    cuboid.setColor(color);
                    cuboid.setOpacity(opacity);
                    if (this.model.data.activeElement.clientID === object.clientID) {
                        cuboid.setOpacity(selectedOpacity);
                        if (!object.lock) {
                            createRotationHelper(cuboid.top, ViewType.TOP);
                            createRotationHelper(cuboid.side, ViewType.SIDE);
                            createRotationHelper(cuboid.front, ViewType.FRONT);
                            setTranslationHelper(cuboid.top);
                            setTranslationHelper(cuboid.side);
                            setTranslationHelper(cuboid.front);
                        }
                        this.model.data.selected = cuboid;
                    } else {
                        cuboid.top.visible = false;
                        cuboid.side.visible = false;
                        cuboid.front.visible = false;
                    }
                    this.views.perspective.scene.children[0].add(cuboid.perspective);
                    this.views.top.scene.children[0].add(cuboid.top);
                    this.views.side.scene.children[0].add(cuboid.side);
                    this.views.front.scene.children[0].add(cuboid.front);
                    cuboid.setPosition(object.points[0],
                        object.points[1], object.points[2]);
                }
            }
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            if (this.mode === Mode.DRAG_CANVAS) {
                this.views.perspective.renderer.domElement.dispatchEvent(
                    new CustomEvent('canvas.dragstart', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            } else {
                this.views.perspective.renderer.domElement.dispatchEvent(
                    new CustomEvent('canvas.dragstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            }
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.controller.drawData.enabled = false;
                Object.keys(this.views).forEach((view: string): void => {
                    this.views[view as keyof Views].scene.children[0].remove(this.cube[view as keyof Views]);
                });
            }
            this.views.perspective.renderer.domElement.style.cursor = '';
            this.mode = Mode.IDLE;
            const event: CustomEvent = new CustomEvent('canvas.canceled');
            this.views.perspective.renderer.domElement.dispatchEvent(event);
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            const event: CustomEvent = new CustomEvent('canvas.fit');
            this.views.perspective.renderer.domElement.dispatchEvent(event);
        }
    }

    private clearScene(): void {
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children = [];
        });
    }

    private addScene(model: Canvas3dModel & Master, points: any): void {
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
        model.updateObject();
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
                const topViewFactor = 0;
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
                const clientID = intersects[0].object.name;
                if (clientID === undefined || clientID === ''
                    || this.model.data.focusData.clientID === clientID) return;
                const object = this.views.perspective.scene.getObjectByName(clientID);
                if (object === undefined) return;
                this.model.data.focusData.clientID = clientID;
                // @ts-ignore
                object.material.color.set('#ffffff');
            } else if (this.model.data.focusData.clientID !== null) {
                try {
                    const object = this.views.perspective.scene.getObjectByName(
                        this.model.data.focusData.clientID,
                    );
                    // @ts-ignore
                    object.material.color.set(object.originalColor);
                } catch {
                    this.model.data.focusData.clientID = null;
                }
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
            if (this.controller.activeElement.clientID !== null && view !== ViewType.PERSPECTIVE) {
                if (this.action.topScan && view === ViewType.TOP) {
                    viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector,
                        viewType.camera);
                    const intersectsBox = viewType.rayCaster.renderer.intersectObjects(
                        this.views.top.scene.children, false,
                    );
                    if (intersectsBox.length !== 0) {
                        this.action.translation.status = true;
                    }
                }
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

    public html(): ViewsDOM {
        return {
            perspective: this.views.perspective.renderer.domElement,
            top: this.views.top.renderer.domElement,
            side: this.views.side.renderer.domElement,
            front: this.views.front.renderer.domElement,
        };
    }
}
