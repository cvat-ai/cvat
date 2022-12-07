// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import CameraControls from 'camera-controls';
import { Canvas3dController } from './canvas3dController';
import { Listener, Master } from './master';
import CONST from './consts';
import {
    Canvas3dModel, DrawData, Mode, Planes, UpdateReasons, ViewType,
} from './canvas3dModel';
import {
    createRotationHelper, removeRotationHelper,
    createResizeHelper, removeResizeHelper,
    createCuboidEdges, removeCuboidEdges, CuboidModel, cuboidSize, makeCornerPointsMatrix,
} from './cuboid';
import { ObjectState } from '.';

export interface Canvas3dView {
    html(): ViewsDOM;
    render(): void;
    keyControls(keys: KeyboardEvent): void;
}

export enum CameraAction {
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

export type Views = {
    [key in ViewType]: RenderView;
};

export type ViewsDOM = {
    [key in ViewType]: HTMLCanvasElement;
};

export interface RenderView {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    controls?: CameraControls;
    rayCaster?: {
        renderer: THREE.Raycaster;
        mouseVector: THREE.Vector2;
    };
}

interface DrawnObjectData {
    labelID: number;
    labelColor: string;
    points: number[];
    groupID: number | null;
    groupColor: string;
    color: string;
    occluded: boolean;
    outside: boolean;
    hidden: boolean;
    pinned: boolean;
    lock: boolean;
    updated: number;
}

const BOTTOM_VIEWS = [
    ViewType.TOP,
    ViewType.SIDE,
    ViewType.FRONT,
];

const ALL_VIEWS = [...BOTTOM_VIEWS, ViewType.PERSPECTIVE];

function drawnDataFromState(state: ObjectState): DrawnObjectData {
    return {
        labelID: state.label.id,
        labelColor: state.label.color,
        groupID: state.group?.id || null,
        groupColor: state.group?.color || '#ffffff',
        points: [...state.points],
        color: state.color,
        hidden: state.hidden,
        lock: state.lock,
        occluded: state.occluded,
        outside: state.outside,
        pinned: state.pinned,
        updated: state.updated,
    };
}

export class Canvas3dViewImpl implements Canvas3dView, Listener {
    private controller: Canvas3dController;
    private views: Views;
    private clock: THREE.Clock;
    private speed: number;
    private cube: CuboidModel;
    private isPerspectiveBeingDragged: boolean;
    private activatedElementID: number | null;
    private drawnObjects: Record<number, {
        data: DrawnObjectData;
        cuboid: CuboidModel;
    }>;
    private model: Canvas3dModel & Master;
    private action: any;
    private cameraSettings: {
        [key in ViewType]: {
            position: [number, number, number],
            lookAt: [number, number, number],
            up: [number, number, number],
        }
    };

    private get selectedCuboid(): CuboidModel | null {
        const { clientID } = this.model.data.activeElement;
        if (clientID !== null) {
            return this.drawnObjects[+clientID].cuboid || null;
        }

        return null;
    }

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
        this.isPerspectiveBeingDragged = false;
        this.activatedElementID = null;
        this.drawnObjects = {};
        this.model = model;
        this.cameraSettings = {
            perspective: {
                position: [-15, 0, 8],
                lookAt: [10, 0, 0],
                up: [0, 0, 1],
            },
            top: {
                position: [0, 0, 8],
                lookAt: [0, 0, 0],
                up: [0, 0, 1],
            },
            side: {
                position: [0, 8, 0],
                lookAt: [0, 0, 0],
                up: [0, 0, 1],
            },
            front: {
                position: [8, 0, 0],
                lookAt: [0, 0, 0],
                up: [0, 0, 1],
            },
        };

