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
    Canvas3dModel, DrawData, Mode, Planes, UpdateReasons, ViewType,
} from './canvas3dModel';
import {
    createRotationHelper, CuboidModel, setEdges, setTranslationHelper,
} from './cuboid';

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
    private globalHelpers: any;

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
        this.globalHelpers = {
            top: {
                resize: [],
                rotate: [],
            },
            side: {
                resize: [],
                rotate: [],
            },
            front: {
                resize: [],
                rotate: [],
            },
        };
        this.action = {
            loading: false,
            oldState: '',
            scan: null,
            selectable: true,
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
            if (this.controller.focused.clientID !== null) {
                this.dispatchEvent(
                    new CustomEvent('canvas.contextmenu', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            clientID: Number(this.controller.focused.clientID),
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
                let label;
                if (initState) {
                    ({ label } = initState);
                }
                this.dispatchEvent(
                    new CustomEvent('canvas.drawn', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state: {
                                ...initState,
                                shapeType: 'cuboid',
                                frame: this.model.data.imageID,
                                points,
                                label,
                            },
                            continue: true,
                            duration: 0,
                        },
                    }),
                );
                this.action.oldState = Mode.DRAW;
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
            if (e.detail !== 1) return;
            if (![Mode.GROUP, Mode.IDLE].includes(this.mode) || !this.views.perspective.rayCaster) return;
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children[0].children,
                false,
            );
            if (intersects.length !== 0 && this.mode === Mode.GROUP && this.model.data.groupData.grouped) {
                const item = this.model.data.groupData.grouped.filter(
                    (_state: any): boolean => _state.clientID === Number(intersects[0].object.name),
                );
                if (item.length !== 0) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
                if (intersects.length === 0) {
                    this.setHelperVisibility(false);
                }
                this.dispatchEvent(
                    new CustomEvent('canvas.selected', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            clientID: intersects.length !== 0 ? Number(intersects[0].object.name) : null,
                        },
                    }),
                );
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
                if (intersects.length !== 0 || this.controller.focused.clientID !== null) {
                    this.setDefaultZoom();
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
            let label;
            if (initState) {
                ({ label } = initState);
            }

            if (typeof this.model.data.drawData.redraw === 'number') {
                const [state] = this.model.data.objects.filter(
                    (_state: any): boolean => _state.clientID === Number(this.model.data.selected.perspective.name),
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
            } else {
                this.dispatchEvent(
                    new CustomEvent('canvas.drawn', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state: {
                                ...initState,
                                shapeType: 'cuboid',
                                frame: this.model.data.imageID,
                                points,
                                label,
                            },
                            continue: undefined,
                            duration: 0,
                        },
                    }),
                );
            }
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
        this.views.perspective.camera.position.set(-15, 0, 4);
        this.views.perspective.camera.up.set(0, 0, 1);
        this.views.perspective.camera.lookAt(10, 0, 0);
        this.views.perspective.camera.name = 'cameraPerspective';

        this.views.top.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2 - 2,
            (aspectRatio * viewSize) / 2 + 2,
            viewSize / 2 + 2,
            -viewSize / 2 - 2,
            -50,
            50,
        );

        this.views.top.camera.position.set(0, 0, 5);
        this.views.top.camera.lookAt(0, 0, 0);
        this.views.top.camera.up.set(0, 0, 1);
        this.views.top.camera.name = 'cameraTop';

        this.views.side.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -50,
            50,
        );
        this.views.side.camera.position.set(0, 5, 0);
        this.views.side.camera.lookAt(0, 0, 0);
        this.views.side.camera.up.set(0, 0, 1);
        this.views.side.camera.name = 'cameraSide';

        this.views.front.camera = new THREE.OrthographicCamera(
            (-aspectRatio * viewSize) / 2,
            (aspectRatio * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -50,
            50,
        );
        this.views.front.camera.position.set(3, 0, 0);
        this.views.front.camera.up.set(0, 0, 1);
        this.views.front.camera.lookAt(0, 0, 0);
        this.views.front.camera.name = 'cameraFront';

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
                    viewType.controls.mouseButtons.wheel = CameraControls.ACTION.NONE;
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

        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view: ViewType): void => {
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
                    this.setHelperSize(view);
                },
                { passive: false },
            );
        });

        model.subscribe(this);
    }

    private setDefaultZoom(): void {
        if (this.model.data.activeElement === 'null') {
            Object.keys(this.views).forEach((view: string): void => {
                const viewType = this.views[view as keyof Views];
                if (view !== ViewType.PERSPECTIVE) {
                    viewType.camera.zoom = CONST.FOV_DEFAULT;
                    viewType.camera.updateProjectionMatrix();
                }
            });
        } else {
            const canvasTop = this.views.top.renderer.domElement;
            const bboxtop = new THREE.Box3().setFromObject(this.model.data.selected.top);
            const x1 = Math.min(
                canvasTop.offsetWidth / (bboxtop.max.x - bboxtop.min.x),
                canvasTop.offsetHeight / (bboxtop.max.y - bboxtop.min.y),
            ) * 0.4;
            this.views.top.camera.zoom = x1 / 100;
            this.views.top.camera.updateProjectionMatrix();
            this.views.top.camera.updateMatrix();
            this.setHelperSize(ViewType.TOP);

            const canvasFront = this.views.top.renderer.domElement;
            const bboxfront = new THREE.Box3().setFromObject(this.model.data.selected.front);
            const x2 = Math.min(
                canvasFront.offsetWidth / (bboxfront.max.y - bboxfront.min.y),
                canvasFront.offsetHeight / (bboxfront.max.z - bboxfront.min.z),
            ) * 0.4;
            this.views.front.camera.zoom = x2 / 100;
            this.views.front.camera.updateProjectionMatrix();
            this.views.front.camera.updateMatrix();
            this.setHelperSize(ViewType.FRONT);

            const canvasSide = this.views.side.renderer.domElement;
            const bboxside = new THREE.Box3().setFromObject(this.model.data.selected.side);
            const x3 = Math.min(
                canvasSide.offsetWidth / (bboxside.max.x - bboxside.min.x),
                canvasSide.offsetHeight / (bboxside.max.z - bboxside.min.z),
            ) * 0.4;
            this.views.side.camera.zoom = x3 / 100;
            this.views.side.camera.updateProjectionMatrix();
            this.views.side.camera.updateMatrix();
            this.setHelperSize(ViewType.SIDE);
        }
    }

    private startAction(view: any, event: MouseEvent): void {
        if (event.detail !== 1) return;
        if (this.model.mode === Mode.DRAG_CANVAS) return;
        const { clientID } = this.model.data.activeElement;
        if (clientID === 'null') return;
        const canvas = this.views[view as keyof Views].renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const { mouseVector } = this.views[view as keyof Views].rayCaster as { mouseVector: THREE.Vector2 };
        const diffX = event.clientX - rect.left;
        const diffY = event.clientY - rect.top;
        mouseVector.x = (diffX / canvas.clientWidth) * 2 - 1;
        mouseVector.y = -(diffY / canvas.clientHeight) * 2 + 1;
        this.action.rotation.screenInit = { x: diffX, y: diffY };
        this.action.rotation.screenMove = { x: diffX, y: diffY };
        if (
            this.model.data.selected &&
            !this.model.data.selected.perspective.userData.lock &&
            !this.model.data.selected.perspective.userData.hidden
        ) {
            this.action.scan = view;
            this.model.mode = Mode.EDIT;
            this.action.selectable = false;
        }
    }

    private moveAction(view: any, event: MouseEvent): void {
        event.preventDefault();
        if (this.model.mode === Mode.DRAG_CANVAS) return;
        const { clientID } = this.model.data.activeElement;
        if (clientID === 'null') return;
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
        this.action.selectable = true;
    }

    private completeActions(): void {
        const { scan, detected } = this.action;
        if (this.model.mode === Mode.DRAG_CANVAS) return;
        if (!detected) {
            this.resetActions();
            return;
        }

        const { x, y, z } = this.model.data.selected[scan].position;
        const { x: width, y: height, z: depth } = this.model.data.selected[scan].scale;
        const { x: rotationX, y: rotationY, z: rotationZ } = this.model.data.selected[scan].rotation;
        const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
        const [state] = this.model.data.objects.filter(
            (_state: any): boolean => _state.clientID === Number(this.model.data.selected[scan].name),
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
        if (this.action.rotation.status) {
            this.detachCamera(scan);
        }

        this.adjustPerspectiveCameras();
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

    private setupObject(object: any, addToScene: boolean): CuboidModel {
        const {
            opacity, outlined, outlineColor, selectedOpacity, colorBy,
        } = this.model.data.shapeProperties;
        const clientID = String(object.clientID);
        const cuboid = new CuboidModel(object.occluded ? 'dashed' : 'line', outlined ? outlineColor : '#ffffff');

        cuboid.setName(clientID);
        cuboid.perspective.userData = object;
        let color = '';
        if (colorBy === 'Label') {
            ({ color } = object.label);
        } else if (colorBy === 'Instance') {
            ({ color } = object);
        } else {
            ({ color } = object.group);
        }
        cuboid.setOriginalColor(color);
        cuboid.setColor(color);
        cuboid.setOpacity(opacity);

        if (
            this.model.data.activeElement.clientID === clientID &&
            ![Mode.DRAG_CANVAS, Mode.GROUP].includes(this.mode)
        ) {
            cuboid.setOpacity(selectedOpacity);
            if (!object.lock) {
                createRotationHelper(cuboid.top, ViewType.TOP);
                createRotationHelper(cuboid.side, ViewType.SIDE);
                createRotationHelper(cuboid.front, ViewType.FRONT);
                setTranslationHelper(cuboid.top);
                setTranslationHelper(cuboid.side);
                setTranslationHelper(cuboid.front);
            }
            setEdges(cuboid.top);
            setEdges(cuboid.side);
            setEdges(cuboid.front);
            this.translateReferencePlane(new THREE.Vector3(object.points[0], object.points[1], object.points[2]));
            this.model.data.selected = cuboid;
            if (object.hidden) {
                this.setHelperVisibility(false);
                return cuboid;
            }
        } else {
            cuboid.top.visible = false;
            cuboid.side.visible = false;
            cuboid.front.visible = false;
        }
        if (object.hidden) {
            return cuboid;
        }
        cuboid.setPosition(object.points[0], object.points[1], object.points[2]);
        cuboid.setScale(object.points[6], object.points[7], object.points[8]);
        cuboid.setRotation(object.points[3], object.points[4], object.points[5]);
        if (addToScene) {
            this.addSceneChildren(cuboid);
        }
        if (this.model.data.activeElement.clientID === clientID) {
            cuboid.attachCameraReference();
            this.rotatePlane(null, null);
            this.action.detachCam = true;
            this.action.detachCamRef = this.model.data.activeElement.clientID;
            if (!object.lock) {
                this.setSelectedChildScale(1 / cuboid.top.scale.x, 1 / cuboid.top.scale.y, 1 / cuboid.top.scale.z);
                this.setHelperVisibility(true);
                this.updateRotationHelperPos();
                this.updateResizeHelperPos();
            } else {
                this.setHelperVisibility(false);
            }
        }
        return cuboid;
    }

    private setupObjects(): void {
        if (this.views.perspective.scene.children[0]) {
            this.clearSceneObjects();
            this.setHelperVisibility(false);
            for (let i = 0; i < this.model.data.objects.length; i++) {
                const object = this.model.data.objects[i];
                this.setupObject(object, true);
            }
            this.action.loading = false;
        }
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
            if (!model.data.image) return;
            this.dispatchEvent(new CustomEvent('canvas.canceled'));
            if (this.model.mode === Mode.DRAW) {
                this.model.data.drawData.enabled = false;
            }
            this.views.perspective.renderer.dispose();
            this.model.mode = Mode.BUSY;
            this.action.loading = true;
            const loader = new PCDLoader();
            const objectURL = URL.createObjectURL(model.data.image.imageData);
            this.clearScene();
            loader.load(objectURL, this.addScene.bind(this));
            URL.revokeObjectURL(objectURL);
            this.dispatchEvent(new CustomEvent('canvas.setup'));
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            const { clientID } = this.model.data.activeElement;
            this.setupObjects();
            if (clientID !== 'null') {
                this.setDefaultZoom();
            }
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            this.cube = new CuboidModel('line', '#ffffff');
            if (data.redraw) {
                const object = this.views.perspective.scene.getObjectByName(String(data.redraw));
                if (object) {
                    this.cube.perspective = object.clone() as THREE.Mesh;
                    object.visible = false;
                }
            } else if (data.initialState) {
                this.model.data.activeElement.clientID = 'null';
                this.setupObjects();
                this.cube = this.setupObject(data.initialState, false);
            }
            this.setHelperVisibility(false);
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            this.setupObjects();
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            this.dispatchEvent(
                new CustomEvent(this.model.mode === Mode.DRAG_CANVAS ? 'canvas.dragstart' : 'canvas.dragstop', {
                    bubbles: false,
                    cancelable: true,
                }),
            );
            this.model.data.activeElement.clientID = 'null';
            if (this.model.mode === Mode.DRAG_CANVAS) {
                const { controls } = this.views.perspective;
                controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
                controls.mouseButtons.right = CameraControls.ACTION.TRUCK;
                controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
                controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
                controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;
                controls.touches.three = CameraControls.ACTION.TOUCH_TRUCK;
            }
            this.setupObjects();
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.controller.drawData.enabled = false;
                this.controller.drawData.redraw = undefined;
                Object.keys(this.views).forEach((view: string): void => {
                    this.views[view as keyof Views].scene.children[0].remove(this.cube[view as keyof Views]);
                });
            }
            this.model.data.groupData.grouped = [];
            this.setHelperVisibility(false);
            this.model.mode = Mode.IDLE;
            const { controls } = this.views.perspective;
            controls.mouseButtons.left = CameraControls.ACTION.NONE;
            controls.mouseButtons.right = CameraControls.ACTION.NONE;
            controls.mouseButtons.wheel = CameraControls.ACTION.NONE;
            controls.touches.one = CameraControls.ACTION.NONE;
            controls.touches.two = CameraControls.ACTION.NONE;
            controls.touches.three = CameraControls.ACTION.NONE;
            this.dispatchEvent(new CustomEvent('canvas.canceled'));
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            this.dispatchEvent(new CustomEvent('canvas.fit'));
        } else if (reason === UpdateReasons.GROUP) {
            if (!this.model.groupData.enabled) {
                this.onGroupDone(this.model.data.groupData.grouped);
            } else {
                this.model.data.groupData.grouped = [];
                this.model.data.activeElement.clientID = 'null';
                this.setupObjects();
            }
        }
    }

    private clearScene(): void {
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children = [];
        });
    }

    private clearSceneObjects(): void {
        Object.keys(this.views).forEach((view: string): void => {
            this.views[view as keyof Views].scene.children[0].children = [];
        });
    }

    private setHelperVisibility(visibility: boolean): void {
        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((viewType: ViewType): void => {
            const globalRotationObject = this.views[viewType].scene.getObjectByName('globalRotationHelper');
            if (globalRotationObject) {
                globalRotationObject.visible = visibility;
            }
            for (let i = 0; i < 8; i++) {
                const resizeObject = this.views[viewType].scene.getObjectByName(`globalResizeHelper${i}`);
                if (resizeObject) {
                    resizeObject.visible = visibility;
                }
            }
        });
    }

    private static setupRotationHelper(): THREE.Mesh {
        const sphereGeometry = new THREE.SphereGeometry(0.15);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1, visible: true });
        const rotationHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
        rotationHelper.name = 'globalRotationHelper';
        return rotationHelper;
    }

    private updateRotationHelperPos(): void {
        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view: ViewType): void => {
            const point = new THREE.Vector3(0, 0, 0);
            this.model.data.selected[view].getObjectByName('rotationHelper').getWorldPosition(point);
            const globalRotationObject = this.views[view].scene.getObjectByName('globalRotationHelper');
            if (globalRotationObject) {
                globalRotationObject.position.set(point.x, point.y, point.z);
            }
        });
    }

    private setHelperSize(viewType: ViewType): void {
        if ([ViewType.TOP, ViewType.SIDE, ViewType.FRONT].includes(viewType)) {
            const { camera } = this.views[viewType];
            if (!camera || camera instanceof THREE.PerspectiveCamera) return;
            const factor = (camera.top - camera.bottom) / camera.zoom;
            const rotationObject = this.views[viewType].scene.getObjectByName('globalRotationHelper');
            if (rotationObject) {
                rotationObject.scale.set(1, 1, 1).multiplyScalar(factor / 10);
            }
            for (let i = 0; i < 8; i++) {
                const resizeObject = this.views[viewType].scene.getObjectByName(`globalResizeHelper${i}`);
                if (resizeObject) {
                    resizeObject.scale.set(1, 1, 1).multiplyScalar(factor / 10);
                }
            }
        }
    }

    private setupResizeHelper(viewType: ViewType): void {
        const sphereGeometry = new THREE.SphereGeometry(0.15);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 1, visible: true });
        const helpers = [];
        for (let i = 0; i < 8; i++) {
            helpers[i] = new THREE.Mesh(sphereGeometry.clone(), sphereMaterial.clone());
            helpers[i].name = `globalResizeHelper${i}`;
            this.globalHelpers[viewType].resize.push(helpers[i]);
            this.views[viewType].scene.add(helpers[i]);
        }
    }

    private updateResizeHelperPos(): void {
        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view: ViewType): void => {
            let i = 0;
            this.model.data.selected[view].children.forEach((element: any): void => {
                if (element.name === 'resizeHelper') {
                    const p = new THREE.Vector3(0, 0, 0);
                    element.getWorldPosition(p);
                    const name = `globalResizeHelper${i}`;
                    const object = this.views[view].scene.getObjectByName(name);
                    if (object) {
                        object.position.set(p.x, p.y, p.z);
                    }
                    i++;
                }
            });
        });
    }

    private addScene(points: any): void {
        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.05;
        points.material.color.set(new THREE.Color(0xffffff));
        const material = points.material.clone();
        const sphereCenter = points.geometry.boundingSphere.center;
        const { radius } = points.geometry.boundingSphere;
        if (!this.views.perspective.camera) return;
        const xRange = -radius / 2 < this.views.perspective.camera.position.x - sphereCenter.x &&
            radius / 2 > this.views.perspective.camera.position.x - sphereCenter.x;
        const yRange = -radius / 2 < this.views.perspective.camera.position.y - sphereCenter.y &&
            radius / 2 > this.views.perspective.camera.position.y - sphereCenter.y;
        const zRange = -radius / 2 < this.views.perspective.camera.position.z - sphereCenter.z &&
            radius / 2 > this.views.perspective.camera.position.z - sphereCenter.z;
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
            this.action.frameCoordinates = { x: newX, y: newY, z: newZ };
            this.positionAllViews(newX, newY, newZ, false);
        }

        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view: ViewType): void => {
            this.globalHelpers[view].resize = [];
            this.globalHelpers[view].rotation = [];
        });

        this.views.perspective.scene.add(points.clone());
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
        const topRotationHelper = Canvas3dViewImpl.setupRotationHelper();
        this.globalHelpers.top.rotation.push(topRotationHelper);
        this.views.top.scene.add(topRotationHelper);
        this.setupResizeHelper(ViewType.TOP);
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
        const sideRotationHelper = Canvas3dViewImpl.setupRotationHelper();
        this.globalHelpers.side.rotation.push(sideRotationHelper);
        this.views.side.scene.add(sideRotationHelper);
        this.setupResizeHelper(ViewType.SIDE);
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
        const frontRotationHelper = Canvas3dViewImpl.setupRotationHelper();
        this.globalHelpers.front.rotation.push(frontRotationHelper);
        this.views.front.scene.add(frontRotationHelper);
        this.setupResizeHelper(ViewType.FRONT);
        this.setHelperVisibility(false);
        this.setupObjects();
    }

    private positionAllViews(x: number, y: number, z: number, animation: boolean): void {
        if (
            this.views.perspective.controls &&
            this.views.top.controls &&
            this.views.side.controls &&
            this.views.front.controls
        ) {
            this.views.perspective.controls.setLookAt(x - 8, y - 8, z + 3, x, y, z, animation);
            this.views.top.camera.position.set(x, y, z + 8);
            this.views.top.camera.lookAt(x, y, z);
            this.views.top.camera.zoom = CONST.FOV_DEFAULT;
            this.views.side.camera.position.set(x, y + 8, z);
            this.views.side.camera.lookAt(x, y, z);
            this.views.side.camera.zoom = CONST.FOV_DEFAULT;
            this.views.front.camera.position.set(x + 8, y, z);
            this.views.front.camera.lookAt(x, y, z);
            this.views.front.camera.zoom = CONST.FOV_DEFAULT;
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
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children,
                false,
            );
            if (intersects.length > 0) {
                this.views.perspective.scene.children[0].add(this.cube.perspective);
                const newPoints = intersects[0].point;
                this.cube.perspective.position.copy(newPoints);
                this.views.perspective.renderer.domElement.style.cursor = 'default';
            }
        } else if (this.mode === Mode.IDLE) {
            const { children } = this.views.perspective.scene.children[0];
            const { renderer } = this.views.perspective.rayCaster;
            const intersects = renderer.intersectObjects(children, false);
            if (intersects.length !== 0) {
                const clientID = intersects[0].object.name;
                if (clientID === undefined || clientID === '' || this.model.data.focusData.clientID === clientID) {
                    return;
                }
                if (!this.action.selectable) return;
                this.resetColor();
                const object = this.views.perspective.scene.getObjectByName(clientID);
                if (object === undefined) return;
                this.model.data.focusData.clientID = clientID;
                this.dispatchEvent(
                    new CustomEvent('canvas.selected', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            clientID: Number(intersects[0].object.name),
                        },
                    }),
                );
            } else if (this.model.data.focusData.clientID !== null) {
                this.resetColor();
                this.model.data.focusData.clientID = null;
            }
        }
    };

    private resetColor(): void {
        this.model.data.objects.forEach((object: any): void => {
            const { clientID } = object;
            const target = this.views.perspective.scene.getObjectByName(String(clientID));
            if (target) {
                ((target as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set((target as any).originalColor);
            }
        });
    }

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
            if (clientID !== 'null' && view !== ViewType.PERSPECTIVE) {
                viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector, viewType.camera);
                // First Scan
                if (this.action.scan === view) {
                    if (!(this.action.translation.status || this.action.resize.status || this.action.rotation.status)) {
                        this.initiateAction(view, viewType);
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
                        this.updateRotationHelperPos();
                        this.updateResizeHelperPos();
                    } else {
                        this.resetActions();
                    }
                }
            }
        });
        if (this.action.detachCam && this.action.detachCamRef === this.model.data.activeElement.clientID) {
            try {
                this.detachCamera(null);
                // eslint-disable-next-line no-empty
            } catch (e) {
            } finally {
                this.action.detachCam = false;
            }
        }
        if (this.model.mode === Mode.BUSY && !this.action.loading) {
            if (this.action.oldState !== '') {
                this.model.mode = this.action.oldState;
                this.action.oldState = '';
            } else {
                this.model.mode = Mode.IDLE;
            }
        } else if (this.model.data.objectUpdating && !this.action.loading) {
            this.model.data.objectUpdating = false;
        }
    }

    private adjustPerspectiveCameras(): void {
        const coordinatesTop = this.model.data.selected.getReferenceCoordinates(ViewType.TOP);
        const sphericalTop = new THREE.Spherical();
        sphericalTop.setFromVector3(coordinatesTop);
        this.views.top.camera.position.setFromSpherical(sphericalTop);
        this.views.top.camera.updateProjectionMatrix();

        const coordinatesSide = this.model.data.selected.getReferenceCoordinates(ViewType.SIDE);
        const sphericalSide = new THREE.Spherical();
        sphericalSide.setFromVector3(coordinatesSide);
        this.views.side.camera.position.setFromSpherical(sphericalSide);
        this.views.side.camera.updateProjectionMatrix();

        const coordinatesFront = this.model.data.selected.getReferenceCoordinates(ViewType.FRONT);
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
        } = this.model.data.selected;
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
    }

    private setSelectedChildScale(x: number, y: number, z: number): void {
        [ViewType.TOP, ViewType.SIDE, ViewType.FRONT].forEach((view: ViewType): void => {
            this.model.data.selected[view].children.forEach((element: any): void => {
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

    private renderResizeAction(view: ViewType, viewType: any): void {
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
                this.model.data.selected.setScale(y, x, this.model.data.selected.top.scale.z);
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
                this.model.data.selected.setScale(x, this.model.data.selected.top.scale.y, z);
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
                this.model.data.selected.setScale(this.model.data.selected.top.scale.x, y, z);
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
                this.model.data.selected.side.attach(this.views.side.camera);
                this.model.data.selected.front.attach(this.views.front.camera);
                break;
            case ViewType.SIDE:
                this.model.data.selected.front.attach(this.views.front.camera);
                this.model.data.selected.top.attach(this.views.top.camera);
                break;
            case ViewType.FRONT:
                this.model.data.selected.side.attach(this.views.side.camera);
                this.model.data.selected.top.attach(this.views.top.camera);
                break;
            default:
        }
    }

    private detachCamera(view: ViewType): void {
        const coordTop = this.model.data.selected.getReferenceCoordinates(ViewType.TOP);
        const sphericaltop = new THREE.Spherical();
        sphericaltop.setFromVector3(coordTop);

        const coordSide = this.model.data.selected.getReferenceCoordinates(ViewType.SIDE);
        const sphericalside = new THREE.Spherical();
        sphericalside.setFromVector3(coordSide);

        const coordFront = this.model.data.selected.getReferenceCoordinates(ViewType.FRONT);
        const sphericalfront = new THREE.Spherical();
        sphericalfront.setFromVector3(coordFront);

        const { side: objectSideView, front: objectFrontView, top: objectTopView } = this.model.data.selected;
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
                const { top: objectTopView, side: objectSideView, front: objectFrontView } = this.model.data.selected;
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
            this.rotateCube(this.model.data.selected, -rotationSpeed, view);
            this.rotatePlane(-rotationSpeed, view);
        } else {
            this.rotateCube(this.model.data.selected, rotationSpeed, view);
            this.rotatePlane(rotationSpeed, view);
        }
        this.action.rotation.screenInit.x = this.action.rotation.screenMove.x;
        this.action.rotation.screenInit.y = this.action.rotation.screenMove.y;
    }

    private initiateAction(view: string, viewType: any): void {
        const intersectsHelperResize = viewType.rayCaster.renderer.intersectObjects(
            this.globalHelpers[view].resize,
            false,
        );
        const [state] = this.model.data.objects.filter(
            (_state: any): boolean => _state.clientID === Number(this.model.data.selected[view].name),
        );
        if (state.lock) return;

        if (intersectsHelperResize.length !== 0) {
            this.action.resize.helper = viewType.rayCaster.mouseVector.clone();
            this.action.resize.status = true;
            this.action.detected = true;
            this.views.top.controls.enabled = false;
            this.views.side.controls.enabled = false;
            this.views.front.controls.enabled = false;
            const { x, y, z } = this.model.data.selected[view].scale;
            this.action.resize.initScales = { x, y, z };
            this.action.resize.memScales = { x, y, z };
            this.action.resize.frontBool = false;
            this.action.resize.resizeVector = new THREE.Vector3(0, 0, 0);
            return;
        }
        const intersectsHelperRotation = viewType.rayCaster.renderer.intersectObjects(
            this.globalHelpers[view].rotation,
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

        const intersectsBox = viewType.rayCaster.renderer.intersectObjects([this.model.data.selected[view]], false);
        const intersectsPointCloud = viewType.rayCaster.renderer.intersectObjects(
            [viewType.scene.getObjectByName(`${view}Plane`)],
            true,
        );
        if (intersectsBox.length !== 0) {
            if (state.pinned) return;
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
