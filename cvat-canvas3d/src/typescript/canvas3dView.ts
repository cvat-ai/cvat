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
            scan: null,
            detected: false,
            translation: {
                status: false,
                helper: null,
                coordinates: null,
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

        const canvasPerspectiveView = this.views.perspective.renderer.domElement;
        const canvasTopView = this.views.top.renderer.domElement;
        const canvasSideView = this.views.side.renderer.domElement;
        const canvasFrontView = this.views.front.renderer.domElement;

        canvasPerspectiveView.addEventListener('contextmenu', (e: MouseEvent): void => {
            if (this.controller.focused.clientID !== null) {
                this.dispatchEvent(new CustomEvent('canvas.contextmenu', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        clientID: Number(this.controller.focused.clientID),
                        clientX: e.clientX,
                        clientY: e.clientY,
                    },
                }));
            }
        });

        canvasTopView.addEventListener('mousedown', this.startAction.bind(this, 'top'));
        canvasSideView.addEventListener('mousedown', this.startAction.bind(this, 'side'));
        canvasFrontView.addEventListener('mousedown', this.startAction.bind(this, 'front'));

        canvasTopView.addEventListener('mousemove', this.moveAction.bind(this, 'top'));
        canvasSideView.addEventListener('mousemove', this.moveAction.bind(this, 'side'));
        canvasFrontView.addEventListener('mousemove', this.moveAction.bind(this, 'front'));

        canvasTopView.addEventListener('mouseup', this.resetActions.bind(this));
        canvasSideView.addEventListener('mouseup', this.resetActions.bind(this));
        canvasFrontView.addEventListener('mouseup', this.resetActions.bind(this));

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
            if (this.mode !== Mode.IDLE || !this.views.perspective.rayCaster) return;
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                this.views.perspective.scene.children[0].children,
                false,
            );
            this.dispatchEvent(new CustomEvent('canvas.selected', {
                bubbles: false,
                cancelable: true,
                detail: {
                    clientID: intersects.length !== 0 ? Number(intersects[0].object.name) : null,
                },
            }));
        });

        canvasPerspectiveView.addEventListener('dblclick', (e: MouseEvent): void => {
            e.preventDefault();
            if (this.mode !== Mode.DRAW) return;
            this.controller.drawData.enabled = false;
            this.mode = Mode.IDLE;
            const { x, y, z } = this.cube.perspective.position;
            const { width, height, depth } = (this.cube.perspective.geometry as THREE.BoxGeometry).parameters;
            const { x: rotationX, y: rotationY, z: rotationZ } = this.cube.perspective.rotation;
            const points = [x, y, z, rotationX, rotationY, rotationZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0];
            this.dispatchEvent(new CustomEvent('canvas.drawn', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state: {
                        shapeType: 'cuboid',
                        frame: this.model.data.imageID,
                        ...this.model.data.drawData.initialState,
                        points,
                    },
                    continue: undefined,
                    duration: 0,
                },
            }));
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
            if (viewType.camera) {
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
            }
        });

        model.subscribe(this);
    }

    private startAction(view: any, event: MouseEvent): void {
        const canvas = this.views[view as keyof Views].renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const { mouseVector } = this.views[view as keyof Views].rayCaster as { mouseVector: THREE.Vector2 };
        mouseVector.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        mouseVector.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
        this.action.scan = view;
    }

    private moveAction(view: any, event: MouseEvent): void {
        event.preventDefault();
        const canvas = this.views[view as keyof Views].renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const { mouseVector } = this.views[view as keyof Views].rayCaster as { mouseVector: THREE.Vector2 };
        mouseVector.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        mouseVector.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
    }

    private translateReferencePlane(coordinates: any): void {
        const topPlane = this.views.top.scene.getObjectByName('topPlane');
        if (topPlane) {
            topPlane.position.x = coordinates.x;
            topPlane.position.y = coordinates.y;
            topPlane.position.z = coordinates.z;
        }
        const sidePlane = this.views.top.scene.getObjectByName('sidePlane');
        if (sidePlane) {
            sidePlane.position.x = coordinates.x;
            sidePlane.position.y = coordinates.y;
            sidePlane.position.z = coordinates.z;
        }
        const frontPlane = this.views.top.scene.getObjectByName('frontPlane');
        if (frontPlane) {
            frontPlane.position.x = coordinates.x;
            frontPlane.position.y = coordinates.y;
            frontPlane.position.z = coordinates.z;
        }
    }

    private resetActions(): void {
        const {
            scan, detected, translation,
        } = this.action;
        if (scan !== null && detected) {
            if (translation.status && this.views.top.controls && this.views.side.controls
                && this.views.front.controls) {
                this.translateReferencePlane(translation.coordinates);
                this.views.top.controls.moveTo(translation.coordinates.x, translation.coordinates.y,
                    translation.coordinates.z + 5, false);
                this.views.side.controls.moveTo(translation.coordinates.x, translation.coordinates.y + 5,
                    translation.coordinates.z, false);
                this.views.front.controls.moveTo(translation.coordinates.x + 5, translation.coordinates.y,
                    translation.coordinates.z, false);
            }
        }
        this.action = {
            scan: null,
            detected: false,
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
    }

    private setupObjects(): void {
        if (this.views.perspective.scene.children[0]) {
            const {
                opacity,
                outlined,
                outlineColor,
                selectedOpacity,
                colorBy,
            } = this.model.data.shapeProperties;
            this.clearSceneObjects();
            for (let i = 0; i < this.model.data.objects.length; i++) {
                const object = this.model.data.objects[i];
                const clientID = String(object.clientID);
                if (object.hidden) {
                    continue;
                }
                const cuboid = new CuboidModel(object.occluded ? 'dashed' : 'line',
                    outlined ? outlineColor : '#ffffff');
                cuboid.setName(clientID);
                cuboid.perspective.userData = object;
                let color = '';
                if (colorBy === 'Label') {
                    ({ color } = object.label);
                } else if (colorBy === 'Instance') {
                    ({ color } = object.label);
                } else {
                    ({ color } = object.group);
                }
                cuboid.setOriginalColor(color);
                cuboid.setColor(color);
                cuboid.setOpacity(opacity);
                if (this.model.data.activeElement.clientID === clientID) {
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
                this.addSceneChildren(cuboid);
                cuboid.setPosition(object.points[0],
                    object.points[1], object.points[2]);
            }
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
            const loader = new PCDLoader();
            const objectURL = URL.createObjectURL(model.data.image.imageData);
            this.clearScene();
            loader.load(objectURL, this.addScene.bind(this));
            URL.revokeObjectURL(objectURL);
            this.dispatchEvent(new CustomEvent('canvas.setup'));
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            const { clientID } = this.model.data.activeElement;
            Object.keys(this.views).forEach((view: string): void => {
                const viewType = this.views[view as keyof Views];
                const object = viewType.scene.getObjectByName(clientID as string);
                if (view !== ViewType.PERSPECTIVE && object !== undefined && viewType.controls) {
                    viewType.controls.fitToBox(object, false);
                    viewType.controls.zoom(-4, false);
                }
            });
            this.setupObjects();
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.redraw) {
                const object = this.views.perspective.scene.getObjectByName(String(data.redraw));
                if (object) {
                    object.visible = false;
                }
            }
            this.cube = new CuboidModel('line', '#ffffff');
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            this.setupObjects();
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            this.dispatchEvent(
                new CustomEvent(this.mode === Mode.DRAG_CANVAS ? 'canvas.dragstart' : 'canvas.dragstop',
                    {
                        bubbles: false,
                        cancelable: true,
                    }),
            );
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.controller.drawData.enabled = false;
                this.controller.drawData.redraw = undefined;
                Object.keys(this.views).forEach((view: string): void => {
                    this.views[view as keyof Views].scene.children[0].remove(this.cube[view as keyof Views]);
                });
            }
            this.mode = Mode.IDLE;
            this.dispatchEvent(new CustomEvent('canvas.canceled'));
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            this.dispatchEvent(new CustomEvent('canvas.fit'));
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

    private addScene(points: any): void {
        // eslint-disable-next-line no-param-reassign
        points.material.size = 0.08;
        points.material.color.set(new THREE.Color(0x0000ff));
        const sphereCenter = points.geometry.boundingSphere.center;
        const { radius } = points.geometry.boundingSphere;
        if (!this.views.perspective.camera) return;
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
        // Setup TopView
        const canvasTopView = this.views.top.renderer.domElement;
        const topScenePlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(canvasTopView.offsetHeight,
            canvasTopView.offsetWidth, canvasTopView.offsetHeight, canvasTopView.offsetWidth),
            new THREE.MeshBasicMaterial({
                color: 0xffffff, alphaTest: 0, visible: true, transparent: true, opacity: 0.03,
            }));
        topScenePlane.position.set(0, 0, 0);
        topScenePlane.name = 'topPlane';
        (topScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (topScenePlane as any).verticesNeedUpdate = true;
        this.views.top.scene.add(points.clone());
        this.views.top.scene.add(topScenePlane);
        // Setup Side View
        const canvasSideView = this.views.side.renderer.domElement;
        const sideScenePlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(canvasSideView.offsetHeight,
            canvasSideView.offsetWidth, canvasSideView.offsetHeight, canvasSideView.offsetWidth),
            new THREE.MeshBasicMaterial({
                color: 0xffffff, alphaTest: 0, visible: true, transparent: true, opacity: 0.03,
            }));
        sideScenePlane.position.set(0, 0, 0);
        sideScenePlane.rotation.set(-Math.PI / 2, Math.PI / 2000, Math.PI);
        sideScenePlane.name = 'sidePlane';
        (sideScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (sideScenePlane as any).verticesNeedUpdate = true;
        this.views.side.scene.add(points.clone());
        this.views.side.scene.add(sideScenePlane);
        // Setup front View
        const canvasFrontView = this.views.front.renderer.domElement;
        const frontScenePlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(canvasFrontView.offsetHeight,
            canvasFrontView.offsetWidth, canvasFrontView.offsetHeight, canvasFrontView.offsetWidth),
            new THREE.MeshBasicMaterial({
                color: 0xffffff, alphaTest: 0, visible: true, transparent: true, opacity: 0.03,
            }));
        frontScenePlane.position.set(0, 0, 0);
        frontScenePlane.rotation.set(0, Math.PI / 2, 0);
        frontScenePlane.name = 'frontPlane';
        (frontScenePlane.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
        (frontScenePlane as any).verticesNeedUpdate = true;
        this.views.front.scene.add(points.clone());
        this.views.front.scene.add(frontScenePlane);
        this.setupObjects();
    }

    private positionAllViews(x: number, y: number, z: number): void {
        if (this.views.perspective.controls && this.views.top.controls && this.views.side.controls
            && this.views.front.controls) {
            this.views.perspective.controls.setLookAt(x - 8, y - 8, z + 3, x, y, z, false);
            this.views.top.controls.setLookAt(x, y, z + 8, x, y, z, false);
            this.views.side.controls.setLookAt(x, y + 8, z, x, y, z, false);
            this.views.front.controls.setLookAt(x + 8, y, z, x, y, z, false);
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
                this.views.perspective.renderer.domElement.style.cursor = 'default';
            }
        } else if (this.mode === Mode.IDLE) {
            const { children } = this.views.perspective.scene.children[0];
            const intersects = this.views.perspective.rayCaster.renderer.intersectObjects(
                children,
                false,
            );
            if (intersects.length !== 0) {
                const clientID = intersects[0].object.name;
                if (clientID === undefined || clientID === ''
                    || this.model.data.focusData.clientID === clientID) return;
                const object = this.views.perspective.scene.getObjectByName(clientID);
                if (object === undefined) return;
                this.model.data.focusData.clientID = clientID;
                ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set('#ffffff');
            } else if (this.model.data.focusData.clientID !== null) {
                try {
                    const object = this.views.perspective.scene.getObjectByName(
                        this.model.data.focusData.clientID,
                    );
                    ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set((object as
                        any).originalColor);
                } catch {
                    this.model.data.focusData.clientID = null;
                }
            }
        }
    };

    public render(): void {
        Object.keys(this.views).forEach((view: string): void => {
            const viewType = this.views[view as keyof Views];
            if (!(viewType.controls && viewType.camera && viewType.rayCaster)) return;
            Canvas3dViewImpl.resizeRendererToDisplaySize(view, viewType);
            viewType.controls.update(this.clock.getDelta());
            viewType.renderer.render(viewType.scene, viewType.camera);
            if (view === ViewType.PERSPECTIVE && viewType.scene.children.length !== 0) {
                this.renderRayCaster(viewType);
            }
            // Action Management
            if (this.controller.activeElement.clientID !== null && view !== ViewType.PERSPECTIVE) {
                viewType.rayCaster.renderer.setFromCamera(viewType.rayCaster.mouseVector,
                    viewType.camera);
                // First Scan
                if (this.action.scan === view && 
                    !(this.action.translation.status || this.action.resize.status || this.action.rotation.status)) {
                    this.initiateAction(view, viewType);
                }
                // Action Operations
                if (this.action.scan === view && this.action.detected) {
                    if (this.action.translation) {
                        this.renderTranslateAction(view, viewType);
                    } else if (this.action.resize) {
                        this.renderResizeAction(view, viewType);
                    } else {
                        this.renderRotateAction(view, viewType);
                    }
                }
            }
        });
    }


    private renderTranslateAction(view: ViewType, viewType: any): void {
        const intersects = viewType.rayCaster.renderer.intersectObjects([
            viewType.scene.getObjectByName(`${view}Plane`)], true);
        if (intersects.length !== 0 && intersects[0].point) {
            const coordinates = intersects[0].point;
            this.action.translation.coordinates = coordinates;
            const {
                perspective, top, side, front,
            } = this.model.data.selected;
            perspective.position.copy(coordinates.clone());
            top.position.copy(coordinates.clone());
            side.position.copy(coordinates.clone());
            front.position.copy(coordinates.clone());
        }
    }

    // eslint-disable-next-line class-methods-use-this
    private renderResizeAction(): void {
        // Resize Action TBD
    }

    // eslint-disable-next-line class-methods-use-this
    private renderRotateAction(): void {
        // Rotate Action TBD
    }

    private initiateAction(view: string, viewType: any): void {
        const intersectsHelperResize = viewType.rayCaster.renderer.intersectObjects(
            this.model.data.selected[view].userData.resizeHelpers, false,
        );
        if (intersectsHelperResize.length !== 0) {
            this.action.resize.helper = viewType.rayCaster.mouseVector.clone();
            this.action.resize.status = true;
            this.action.detected = true;
            return;
        }
        const intersectsHelperRotation = viewType.rayCaster.renderer.intersectObjects(
            [this.model.data.selected[view].getObjectByName('rotationHelper')], false,
        );
        if (intersectsHelperRotation.length !== 0) {
            this.action.rotation.helper = viewType.rayCaster.mouseVector.clone();
            this.action.rotation.status = true;
            this.action.detected = true;
            return;
        }
        const intersectsBox = viewType.rayCaster.renderer.intersectObjects(
            [this.model.data.selected[view]], false,
        );
        if (intersectsBox.length !== 0) {
            this.action.translation.helper = viewType.rayCaster.mouseVector.clone();
            this.action.translation.status = true;
            this.action.detected = true;
        }
    }

    public keyControls(key: any): void {
        const { controls } = this.views.perspective;
        if (!controls) return;
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