        this.action = {
            scan: null,
            frameCoordinates: {
                x: 0,
                y: 0,
                z: 0,
            },
            detected: false,
            initialMouseVector: new THREE.Vector2(),
            detachCam: false,
            detachCamRef: 'null',
            translation: {
                status: false,
                helper: null,
                coordinates: null,
                offset: new THREE.Vector3(),
                inverseMatrix: new THREE.Matrix4(),
            },
            rotation: {
                status: false,
                helper: null,
                recentMouseVector: new THREE.Vector2(0, 0),
                screenInit: {
                    x: 0,
                    y: 0,
                },
                screenMove: {
                    x: 0,
                    y: 0,
                },
            },
            resize: {
                status: false,
                helper: null,
                recentMouseVector: new THREE.Vector2(0, 0),
                initScales: {
                    x: 1,
                    y: 1,
                    z: 1,
                },
                memScales: {
                    x: 1,
                    y: 1,
                    z: 1,
                },
                resizeVector: new THREE.Vector3(0, 0, 0),
                frontBool: false,
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

        const canvasPerspectiveView = this.views.perspective.renderer.domElement;
        const canvasTopView = this.views.top.renderer.domElement;
        const canvasSideView = this.views.side.renderer.domElement;
        const canvasFrontView = this.views.front.renderer.domElement;

        canvasPerspectiveView.addEventListener('contextmenu', (e: MouseEvent): void => {
            if (this.model.data.activeElement.clientID !== null) {
                this.dispatchEvent(
                    new CustomEvent('canvas.contextmenu', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            clientID: Number(this.model.data.activeElement.clientID),
                            clientX: e.clientX,
                            clientY: e.clientY,
                        },
                    }),
                );
            }
            if (this.model.mode === Mode.DRAW && e.ctrlKey && this.model.data.drawData.initialState) {
                const { x, y, z } = this.cube.perspective.position;
                const { x: width, y: height, z: depth } = this.cube.perspective.scale;
                const { x: rotationX, y: rotationY, z: rotationZ } = this.cube.perspective.rotation;
                const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
                const initState = this.model.data.drawData.initialState;
                this.dispatchEvent(
                    new CustomEvent('canvas.drawn', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state: {
                                shapeType: 'cuboid',
                                frame: this.model.data.imageID,
                                points,
                                attributes: { ...initState.attributes },
                                group: initState.group?.id || null,
                                label: initState.label,
                            },
                            continue: true,
                            duration: 0,
                        },
                    }),
                );
            }
        });

        canvasPerspectiveView.addEventListener('mousedown', this.onPerspectiveDrag);
        window.document.addEventListener('mouseup', () => {
            this.disablePerspectiveDragging();
            if (this.isPerspectiveBeingDragged && this.mode !== Mode.DRAG_CANVAS) {
                // call this body only of drag was activated inside the canvas, but not globally
                this.isPerspectiveBeingDragged = false;
            }
        });

        canvasTopView.addEventListener('mousedown', this.startAction.bind(this, 'top'));
        canvasSideView.addEventListener('mousedown', this.startAction.bind(this, 'side'));
        canvasFrontView.addEventListener('mousedown', this.startAction.bind(this, 'front'));

        canvasTopView.addEventListener('mousemove', this.moveAction.bind(this, 'top'));
        canvasSideView.addEventListener('mousemove', this.moveAction.bind(this, 'side'));
        canvasFrontView.addEventListener('mousemove', this.moveAction.bind(this, 'front'));

        canvasTopView.addEventListener('mouseup', this.completeActions.bind(this));
        canvasTopView.addEventListener('mouseleave', this.completeActions.bind(this));
        canvasSideView.addEventListener('mouseup', this.completeActions.bind(this));
        canvasSideView.addEventListener('mouseleave', this.completeActions.bind(this));
        canvasFrontView.addEventListener('mouseup', this.completeActions.bind(this));
        canvasFrontView.addEventListener('mouseleave', this.completeActions.bind(this));

        canvasPerspectiveView.addEventListener('mousemove', (event: MouseEvent): void => {
            event.preventDefault();
            if (this.mode === Mode.DRAG_CANVAS) return;
            const canvas = this.views.perspective.renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const { mouseVector } = this.views.perspective.rayCaster as { mouseVector: THREE.Vector2 };
            mouseVector.x = ((event.clientX - (canvas.offsetLeft + rect.left)) / canvas.clientWidth) * 2 - 1;
            mouseVector.y = -((event.clientY - (canvas.offsetTop + rect.top)) / canvas.clientHeight) * 2 + 1;
        });

        canvasPerspectiveView.addEventListener('click', (e: MouseEvent): void => {
            e.preventDefault();
            const selectionIsBlocked = ![Mode.GROUP, Mode.IDLE].includes(this.mode) ||
                !this.views.perspective.rayCaster ||
                this.isPerspectiveBeingDragged;

            if (e.detail !== 1 || selectionIsBlocked) return;
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children[0].children,
                false,
            );
            if (intersects.length !== 0 && this.mode === Mode.GROUP && this.model.data.groupData.grouped) {
                const item = this.model.data.groupData.grouped.filter(
                    (_state: any): boolean => _state.clientID === Number(intersects[0].object.name),
                );
                if (item.length !== 0) {
                    // @ts-ignore
                    this.model.data.groupData.grouped = this.model.data.groupData.grouped.filter(
                        (_state: any): boolean => _state.clientID !== Number(intersects[0].object.name),
                    );
                    intersects[0].object.material.color.set(intersects[0].object.originalColor);
                } else {
                    const [state] = this.model.data.objects.filter(
                        (_state: any): boolean => _state.clientID === Number(intersects[0].object.name),
                    );
                    this.model.data.groupData.grouped.push(state);
                    intersects[0].object.material.color.set('#ffffff');
                }
            } else if (this.mode === Mode.IDLE) {
                const intersectedClientID = intersects[0]?.object?.name || null;
                if (this.model.data.activeElement.clientID !== intersectedClientID) {
                    this.dispatchEvent(
                        new CustomEvent('canvas.selected', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                clientID: typeof intersectedClientID === 'string' ? +intersectedClientID : null,
                            },
                        }),
                    );
                }
            }
        });

        canvasPerspectiveView.addEventListener('dblclick', (e: MouseEvent): void => {
            e.preventDefault();
            if (this.mode !== Mode.DRAW) {
                const { perspective: viewType } = this.views;
                viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector, viewType.camera);
                const intersects = viewType.rayCaster.renderer.intersectObjects(
                    this.views.perspective.scene.children[0].children,
                    false,
                );
                if (intersects.length !== 0 || this.model.data.activeElement.clientID !== null) {
                    // this.setDefaultZoom();
                } else {
                    const { x, y, z } = this.action.frameCoordinates;
                    this.positionAllViews(x, y, z, true);
                }
                return;
            }

            this.controller.drawData.enabled = false;
            this.mode = Mode.IDLE;
            const { x, y, z } = this.cube.perspective.position;
            const { x: width, y: height, z: depth } = this.cube.perspective.scale;
            const { x: rotationX, y: rotationY, z: rotationZ } = this.cube.perspective.rotation;
            const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
            const initState = this.model.data.drawData.initialState;
            const { redraw } = this.model.data.drawData;
            if (typeof redraw === 'number') {
                const state = this.model.data.objects
                    .find((object: ObjectState): boolean => object.clientID === redraw);
                const { cuboid } = this.drawnObjects[redraw];
                cuboid.perspective.visible = true;

                this.dispatchEvent(
                    new CustomEvent('canvas.edited', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state,
                            points,
                        },
                    }),
                );
            } else {
                this.dispatchEvent(
                    new CustomEvent('canvas.drawn', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state: {
                                shapeType: 'cuboid',
                                frame: this.model.data.imageID,
                                points,
                                ...(initState ? {
                                    attributes: { ...initState.attributes },
                                    group: initState.group?.id || null,
                                    label: initState.label,
                                    shapeType: initState.shapeType,
                                } : {}),
                            },
                            duration: 0,
                        },
                    }),
                );
            }

            this.views[ViewType.PERSPECTIVE].scene.children[0].remove(this.cube.perspective);
            this.dispatchEvent(new CustomEvent('canvas.canceled'));
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
        this.views.top.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2 - 2,
            (aspectRatio * viewSize) / 2 + 2,
            viewSize / 2 + 2,
            -viewSize / 2 - 2,
            -50,
            50,
        );
        this.views.side.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -50,
            50,
        );
        this.views.front.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -50,
            50,
        );

        for (const cameraType of ALL_VIEWS) {
            this.views[cameraType].camera.position.set(...this.cameraSettings[cameraType].position);
            this.views[cameraType].camera.lookAt(...this.cameraSettings[cameraType].lookAt);
            this.views[cameraType].camera.up.set(...this.cameraSettings[cameraType].up);
            this.views[cameraType].camera.name = `camera${cameraType[0].toUpperCase()}${cameraType.slice(1)}`;
        }

        Object.keys(this.views).forEach((view: string): void => {
            const viewType = this.views[view as keyof Views];
            if (viewType.camera) {
                viewType.renderer.setSize(width, height);
                if (view !== ViewType.PERSPECTIVE) {
                    viewType.controls = new CameraControls(viewType.camera, viewType.renderer.domElement);
                    viewType.controls.mouseButtons.left = CameraControls.ACTION.NONE;
                    viewType.controls.mouseButtons.right = CameraControls.ACTION.NONE;
                } else {
                    viewType.controls = new CameraControls(viewType.camera, viewType.renderer.domElement);
                    viewType.controls.mouseButtons.left = CameraControls.ACTION.NONE;
                    viewType.controls.mouseButtons.right = CameraControls.ACTION.NONE;
                    viewType.controls.touches.one = CameraControls.ACTION.NONE;
                    viewType.controls.touches.two = CameraControls.ACTION.NONE;
                    viewType.controls.touches.three = CameraControls.ACTION.NONE;
                }
                viewType.controls.minDistance = CONST.MIN_DISTANCE;
                viewType.controls.maxDistance = CONST.MAX_DISTANCE;
            }
        });
        this.views.top.controls.enabled = false;
        this.views.side.controls.enabled = false;
        this.views.front.controls.enabled = false;

        BOTTOM_VIEWS.forEach((view: ViewType): void => {
            this.views[view].renderer.domElement.addEventListener(
                'wheel',
                (event: WheelEvent): void => {
                    event.preventDefault();
                    const { camera } = this.views[view];
                    if (event.deltaY < CONST.FOV_MIN && camera.zoom < CONST.FOV_MAX) {
                        camera.zoom += CONST.FOV_INC;
                    } else if (event.deltaY > CONST.FOV_MIN && camera.zoom > CONST.FOV_MIN + 0.1) {
                        camera.zoom -= CONST.FOV_INC;
                    }
                    this.updateHelperPointsSize(view);
                },
                { passive: false },
            );
        });

        model.subscribe(this);
    }

    private setDefaultZoom(): void {
        if (this.model.data.activeElement === null) {
            Object.keys(this.views).forEach((view: string): void => {
                const viewType = this.views[view as keyof Views];
                if (view !== ViewType.PERSPECTIVE) {
                    viewType.camera.zoom = CONST.FOV_DEFAULT;
                    viewType.camera.updateProjectionMatrix();
                }
            });
        } else {
            const canvasTop = this.views.top.renderer.domElement;
            const bboxtop = new THREE.Box3().setFromObject(this.selectedCuboid.top);
            const x1 = Math.min(
                canvasTop.offsetWidth / (bboxtop.max.x - bboxtop.min.x),
                canvasTop.offsetHeight / (bboxtop.max.y - bboxtop.min.y),
            ) * 0.4;
            this.views.top.camera.zoom = x1 / 100;
            this.views.top.camera.updateProjectionMatrix();
            this.views.top.camera.updateMatrix();
            this.updateHelperPointsSize(ViewType.TOP);

            const canvasFront = this.views.top.renderer.domElement;
            const bboxfront = new THREE.Box3().setFromObject(this.selectedCuboid.front);
            const x2 = Math.min(
                canvasFront.offsetWidth / (bboxfront.max.y - bboxfront.min.y),
                canvasFront.offsetHeight / (bboxfront.max.z - bboxfront.min.z),
            ) * 0.4;
            this.views.front.camera.zoom = x2 / 100;
            this.views.front.camera.updateProjectionMatrix();
            this.views.front.camera.updateMatrix();
            this.updateHelperPointsSize(ViewType.FRONT);

            const canvasSide = this.views.side.renderer.domElement;
            const bboxside = new THREE.Box3().setFromObject(this.selectedCuboid.side);
            const x3 = Math.min(
                canvasSide.offsetWidth / (bboxside.max.x - bboxside.min.x),
                canvasSide.offsetHeight / (bboxside.max.z - bboxside.min.z),
            ) * 0.4;
            this.views.side.camera.zoom = x3 / 100;
            this.views.side.camera.updateProjectionMatrix();
            this.views.side.camera.updateMatrix();
            this.updateHelperPointsSize(ViewType.SIDE);
        }
    }

    private enablePerspectiveDragging(): void {
        const { controls } = this.views.perspective;
        controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
        controls.mouseButtons.right = CameraControls.ACTION.TRUCK;
        controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
        controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;
        controls.touches.three = CameraControls.ACTION.TOUCH_TRUCK;
    }

    private disablePerspectiveDragging(): void {
        const { controls } = this.views.perspective;
        controls.mouseButtons.left = CameraControls.ACTION.NONE;
        controls.mouseButtons.right = CameraControls.ACTION.NONE;
        controls.touches.one = CameraControls.ACTION.NONE;
        controls.touches.two = CameraControls.ACTION.NONE;
        controls.touches.three = CameraControls.ACTION.NONE;
    }

    private onPerspectiveDrag = (): void => {
        if (![Mode.DRAG_CANVAS, Mode.IDLE].includes(this.mode)) return;
        this.isPerspectiveBeingDragged = true;
        this.enablePerspectiveDragging();
    }

    private startAction(view: any, event: MouseEvent): void {
        const { clientID } = this.model.data.activeElement;
        if (event.detail !== 1 || this.mode !== Mode.IDLE || clientID === null || !(clientID in this.drawnObjects)) {
            return;
        }

        const canvas = this.views[view as keyof Views].renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const { mouseVector } = this.views[view as keyof Views].rayCaster as { mouseVector: THREE.Vector2 };
        const diffX = event.clientX - rect.left;
        const diffY = event.clientY - rect.top;
        mouseVector.x = (diffX / canvas.clientWidth) * 2 - 1;
        mouseVector.y = -(diffY / canvas.clientHeight) * 2 + 1;
        this.action.rotation.screenInit = { x: diffX, y: diffY };
        this.action.rotation.screenMove = { x: diffX, y: diffY };
        const { data } = this.drawnObjects[+clientID];

        if (!data.lock) {
            this.action.scan = view;
            this.model.mode = Mode.EDIT;
        }
    }

    private moveAction(view: any, event: MouseEvent): void {
        event.preventDefault();
        const { clientID } = this.model.data.activeElement;
        if (this.model.mode === Mode.DRAG_CANVAS || clientID === null) {
            return;
        }

        const canvas = this.views[view as keyof Views].renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const { mouseVector } = this.views[view as keyof Views].rayCaster as { mouseVector: THREE.Vector2 };
        const diffX = event.clientX - rect.left;
        const diffY = event.clientY - rect.top;
        mouseVector.x = (diffX / canvas.clientWidth) * 2 - 1;
        mouseVector.y = -(diffY / canvas.clientHeight) * 2 + 1;
        this.action.rotation.screenMove = { x: diffX, y: diffY };
    }

    private translateReferencePlane(coordinates: any): void {
        const topPlane = this.views.top.scene.getObjectByName(Planes.TOP);
        if (topPlane) {
            topPlane.position.x = coordinates.x;
            topPlane.position.y = coordinates.y;
            topPlane.position.z = coordinates.z;
        }
        const sidePlane = this.views.side.scene.getObjectByName(Planes.SIDE);
        if (sidePlane) {
            sidePlane.position.x = coordinates.x;
            sidePlane.position.y = coordinates.y;
            sidePlane.position.z = coordinates.z;
        }
        const frontPlane = this.views.front.scene.getObjectByName(Planes.FRONT);
        if (frontPlane) {
            frontPlane.position.x = coordinates.x;
            frontPlane.position.y = coordinates.y;
            frontPlane.position.z = coordinates.z;
        }
    }

    private resetActions(): void {
        this.action = {
            ...this.action,
            scan: null,
            detected: false,
            translation: {
                status: false,
                helper: null,
            },
            rotation: {
                status: false,
                helper: null,
                recentMouseVector: new THREE.Vector2(0, 0),
            },
            resize: {
                ...this.action.resize,
                status: false,
                helper: null,
                recentMouseVector: new THREE.Vector2(0, 0),
            },
        };
        this.model.mode = Mode.IDLE;
    }

    private completeActions(): void {
        const { scan, detected } = this.action;
        if (this.model.data.activeElement.clientID === null) return;
        if (!detected) {
            this.resetActions();
            return;
        }

        const { x, y, z } = this.selectedCuboid[scan].position;
        const { x: width, y: height, z: depth } = this.selectedCuboid[scan].scale;
        const { x: rotationX, y: rotationY, z: rotationZ } = this.selectedCuboid[scan].rotation;
        const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
        const [state] = this.model.data.objects.filter(
            (_state: any): boolean => _state.clientID === Number(this.selectedCuboid[scan].name),
        );
        this.dispatchEvent(
            new CustomEvent('canvas.edited', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                    points,
                },
            }),
        );
        // if (this.action.rotation.status) {
        //     this.detachCamera(scan);
        // }

        // this.adjustPerspectiveCameras();
        this.translateReferencePlane(new THREE.Vector3(x, y, z));
        this.resetActions();
    }

    private onGroupDone(objects?: any[]): void {
        if (objects && objects.length !== 0) {
            this.dispatchEvent(
                new CustomEvent('canvas.groupped', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        states: objects,
                    },
                }),
            );
        } else {
            this.dispatchEvent(
                new CustomEvent('canvas.canceled', {
                    bubbles: false,
                    cancelable: true,
                }),
            );
        }

        this.controller.group({
            enabled: false,
            grouped: [],
        });

        this.mode = Mode.IDLE;
    }

    // private setupObject(object: any, addToScene: boolean): CuboidModel {
    //     const {
    //         opacity, outlined, outlineColor, selectedOpacity, colorBy,
    //     } = this.model.data.shapeProperties;
    //     const clientID = String(object.clientID);
    //     const cuboid = new CuboidModel(object.occluded ? 'dashed' : 'line', outlined ? outlineColor : '#ffffff');

    //     cuboid.setName(clientID);
    //     cuboid.perspective.userData = object;
    //     let color = '';
    //     if (colorBy === 'Label') {
    //         ({ color } = object.label);
    //     } else if (colorBy === 'Instance') {
    //         ({ color } = object);
    //     } else {
    //         ({ color } = object.group);
    //     }
    //     cuboid.setOriginalColor(color);
    //     cuboid.setColor(color);
    //     cuboid.setOpacity(opacity);

    //     if (
    //         this.model.data.activeElement.clientID === clientID &&
    //         ![Mode.DRAG_CANVAS, Mode.GROUP].includes(this.mode)
    //     ) {
    //         cuboid.setOpacity(selectedOpacity);
    //         if (!object.lock) {
    //             createRotationHelper(cuboid.top, ViewType.TOP);
    //             createRotationHelper(cuboid.side, ViewType.SIDE);
    //             createRotationHelper(cuboid.front, ViewType.FRONT);
    //             setTranslationHelper(cuboid.top);
    //             setTranslationHelper(cuboid.side);
    //             setTranslationHelper(cuboid.front);
    //         }
    //         setEdges(cuboid.top);
    //         setEdges(cuboid.side);
    //         setEdges(cuboid.front);
    //         this.translateReferencePlane(new THREE.Vector3(object.points[0], object.points[1], object.points[2]));
    //         this.model.data.selected = cuboid;
    //         if (object.hidden) {
    //             this.setHelperVisibility(false);
    //             return cuboid;
    //         }
    //     } else {
    //         cuboid.top.visible = false;
    //         cuboid.side.visible = false;
    //         cuboid.front.visible = false;
    //     }
    //     if (object.hidden) {
    //         return cuboid;
    //     }
    //     cuboid.setPosition(object.points[0], object.points[1], object.points[2]);
    //     cuboid.setScale(object.points[6], object.points[7], object.points[8]);
    //     cuboid.setRotation(object.points[3], object.points[4], object.points[5]);
    //     if (addToScene) {
    //         this.addSceneChildren(cuboid);
    //     }
    //     if (this.model.data.activeElement.clientID === clientID) {
    //         cuboid.attachCameraReference();
    //         this.rotatePlane(null, null);
    //         this.action.detachCam = true;
    //         this.action.detachCamRef = this.model.data.activeElement.clientID;
    //         if (!object.lock) {
    //             this.setSelectedChildScale(1 / cuboid.top.scale.x, 1 / cuboid.top.scale.y, 1 / cuboid.top.scale.z);
    //             this.setHelperVisibility(true);
    //             this.updateRotationHelperPos();
    //             this.updateResizeHelperPos();
    //         } else {
    //             this.setHelperVisibility(false);
    //         }
    //     }
    //     return cuboid;
    // }

    private receiveShapeColor(state: ObjectState | DrawnObjectData): string {
        const { colorBy } = this.model.data.shapeProperties;

        if (state instanceof ObjectState) {
            if (colorBy === 'Label') {
                return state.label.color;
            }

            if (colorBy === 'Group') {
                return state.color;
            }

            return state.group?.color || CONST.DEFAULT_GROUP_COLOR;
        }

        if (colorBy === 'Label') {
            return state.labelColor;
        }

        if (colorBy === 'Group') {
            return state.groupColor;
        }

        return state.color;
    }

    private addCuboid(state: ObjectState): CuboidModel {
        const {
            opacity, outlined, outlineColor,
        } = this.model.data.shapeProperties;
        const clientID = String(state.clientID);
        const cuboid = new CuboidModel(state.occluded ? 'dashed' : 'line', outlined ? outlineColor : '#ffffff');
        const color = this.receiveShapeColor(state);

        cuboid.setName(clientID);
        cuboid.setOriginalColor(color);
        cuboid.setColor(color);
        cuboid.setOpacity(opacity);
        cuboid.setPosition(state.points[0], state.points[1], state.points[2]);
        cuboid.setScale(state.points[6], state.points[7], state.points[8]);
        cuboid.setRotation(state.points[3], state.points[4], state.points[5]);
        cuboid.attachCameraReference();

        cuboid[ViewType.PERSPECTIVE].visible = !(state.hidden || state.outside);
        for (const view of BOTTOM_VIEWS) {
            cuboid[view].visible = false;
        }

        cuboid.perspective.userData = state;
        return cuboid;
    }

    private deactivateObject(): void {
        const { opacity } = this.model.data.shapeProperties;
        if (this.activatedElementID !== null) {
            const { cuboid } = this.drawnObjects[this.activatedElementID];
            cuboid.setOpacity(opacity);
            for (const view of BOTTOM_VIEWS) {
                cuboid[view].visible = false;
                removeCuboidEdges(cuboid[view]);
                removeResizeHelper(cuboid[view]);
                removeRotationHelper(cuboid[view]);
            }
            this.activatedElementID = null;
        }
    }

    private activateObject(): void {
        const { selectedOpacity } = this.model.data.shapeProperties;
        const { clientID } = this.model.data.activeElement;
        if (clientID !== null && this.drawnObjects[+clientID]?.cuboid?.perspective?.visible) {
            const { cuboid, data } = this.drawnObjects[+clientID];
            cuboid.setOpacity(selectedOpacity);
            for (const view of BOTTOM_VIEWS) {
                cuboid[view].visible = true;
                createCuboidEdges(cuboid[view]);

                if (!data.lock) {
                    createResizeHelper(cuboid[view]);
                    createRotationHelper(cuboid[view], view);
                }
            }

            // cuboid.attachCameraReference();
            //         this.rotatePlane(null, null);
            //         this.action.detachCam = true;
            //         this.action.detachCamRef = this.model.data.activeElement.clientID;
            // this.translateReferencePlane(new THREE.Vector3(data.points[0], data.points[1], data.points[2]));

            this.activatedElementID = +clientID;
            this.detachCamera(null);
            this.setDefaultZoom();
        }
    }

    private createObjects(states: ObjectState[]): void {
        states.forEach((state: ObjectState) => {
            const cuboid = this.addCuboid(state);
            this.addSceneChildren(cuboid);
            this.drawnObjects[state.clientID] = {
                cuboid,
                data: drawnDataFromState(state),
            };
        });
    }

    private updateObjects(states: ObjectState[]): void {
        states.forEach((state: ObjectState) => {
            const {
                clientID, points, color, label, group, occluded, outside, hidden,
            } = state;
            const { cuboid, data } = this.drawnObjects[clientID];

            if (points.length !== data.points.length ||
                points.some((point: number, idx: number) => point !== data.points[idx])) {
                cuboid.setPosition(state.points[0], state.points[1], state.points[2]);
                cuboid.setScale(state.points[6], state.points[7], state.points[8]);
                cuboid.setRotation(state.points[3], state.points[4], state.points[5]);
            }

            if (
                color !== data.color ||
                label.id !== data.labelID ||
                group.id !== data.groupID
            ) {
                const newColor = this.receiveShapeColor(state);
                cuboid.setOriginalColor(newColor);
                cuboid.setColor(newColor);
            }

            if (outside !== data.outside || hidden !== data.hidden) {
                cuboid.perspective.visible = !(outside || hidden);
                cuboid.top.visible = !(outside || hidden);
                cuboid.side.visible = !(outside || hidden);
                cuboid.front.visible = !(outside || hidden);
            }

            if (occluded !== data.occluded) {
                this.deleteObjects([clientID]);
                this.createObjects([state]);
                return;
            }

            this.drawnObjects[clientID].data = drawnDataFromState(state);
        });
    }

    private deleteObjects(clientIDs: number[]): void {
        clientIDs.forEach((clientID: number): void => {
            const { cuboid } = this.drawnObjects[clientID];
            Object.keys(this.views).forEach((view: string): void => {
                this.views[view as keyof Views].scene.children[0].remove(cuboid[view as keyof Views]);
            });

            delete this.drawnObjects[clientID];
        });
    }

    private setupObjectsIncremental(states: ObjectState[]): void {
        const created = states.filter((state: ObjectState): boolean => !(state.clientID in this.drawnObjects));
        const updated = states.filter((state: ObjectState): boolean => (
            state.clientID in this.drawnObjects && this.drawnObjects[state.clientID].data.updated !== state.updated
        ));
        const deleted = Object.keys(this.drawnObjects).map((key: string): number => +key)
            .filter((clientID: number): boolean => (
                states.findIndex((state: ObjectState) => state.clientID === clientID) === -1
            ));

        this.deactivateObject();
        this.createObjects(created);
        this.updateObjects(updated);
        this.deleteObjects(deleted);
        this.activateObject();
    }

    private addSceneChildren(shapeObject: CuboidModel): void {
        this.views.perspective.scene.children[0].add(shapeObject.perspective);
        this.views.top.scene.children[0].add(shapeObject.top);
        this.views.side.scene.children[0].add(shapeObject.side);
        this.views.front.scene.children[0].add(shapeObject.front);
    }

    private dispatchEvent(event: CustomEvent): void {
        this.views.perspective.renderer.domElement.dispatchEvent(event);
    }

    public notify(model: Canvas3dModel & Master, reason: UpdateReasons): void {
        if (reason === UpdateReasons.IMAGE_CHANGED) {
            const onPCDLoadFailed = (): void => {
                this.model.unlockFrameUpdating();
            };

            const onPCDLoadSuccess = (points: any): void => {
                try {
                    this.clearScene();
                    this.onSceneImageLoaded(points);
                    this.model.updateCanvasObjects();
                } finally {
                    this.model.unlockFrameUpdating();
                }
            };

            try {
                if (!model.data.image) {
                    throw new Error('No image data found');
                }

                const loader = new PCDLoader();
                const objectURL = URL.createObjectURL(model.data.image.imageData);

                try {
                    this.views.perspective.renderer.dispose();
                    if (this.controller.imageIsDeleted) {
                        try {
                            this.clearScene();
                            this.render();
                            const [container] = window.document.getElementsByClassName('cvat-canvas-container');
                            const overlay = window.document.createElement('canvas');
                            overlay.classList.add('cvat_3d_canvas_deleted_overlay');
                            overlay.style.width = '100%';
                            overlay.style.height = '100%';
                            overlay.style.position = 'absolute';
                            overlay.style.top = '0px';
                            overlay.style.left = '0px';
                            container.appendChild(overlay);
                            const { clientWidth: width, clientHeight: height } = overlay;
                            overlay.width = width;
                            overlay.height = height;
                            const canvasContext = overlay.getContext('2d');
                            const fontSize = width / 10;
                            canvasContext.font = `bold ${fontSize}px serif`;
                            canvasContext.textAlign = 'center';
                            canvasContext.lineWidth = fontSize / 20;
                            canvasContext.strokeStyle = 'white';
                            canvasContext.strokeText('IMAGE REMOVED', width / 2, height / 2);
                            canvasContext.fillStyle = 'black';
                            canvasContext.fillText('IMAGE REMOVED', width / 2, height / 2);
                        } finally {
                            this.model.unlockFrameUpdating();
                        }
                    } else {
                        loader.load(objectURL, onPCDLoadSuccess, () => {}, onPCDLoadFailed);
                        const [overlay] = window.document.getElementsByClassName('cvat_3d_canvas_deleted_overlay');
                        if (overlay) {
                            overlay.remove();
                        }
                    }

                    this.dispatchEvent(new CustomEvent('canvas.setup'));
                } finally {
                    URL.revokeObjectURL(objectURL);
                }
            } catch (error: any) {
                this.model.unlockFrameUpdating();
                throw error;
            }
        } else if (reason === UpdateReasons.SHAPES_CONFIG_UPDATED) {
            const config = { ...this.model.data.shapeProperties };
            for (const key of Object.keys(this.drawnObjects)) {
                const clientID = +key;
                const { cuboid, data } = this.drawnObjects[clientID];
                const newColor = this.receiveShapeColor(data);
                const wireframe = (cuboid.wireframe.material as THREE.LineBasicMaterial | THREE.LineDashedMaterial);
                for (const view of ALL_VIEWS) {
                    const material = cuboid[view].material as THREE.MeshBasicMaterial;
                    (material as THREE.MeshBasicMaterial).color.set(newColor);
                    (material as THREE.MeshBasicMaterial).opacity = ((clientID === this.activatedElementID) ?
                        config.selectedOpacity : config.opacity) / 100;
                }

                if (!config.outlined) {
                    wireframe.color.set(newColor);
                } else {
                    wireframe.color.set(config.outlineColor || CONST.DEFAULT_OUTLINE_COLOR);
                }
            }
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            this.deactivateObject();
            this.activateObject();
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (Number.isInteger(data.redraw)) {
                if (this.drawnObjects[data.redraw]?.cuboid?.perspective?.visible) {
                    const { cuboid } = this.drawnObjects[data.redraw];
                    this.cube.perspective = cuboid.perspective.clone() as THREE.Mesh;
                    cuboid.perspective.visible = false;
                } else {
                    // an object must be drawn and visible to be redrawn
                    this.model.cancel();
                    return;
                }
            } else if (data.initialState) {
                if (!data.initialState.outside && !data.initialState.hidden) {
                    this.cube = this.addCuboid(data.initialState);
                } else {
                    // an object must visible to paste it
                    this.model.cancel();
                    return;
                }
            } else {
                this.cube = new CuboidModel('line', '#ffffff');
            }

            this.cube.setName('drawTemplate');
            this.deactivateObject();
            this.views[ViewType.PERSPECTIVE].scene.children[0].add(this.cube.perspective);
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            this.setupObjectsIncremental(this.model.data.objects);
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            this.isPerspectiveBeingDragged = true;
            this.dispatchEvent(
                new CustomEvent('canvas.dragstart', {
                    bubbles: false,
                    cancelable: true,
                }),
            );
            this.model.data.activeElement.clientID = null;
            this.deactivateObject();
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAG_CANVAS) {
                this.isPerspectiveBeingDragged = false;
                this.dispatchEvent(
                    new CustomEvent('canvas.dragstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            }

            if (this.mode === Mode.DRAW) {
                this.controller.drawData.enabled = false;
                this.controller.drawData.redraw = undefined;
                const scene = this.views[ViewType.PERSPECTIVE].scene.children[0];
                const template = scene.getObjectByName('drawTemplate');
                if (template) {
                    scene.remove(template);
                }
            }

            this.model.data.groupData.grouped = [];
            this.mode = Mode.IDLE;
            this.model.mode = Mode.IDLE;

            this.dispatchEvent(new CustomEvent('canvas.canceled'));
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            this.dispatchEvent(new CustomEvent('canvas.fit'));
        } else if (reason === UpdateReasons.GROUP) {
            if (!this.model.groupData.enabled) {
                this.onGroupDone(this.model.data.groupData.grouped);
            } else {
                this.model.data.groupData.grouped = [];
                this.model.data.activeElement.clientID = null;
            }
        }
    }

    private clearScene(): void {
        this.drawnObjects = {};
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children = [];
        });
    }

    private clearSceneObjects(): void {
        this.drawnObjects = {};
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children[0].children = [];
        });
    }

    private updateRotationHelperPos(): void {
        const cuboid = this.selectedCuboid;
        if (!cuboid) {
            return;
        }

        BOTTOM_VIEWS.forEach((view: ViewType): void => {
            const rotationHelper = cuboid[view].parent.getObjectByName(CONST.ROTATION_HELPER_NAME);
            const { y, z } = cuboidSize(cuboid[view]);
            if (rotationHelper) {
                if (view === ViewType.TOP) {
                    rotationHelper.position.set(
                        cuboid[view].position.x,
                        cuboid[view].position.y + (y / 2) * cuboid[view].scale.y + CONST.ROTATION_HELPER_OFFSET,
                        cuboid[view].position.z,
                    );
                } else {
                    rotationHelper.position.set(
                        cuboid[view].position.x,
                        cuboid[view].position.y,
                        cuboid[view].position.z + (z / 2) * cuboid[view].scale.z + CONST.ROTATION_HELPER_OFFSET,
                    );
                }
            }
        });
    }

    private updateResizeHelperPos(): void {
        const cuboid = this.selectedCuboid;
        if (cuboid === null) {
            return;
        }

        BOTTOM_VIEWS.forEach((view: ViewType): void => {
            const center = cuboid[view].position.clone();
            const { x, y, z } = cuboidSize(cuboid[view]);
            const cornerPoints = makeCornerPointsMatrix(x / 2, y / 2, z / 2);

            cuboid[view].parent.children
                .filter((child: THREE.Object3D) => child.name.startsWith(CONST.RESIZE_HELPER_NAME))
                .sort((child1: THREE.Object3D, child2: THREE.Object3D) => {
                    const order1 = +child1.name.split('_')[1];
                    const order2 = +child2.name.split('_')[1];
                    return order2 - order1;
                }).forEach((child: THREE.Object3D, idx: number) => {
                    const offset = new THREE.Vector3().fromArray(cornerPoints[idx]).multiply(cuboid[view].scale);
                    const vertex = center.clone().add(offset);
                    child.position.set(vertex.x, vertex.y, vertex.z);
                });
        });
    }

    private updateHelperPointsSize(viewType: ViewType): void {
        if (BOTTOM_VIEWS.includes(viewType)) {
            const camera = this.views[viewType].camera as THREE.OrthographicCamera;
            if (!camera) { return; }

            const rotationObject = this.views[viewType].scene.children[0].getObjectByName(CONST.ROTATION_HELPER_NAME);
            if (rotationObject) {
                rotationObject.scale.set(1 / camera.zoom, 1 / camera.zoom, 1 / camera.zoom);
            }

            this.views[viewType].scene.children[0].children
                .filter((child: THREE.Object3D) => child.name.startsWith(CONST.RESIZE_HELPER_NAME))
                .forEach((child: THREE.Object3D) => {
                    child.scale.set(1 / camera.zoom, 1 / camera.zoom, 1 / camera.zoom);
                });
        }
    }

    private onSceneImageLoaded(points: any): void {
        const getCameraSettingsToFitScene = (
            camera: THREE.PerspectiveCamera,
            boundingBox: THREE.Box3,
        ): [number, number, number] => {
            const offset = 5;
            const width = boundingBox.max.x - boundingBox.min.x;
            const height = boundingBox.max.y - boundingBox.min.y;

            // find the maximum width or height, compute z to approximately fit the scene
            const maxDim = Math.max(width, height);
            const fov = camera.fov * (Math.PI / 180);
            const cameraZ = Math.abs((maxDim / 8) * Math.tan(fov * 2));

            return [
                boundingBox.min.x + offset,
                boundingBox.max.y + offset,
                cameraZ + offset,
            ];
        };

        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.05;
        points.material.color.set(new THREE.Color(0xffffff));

        const { controls } = this.views.perspective;
        controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;

        const material = points.material.clone();
        // const { radius, center: sphereCenter } = points.geometry.boundingSphere;
        if (!this.views.perspective.camera) return;

        if (this.model.configuration.resetZoom) {
            points.geometry.computeBoundingBox();
            this.cameraSettings.perspective.position = getCameraSettingsToFitScene(
                this.views.perspective.camera as THREE.PerspectiveCamera, points.geometry.boundingBox,
            );
            this.positionAllViews(
                this.action.frameCoordinates.x,
                this.action.frameCoordinates.y,
                this.action.frameCoordinates.z,
                false,
            );
        }

        this.views.perspective.scene.add(points.clone());
        this.views.perspective.scene.add(new THREE.AxesHelper(5));
        // Setup TopView
        const canvasTopView = this.views.top.renderer.domElement;
        const topScenePlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
                canvasTopView.offsetHeight,
                canvasTopView.offsetWidth,
                canvasTopView.offsetHeight,
                canvasTopView.offsetWidth,
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                alphaTest: 0,
                visible: false,
                transparent: true,
                opacity: 0,
            }),
        );
        topScenePlane.position.set(0, 0, 0);
        topScenePlane.name = Planes.TOP;
        (topScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (topScenePlane as any).verticesNeedUpdate = true;
        // eslint-disable-next-line no-param-reassign
        points.material = material;
        material.size = 0.5;
        this.views.top.scene.add(points.clone());
        this.views.top.scene.add(topScenePlane);
        // Setup Side View
        const canvasSideView = this.views.side.renderer.domElement;
        const sideScenePlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
                canvasSideView.offsetHeight,
                canvasSideView.offsetWidth,
                canvasSideView.offsetHeight,
                canvasSideView.offsetWidth,
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                alphaTest: 0,
                visible: false,
                transparent: true,
                opacity: 0,
            }),
        );
        sideScenePlane.position.set(0, 0, 0);
        sideScenePlane.rotation.set(-Math.PI / 2, Math.PI / 2000, Math.PI);
        sideScenePlane.name = Planes.SIDE;
        (sideScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (sideScenePlane as any).verticesNeedUpdate = true;
        this.views.side.scene.add(points.clone());
        this.views.side.scene.add(sideScenePlane);
        // Setup front View
        const canvasFrontView = this.views.front.renderer.domElement;
        const frontScenePlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
                canvasFrontView.offsetHeight,
                canvasFrontView.offsetWidth,
                canvasFrontView.offsetHeight,
                canvasFrontView.offsetWidth,
            ),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                alphaTest: 0,
                visible: false,
                transparent: true,
                opacity: 0,
            }),
        );
        frontScenePlane.position.set(0, 0, 0);
        frontScenePlane.rotation.set(0, Math.PI / 2, 0);
        frontScenePlane.name = Planes.FRONT;
        (frontScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (frontScenePlane as any).verticesNeedUpdate = true;
        this.views.front.scene.add(points.clone());
        this.views.front.scene.add(frontScenePlane);
    }

    private positionAllViews(x: number, y: number, z: number, animation: boolean): void {
        if (
            this.views.perspective.controls &&
            this.views.top.controls &&
            this.views.side.controls &&
            this.views.front.controls
        ) {
            this.views.perspective.controls.setLookAt(
                x + this.cameraSettings.perspective.position[0],
                y - this.cameraSettings.perspective.position[1],
                z + this.cameraSettings.perspective.position[2],
                x, y, z, animation,
            );

            for (const cameraType of BOTTOM_VIEWS) {
                this.views[cameraType].camera.position.set(
                    x + this.cameraSettings[cameraType].position[0],
                    y + this.cameraSettings[cameraType].position[1],
                    z + this.cameraSettings[cameraType].position[2],
                );
                this.views[cameraType].camera.lookAt(x, y, z);
                this.views[cameraType].camera.zoom = CONST.FOV_DEFAULT;
            }
        }
    }

    private static resizeRendererToDisplaySize(viewName: string, view: RenderView): void {
        const { camera, renderer } = view;
        const canvas = renderer.domElement;
        if (!canvas.parentElement) return;
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        const needResize = canvas.clientWidth !== width || canvas.clientHeight !== height;
        if (needResize && camera && view.camera) {
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
                camera.near = -50;
                camera.far = 50;
            }
            view.renderer.setSize(width, height);
            view.camera.updateProjectionMatrix();
        }
    }

    private renderRayCaster = (viewType: RenderView): void => {
        viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector, viewType.camera);
        if (this.mode === Mode.DRAW) {
            const [intersection] = viewType.rayCaster.renderer.intersectObjects(this.views.perspective.scene.children);
            if (intersection) {
                const object = this.views.perspective.scene.getObjectByName('drawTemplate');
                const { x, y, z } = intersection.point;
                object.position.set(x, y, z);
            }
        } else if (this.mode === Mode.IDLE && !this.isPerspectiveBeingDragged) {
            const { children } = this.views.perspective.scene.children[0];
            const { renderer } = this.views.perspective.rayCaster;
            const intersects = renderer
                .intersectObjects(children.filter((child: THREE.Object3D) => child.visible), false);
            if (intersects.length !== 0) {
                const clientID = intersects[0].object.name;
                if (clientID === undefined || clientID === '' || this.model.data.activeElement.clientID === clientID) {
                    return;
                }
                const object = this.views.perspective.scene.getObjectByName(clientID);
                if (object === undefined) return;
                this.dispatchEvent(
                    new CustomEvent('canvas.selected', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            clientID: Number(intersects[0].object.name),
                        },
                    }),
                );
            }
        }
    };

    public render(): void {
        Object.keys(this.views).forEach((view: string): void => {
            const viewType = this.views[view as keyof Views];
            if (!(viewType.controls && viewType.camera && viewType.rayCaster)) return;
            Canvas3dViewImpl.resizeRendererToDisplaySize(view, viewType);
            if (viewType.controls.enabled) {
                viewType.controls.update(this.clock.getDelta());
            } else {
                viewType.camera.updateProjectionMatrix();
            }
            viewType.renderer.render(viewType.scene, viewType.camera);
            if (view === ViewType.PERSPECTIVE && viewType.scene.children.length !== 0) {
                this.renderRayCaster(viewType);
            }
            const { clientID } = this.model.data.activeElement;
            if (clientID !== null && view !== ViewType.PERSPECTIVE) {
                viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector, viewType.camera);
                // First Scan
                if (this.action.scan === view) {
                    if (!(this.action.translation.status || this.action.resize.status || this.action.rotation.status)) {
                        this.initiateAction(view as ViewType, viewType);
                    }
                    // Action Operations
                    if (this.action.detected) {
                        if (this.action.translation.status) {
                            this.renderTranslateAction(view as ViewType, viewType);
                        } else if (this.action.resize.status) {
                            this.renderResizeAction(view as ViewType, viewType);
                        } else {
                            this.renderRotateAction(view as ViewType, viewType);
                        }
                    } else {
                        this.resetActions();
                    }
                }
            }
        });

        if (this.action.detachCam && this.action.detachCamRef === this.model.data.activeElement.clientID) {
            try {
                this.detachCamera(null);
            } finally {
                this.action.detachCam = false;
            }
        }
    }

    private adjustPerspectiveCameras(): void {
        const coordinatesTop = this.selectedCuboid.getReferenceCoordinates(ViewType.TOP);
        const sphericalTop = new THREE.Spherical();
        sphericalTop.setFromVector3(coordinatesTop);
        this.views.top.camera.position.setFromSpherical(sphericalTop);
        this.views.top.camera.updateProjectionMatrix();

        const coordinatesSide = this.selectedCuboid.getReferenceCoordinates(ViewType.SIDE);
        const sphericalSide = new THREE.Spherical();
        sphericalSide.setFromVector3(coordinatesSide);
        this.views.side.camera.position.setFromSpherical(sphericalSide);
        this.views.side.camera.updateProjectionMatrix();

        const coordinatesFront = this.selectedCuboid.getReferenceCoordinates(ViewType.FRONT);
        const sphericalFront = new THREE.Spherical();
        sphericalFront.setFromVector3(coordinatesFront);
        this.views.front.camera.position.setFromSpherical(sphericalFront);
        this.views.front.camera.updateProjectionMatrix();
    }

    private renderTranslateAction(view: ViewType, viewType: any): void {
        if (
            this.action.translation.helper.x === this.views[view].rayCaster.mouseVector.x &&
            this.action.translation.helper.y === this.views[view].rayCaster.mouseVector.y
        ) {
            return;
        }
        const intersects = viewType.rayCaster.renderer.intersectObjects(
            [viewType.scene.getObjectByName(`${view}Plane`)],
            true,
        );

        if (intersects.length !== 0 && intersects[0].point) {
            const coordinates = intersects[0].point;
            this.action.translation.coordinates = coordinates;
            this.moveObject(coordinates);
        }
    }

    private moveObject(coordinates: THREE.Vector3): void {
        const {
            perspective, top, side, front,
        } = this.selectedCuboid;
        let localCoordinates = coordinates;
        if (this.action.translation.status) {
            localCoordinates = coordinates
                .clone()
                .sub(this.action.translation.offset)
                .applyMatrix4(this.action.translation.inverseMatrix);
        }
        perspective.position.copy(localCoordinates.clone());
        top.position.copy(localCoordinates.clone());
        side.position.copy(localCoordinates.clone());
        front.position.copy(localCoordinates.clone());

        this.updateResizeHelperPos();
        this.updateRotationHelperPos();
    }

    private setSelectedChildScale(x: number, y: number, z: number): void {
        const cuboid = this.selectedCuboid;
        if (cuboid) {
            BOTTOM_VIEWS.forEach((view: ViewType): void => {
                cuboid[view].children.forEach((element: any): void => {
                    if (element.name !== CONST.CUBOID_EDGE_NAME) {
                        element.scale.set(
                            x == null ? element.scale.x : x,
                            y == null ? element.scale.y : y,
                            z == null ? element.scale.z : z,
                        );
                    }
                });
            });
        }
    }

    private renderResizeAction(view: ViewType, viewType: any): void {
        const cuboid = this.selectedCuboid;
        if (cuboid === null) {
            return;
        }

        const intersects = viewType.rayCaster.renderer.intersectObjects(
            [viewType.scene.getObjectByName(`${view}Plane`)],
            true,
        );
        // Return if no intersection with the reference plane
        if (intersects.length === 0) return;
        const { x: scaleInitX, y: scaleInitY, z: scaleInitZ } = this.action.resize.initScales;
        const { x: scaleMemX, y: scaleMemY, z: scaleMemZ } = this.action.resize.memScales;
        const { x: initPosX, y: initPosY } = this.action.resize.helper;
        const { x: currentPosX, y: currentPosY } = viewType.rayCaster.mouseVector;
        const { resizeVector } = this.action.resize;

        if (this.action.resize.helper.x === currentPosX && this.action.resize.helper.y === currentPosY) {
            return;
        }

        if (
            this.action.resize.recentMouseVector.x === currentPosX &&
            this.action.resize.recentMouseVector.y === currentPosY
        ) {
            return;
        }
        this.action.resize.recentMouseVector = viewType.rayCaster.mouseVector.clone();
        switch (view) {
            case ViewType.TOP: {
                let y = scaleInitX * (currentPosX / initPosX);
                let x = scaleInitY * (currentPosY / initPosY);
                if (x < 0) x = 0.2;
                if (y < 0) y = 0.2;
                cuboid.setScale(y, x, this.selectedCuboid.top.scale.z);
                this.setSelectedChildScale(1 / y, 1 / x, null);
                const differenceX = y / 2 - scaleMemX / 2;
                const differenceY = x / 2 - scaleMemY / 2;

                if (currentPosX > 0 && currentPosY < 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y -= differenceY;
                } else if (currentPosX > 0 && currentPosY > 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y += differenceY;
                } else if (currentPosX < 0 && currentPosY < 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y -= differenceY;
                } else if (currentPosX < 0 && currentPosY > 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y += differenceY;
                }

                this.action.resize.memScales.x = y;
                this.action.resize.memScales.y = x;
                break;
            }
            case ViewType.SIDE: {
                let x = scaleInitX * (currentPosX / initPosX);
                let z = scaleInitZ * (currentPosY / initPosY);
                if (x < 0) x = 0.2;
                if (z < 0) z = 0.2;
                cuboid.setScale(x, this.selectedCuboid.top.scale.y, z);
                this.setSelectedChildScale(1 / x, null, 1 / z);
                const differenceX = x / 2 - scaleMemX / 2;
                const differenceY = z / 2 - scaleMemZ / 2;

                if (currentPosX > 0 && currentPosY < 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y -= differenceY;
                } else if (currentPosX > 0 && currentPosY > 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y += differenceY;
                } else if (currentPosX < 0 && currentPosY < 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y -= differenceY;
                } else if (currentPosX < 0 && currentPosY > 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y += differenceY;
                }

                this.action.resize.memScales = { ...this.action.resize.memScales, x, z };
                break;
            }
            case ViewType.FRONT: {
                let y = scaleInitY * (currentPosX / initPosX);
                let z = scaleInitZ * (currentPosY / initPosY);
                if (y < 0) y = 0.2;
                if (z < 0) z = 0.2;
                cuboid.setScale(cuboid.top.scale.x, y, z);
                this.setSelectedChildScale(null, 1 / y, 1 / z);
                let differenceX;
                let differenceY;

                if (!this.action.resize.frontBool) {
                    differenceX = z / 2 - scaleMemZ / 2;
                    differenceY = y / 2 - scaleMemY / 2;
                    this.action.resize.frontBool = true;
                } else {
                    differenceX = z / 2 - scaleMemY / 2;
                    differenceY = y / 2 - scaleMemZ / 2;
                }
                if (currentPosX > 0 && currentPosY < 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y += differenceY;
                } else if (currentPosX > 0 && currentPosY > 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y += differenceY;
                } else if (currentPosX < 0 && currentPosY < 0) {
                    resizeVector.x += differenceX;
                    resizeVector.y -= differenceY;
                } else if (currentPosX < 0 && currentPosY > 0) {
                    resizeVector.x -= differenceX;
                    resizeVector.y -= differenceY;
                }

                this.action.resize.memScales.y = z;
                this.action.resize.memScales.z = y;
                break;
            }
            default:
        }
        const coordinates = resizeVector.clone();
        intersects[0].object.localToWorld(coordinates);
        this.moveObject(coordinates);
        this.adjustPerspectiveCameras();
    }

    private static isLeft(a: any, b: any, c: any): boolean {
        // For reference
        // A
        // |\                // A = Rotation Center
        // | \               // B = Previous Frame Position
        // |  C              // C = Current Frame Position
        // B
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
    }

    private rotateCube(instance: CuboidModel, direction: number, view: ViewType): void {
        switch (view) {
            case ViewType.TOP:
                instance.perspective.rotateZ(direction);
                instance.top.rotateZ(direction);
                instance.side.rotateZ(direction);
                instance.front.rotateZ(direction);
                this.rotateCamera(direction, view);
                break;
            case ViewType.FRONT:
                instance.perspective.rotateX(direction);
                instance.top.rotateX(direction);
                instance.side.rotateX(direction);
                instance.front.rotateX(direction);
                this.rotateCamera(direction, view);
                break;
            case ViewType.SIDE:
                instance.perspective.rotateY(direction);
                instance.top.rotateY(direction);
                instance.side.rotateY(direction);
                instance.front.rotateY(direction);
                this.rotateCamera(direction, view);
                break;
            default:
        }
    }

    private rotateCamera(direction: any, view: ViewType): void {
        switch (view) {
            case ViewType.TOP:
                this.views.top.camera.rotateZ(direction);
                break;
            case ViewType.FRONT:
                this.views.front.camera.rotateZ(direction);
                break;
            case ViewType.SIDE:
                this.views.side.camera.rotateZ(direction);
                break;
            default:
        }
    }

    private attachCamera(view: ViewType): void {
        switch (view) {
            case ViewType.TOP:
                this.selectedCuboid.side.attach(this.views.side.camera);
                this.selectedCuboid.front.attach(this.views.front.camera);
                break;
            case ViewType.SIDE:
                this.selectedCuboid.front.attach(this.views.front.camera);
                this.selectedCuboid.top.attach(this.views.top.camera);
                break;
            case ViewType.FRONT:
                this.selectedCuboid.side.attach(this.views.side.camera);
                this.selectedCuboid.top.attach(this.views.top.camera);
                break;
            default:
        }
    }

    private detachCamera(view: ViewType): void {
        const coordTop = this.selectedCuboid.getReferenceCoordinates(ViewType.TOP);
        const sphericaltop = new THREE.Spherical();
        sphericaltop.setFromVector3(coordTop);

        const coordSide = this.selectedCuboid.getReferenceCoordinates(ViewType.SIDE);
        const sphericalside = new THREE.Spherical();
        sphericalside.setFromVector3(coordSide);

        const coordFront = this.selectedCuboid.getReferenceCoordinates(ViewType.FRONT);
        const sphericalfront = new THREE.Spherical();
        sphericalfront.setFromVector3(coordFront);

        const { side: objectSideView, front: objectFrontView, top: objectTopView } = this.selectedCuboid;
        const { camera: sideCamera } = this.views.side;
        const { camera: frontCamera } = this.views.front;
        const { camera: topCamera } = this.views.top;

        switch (view) {
            case ViewType.TOP: {
                const camRotationSide = objectSideView
                    .getObjectByName('cameraSide')
                    .getWorldQuaternion(new THREE.Quaternion());
                objectSideView.remove(sideCamera);
                sideCamera.position.setFromSpherical(sphericalside);
                sideCamera.lookAt(objectSideView.position.x, objectSideView.position.y, objectSideView.position.z);
                sideCamera.setRotationFromQuaternion(camRotationSide);
                sideCamera.scale.set(1, 1, 1);

                const camRotationFront = objectFrontView
                    .getObjectByName('cameraFront')
                    .getWorldQuaternion(new THREE.Quaternion());
                objectFrontView.remove(frontCamera);
                frontCamera.position.setFromSpherical(sphericalfront);
                frontCamera.lookAt(objectFrontView.position.x, objectFrontView.position.y, objectFrontView.position.z);
                frontCamera.setRotationFromQuaternion(camRotationFront);
                frontCamera.scale.set(1, 1, 1);
                break;
            }
            case ViewType.SIDE: {
                const camRotationFront = objectFrontView
                    .getObjectByName('cameraFront')
                    .getWorldQuaternion(new THREE.Quaternion());
                objectFrontView.remove(frontCamera);
                frontCamera.position.setFromSpherical(sphericalfront);
                frontCamera.lookAt(objectFrontView.position.x, objectFrontView.position.y, objectFrontView.position.z);
                frontCamera.setRotationFromQuaternion(camRotationFront);
                frontCamera.scale.set(1, 1, 1);

                objectTopView.remove(topCamera);
                topCamera.position.setFromSpherical(sphericaltop);
                topCamera.lookAt(objectTopView.position.x, objectTopView.position.y, objectTopView.position.z);
                topCamera.setRotationFromEuler(objectTopView.rotation);
                topCamera.scale.set(1, 1, 1);
                break;
            }
            case ViewType.FRONT: {
                const camRotationSide = objectSideView
                    .getObjectByName('cameraSide')
                    .getWorldQuaternion(new THREE.Quaternion());
                objectSideView.remove(sideCamera);
                sideCamera.position.setFromSpherical(sphericalside);
                sideCamera.lookAt(objectSideView.position.x, objectSideView.position.y, objectSideView.position.z);
                sideCamera.setRotationFromQuaternion(camRotationSide);
                sideCamera.scale.set(1, 1, 1);

                objectTopView.remove(topCamera);
                topCamera.position.setFromSpherical(sphericaltop);
                topCamera.lookAt(objectTopView.position.x, objectTopView.position.y, objectTopView.position.z);
                topCamera.setRotationFromEuler(objectTopView.rotation);
                topCamera.scale.set(1, 1, 1);
                break;
            }
            default: {
                sideCamera.position.setFromSpherical(sphericalside);
                sideCamera.lookAt(objectSideView.position.x, objectSideView.position.y, objectSideView.position.z);
                sideCamera.rotation.z = this.views.side.scene.getObjectByName(Planes.SIDE).rotation.z;
                sideCamera.scale.set(1, 1, 1);

                topCamera.position.setFromSpherical(sphericaltop);
                topCamera.lookAt(objectTopView.position.x, objectTopView.position.y, objectTopView.position.z);
                topCamera.setRotationFromEuler(objectTopView.rotation);
                topCamera.scale.set(1, 1, 1);

                const camFrontRotate = objectFrontView
                    .getObjectByName('camRefRot')
                    .getWorldQuaternion(new THREE.Quaternion());
                frontCamera.position.setFromSpherical(sphericalfront);
                frontCamera.lookAt(objectFrontView.position.x, objectFrontView.position.y, objectFrontView.position.z);
                frontCamera.setRotationFromQuaternion(camFrontRotate);
                frontCamera.scale.set(1, 1, 1);
            }
        }
    }

    private rotatePlane(direction: number, view: ViewType): void {
        const sceneTopPlane = this.views.top.scene.getObjectByName(Planes.TOP);
        const sceneSidePlane = this.views.side.scene.getObjectByName(Planes.SIDE);
        const sceneFrontPlane = this.views.front.scene.getObjectByName(Planes.FRONT);
        switch (view) {
            case ViewType.TOP:
                sceneTopPlane.rotateZ(direction);
                sceneSidePlane.rotateY(direction);
                sceneFrontPlane.rotateX(-direction);
                break;
            case ViewType.SIDE:
                sceneTopPlane.rotateY(direction);
                sceneSidePlane.rotateZ(direction);
                sceneFrontPlane.rotateY(direction);
                break;
            case ViewType.FRONT:
                sceneTopPlane.rotateX(direction);
                sceneSidePlane.rotateX(-direction);
                sceneFrontPlane.rotateZ(direction);
                break;
            default: {
                const { top: objectTopView, side: objectSideView, front: objectFrontView } = this.selectedCuboid;
                objectTopView.add(sceneTopPlane);
                objectSideView.add(sceneSidePlane);
                objectFrontView.add(sceneFrontPlane);
                objectTopView.getObjectByName(Planes.TOP).rotation.set(0, 0, 0);
                objectSideView.getObjectByName(Planes.SIDE).rotation.set(-Math.PI / 2, Math.PI / 2000, Math.PI);
                objectFrontView.getObjectByName(Planes.FRONT).rotation.set(0, Math.PI / 2, 0);

                const quaternionSide = new THREE.Quaternion();
                objectSideView.getObjectByName(Planes.SIDE).getWorldQuaternion(quaternionSide);
                const rotationSide = new THREE.Euler();
                rotationSide.setFromQuaternion(quaternionSide);

                const quaternionFront = new THREE.Quaternion();
                objectFrontView.getObjectByName(Planes.FRONT).getWorldQuaternion(quaternionFront);
                const rotationFront = new THREE.Euler();
                rotationFront.setFromQuaternion(quaternionFront);

                const quaternionTop = new THREE.Quaternion();
                objectTopView.getObjectByName(Planes.TOP).getWorldQuaternion(quaternionTop);
                const rotationTop = new THREE.Euler();
                rotationTop.setFromQuaternion(quaternionTop);

                objectTopView.remove(sceneTopPlane);
                objectSideView.remove(sceneSidePlane);
                objectFrontView.remove(sceneFrontPlane);

                const canvasTopView = this.views.top.renderer.domElement;
                const planeTop = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(
                        canvasTopView.offsetHeight,
                        canvasTopView.offsetWidth,
                        canvasTopView.offsetHeight,
                        canvasTopView.offsetWidth,
                    ),
                    new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        alphaTest: 0,
                        visible: false,
                        transparent: true,
                        opacity: 0.1,
                    }),
                );
                planeTop.name = Planes.TOP;
                (planeTop.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;

                const canvasSideView = this.views.side.renderer.domElement;
                const planeSide = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(
                        canvasSideView.offsetHeight,
                        canvasSideView.offsetWidth,
                        canvasSideView.offsetHeight,
                        canvasSideView.offsetWidth,
                    ),
                    new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        alphaTest: 0,
                        visible: false,
                        transparent: true,
                        opacity: 0.1,
                    }),
                );
                planeSide.name = Planes.SIDE;
                (planeSide.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;

                const canvasFrontView = this.views.front.renderer.domElement;
                const planeFront = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(
                        canvasFrontView.offsetHeight,
                        canvasFrontView.offsetWidth,
                        canvasFrontView.offsetHeight,
                        canvasFrontView.offsetWidth,
                    ),
                    new THREE.MeshBasicMaterial({
                        color: 0x0000ff,
                        alphaTest: 0,
                        visible: false,
                        transparent: true,
                        opacity: 0.5,
                    }),
                );
                planeFront.name = Planes.FRONT;
                (planeFront.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;

                const coordinates = {
                    x: objectTopView.position.x,
                    y: objectTopView.position.y,
                    z: objectTopView.position.z,
                };

                planeTop.rotation.set(rotationTop.x, rotationTop.y, rotationTop.z);
                planeSide.rotation.set(rotationSide.x, rotationSide.y, rotationSide.z);
                planeFront.rotation.set(rotationFront.x, rotationFront.y, rotationFront.z);
                this.views.top.scene.add(planeTop);
                this.views.side.scene.add(planeSide);
                this.views.front.scene.add(planeFront);

                this.translateReferencePlane(coordinates);
            }
        }
    }

    private renderRotateAction(view: ViewType, viewType: any): void {
        const rotationSpeed = Math.PI / CONST.ROTATION_SPEED;
        const { renderer } = viewType;
        const canvas = renderer.domElement;
        if (!canvas) return;
        const canvasCentre = {
            x: canvas.offsetLeft + canvas.offsetWidth / 2,
            y: canvas.offsetTop + canvas.offsetHeight / 2,
        };
        if (
            this.action.rotation.screenInit.x === this.action.rotation.screenMove.x &&
            this.action.rotation.screenInit.y === this.action.rotation.screenMove.y
        ) {
            return;
        }

        if (
            this.action.rotation.recentMouseVector.x === this.views[view].rayCaster.mouseVector.x &&
            this.action.rotation.recentMouseVector.y === this.views[view].rayCaster.mouseVector.y
        ) {
            return;
        }
        this.action.rotation.recentMouseVector = this.views[view].rayCaster.mouseVector.clone();
        if (Canvas3dViewImpl.isLeft(canvasCentre, this.action.rotation.screenInit, this.action.rotation.screenMove)) {
            this.rotateCube(this.selectedCuboid, -rotationSpeed, view);
            this.rotatePlane(-rotationSpeed, view);
        } else {
            this.rotateCube(this.selectedCuboid, rotationSpeed, view);
            this.rotatePlane(rotationSpeed, view);
        }

        this.updateRotationHelperPos();
        this.action.rotation.screenInit.x = this.action.rotation.screenMove.x;
        this.action.rotation.screenInit.y = this.action.rotation.screenMove.y;
    }

    private initiateAction(view: ViewType, viewType: any): void {
        const { clientID } = this.model.data.activeElement;
        const { cuboid, data } = this.drawnObjects[+clientID] || {};
        if (!data || !cuboid || data.lock) return;

        const intersectsHelperResize = viewType.rayCaster.renderer.intersectObjects(
            cuboid[view].parent.children
                .filter((child: THREE.Object3D) => child.name.startsWith(CONST.RESIZE_HELPER_NAME)),
            false,
        );

        if (intersectsHelperResize.length !== 0) {
            this.action.resize.helper = viewType.rayCaster.mouseVector.clone();
            this.action.resize.status = true;
            this.action.detected = true;
            this.views.top.controls.enabled = false;
            this.views.side.controls.enabled = false;
            this.views.front.controls.enabled = false;
            const { x, y, z } = cuboid[view].scale;
            this.action.resize.initScales = { x, y, z };
            this.action.resize.memScales = { x, y, z };
            this.action.resize.frontBool = false;
            this.action.resize.resizeVector = new THREE.Vector3(0, 0, 0);
            return;
        }

        const intersectsHelperRotation = viewType.rayCaster.renderer.intersectObjects(
            cuboid[view].parent.children
                .filter((child: THREE.Object3D) => child.name.startsWith(CONST.ROTATION_HELPER_NAME)),
            false,
        );
        if (intersectsHelperRotation.length !== 0) {
            this.action.rotation.helper = viewType.rayCaster.mouseVector.clone();
            this.action.rotation.status = true;
            this.action.detected = true;
            this.views.top.controls.enabled = false;
            this.views.side.controls.enabled = false;
            this.views.front.controls.enabled = false;
            this.attachCamera(view as ViewType);
            return;
        }

        const intersectsBox = viewType.rayCaster.renderer.intersectObjects([cuboid[view]], false);
        const intersectsPointCloud = viewType.rayCaster.renderer.intersectObjects(
            [viewType.scene.getObjectByName(`${view}Plane`)],
            true,
        );
        if (intersectsBox.length !== 0 && !data.pinned) {
            this.action.translation.helper = viewType.rayCaster.mouseVector.clone();
            this.action.translation.inverseMatrix = intersectsBox[0].object.parent.matrixWorld.invert();
            this.action.translation.offset = intersectsPointCloud[0].point.sub(
                new THREE.Vector3().setFromMatrixPosition(intersectsBox[0].object.matrixWorld),
            );
            this.action.translation.status = true;
            this.action.detected = true;
            this.views.top.controls.enabled = false;
            this.views.side.controls.enabled = false;
            this.views.front.controls.enabled = false;
        }
    }

    public keyControls(key: any): void {
        const { controls } = this.views.perspective;
        if (!controls) return;
        if (key.shiftKey) {
            switch (key.code) {
                case CameraAction.ROTATE_RIGHT:
                    controls.rotate(0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                    break;
                case CameraAction.ROTATE_LEFT:
                    controls.rotate(-0.1 * THREE.MathUtils.DEG2RAD * this.speed, 0, true);
                    break;
                case CameraAction.TILT_UP:
                    controls.rotate(0, -0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                    break;
                case CameraAction.TILT_DOWN:
                    controls.rotate(0, 0.05 * THREE.MathUtils.DEG2RAD * this.speed, true);
                    break;
                default:
                    break;
            }
        } else if (key.altKey === true) {
            switch (key.code) {
                case CameraAction.ZOOM_IN:
                    controls.dolly(CONST.DOLLY_FACTOR, true);
                    break;
                case CameraAction.ZOOM_OUT:
                    controls.dolly(-CONST.DOLLY_FACTOR, true);
                    break;
                case CameraAction.MOVE_LEFT:
                    controls.truck(-0.01 * this.speed, 0, true);
                    break;
                case CameraAction.MOVE_RIGHT:
                    controls.truck(0.01 * this.speed, 0, true);
                    break;
                case CameraAction.MOVE_DOWN:
                    controls.truck(0, -0.01 * this.speed, true);
                    break;
                case CameraAction.MOVE_UP:
                    controls.truck(0, 0.01 * this.speed, true);
                    break;
                default:
                    break;
            }
        } else if (key.code === 'ControlLeft') {
            this.action.selectable = !key.ctrlKey;
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
