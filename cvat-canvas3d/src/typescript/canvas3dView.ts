// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Canvas3dController } from './canvas3dController';
import { Listener, Master } from './master';

import consts from './consts';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';


import {
    Canvas3dModel,
    UpdateReasons,
    ActiveElement,
    Mode,
    Configuration,

} from './canvas3dModel';

export interface Canvas3dView {
    html(): HTMLDivElement;

    render(): any;
}

export class Canvas3dViewImpl implements Canvas3dView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private adoptedText: SVG.Container;
    private background: HTMLCanvasElement;
    private bitmap: HTMLCanvasElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private attachmentBoard: HTMLDivElement;
    private adoptedContent: SVG.Container;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private gridPattern: SVGPatternElement;
    private controller: Canvas3dController;
    private svgShapes: Record<number, SVG.Shape>;
    private svgTexts: Record<number, SVG.Text>;
    private drawnIssueRegions: Record<number, SVG.Shape>;
    private activeElement: ActiveElement;
    private configuration: Configuration;
    private renderer: any;
    private scene: any;
    private camera: any;
    private canvas3dBackground: any;
    private serviceFlags: {
        drawHidden: Record<number, boolean>;
    };

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    private stateIsLocked(state: any): boolean {
        const { configuration } = this.controller;
        return state.lock || configuration.forceDisableEditing;
    }

    public constructor(model: Canvas3dModel & Master, controller: Canvas3dController) {
        this.controller = controller;
        this.svgShapes = {};
        this.svgTexts = {};
        this.drawnStates = {};
        this.drawnIssueRegions = {};
        this.activeElement = {
            clientID: null,
            attributeID: null,
        };
        this.configuration = model.configuration;
        this.mode = Mode.IDLE;
        this.serviceFlags = {
            drawHidden: {},
        };

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

        document.body.appendChild(this.renderer.domElement);
        this.canvas3dBackground = document.body.appendChild(this.renderer.domElement);
        this.canvas3dBackground.setAttribute('id', 'cvat_canvas_3d');

        // Create HTML elements
        this.loadingAnimation = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = SVG.adopt((this.text as any) as HTMLElement) as SVG.Container;
        this.background = window.document.createElement('canvas');
        this.bitmap = window.document.createElement('canvas');
        // window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.gridPattern = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedContent = SVG.adopt((this.content as any) as HTMLElement) as SVG.Container;

        this.attachmentBoard = window.document.createElement('div');

        this.canvas = window.document.createElement('div');

        const loadingCircle: SVGCircleElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridRect: SVGRectElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        // Setup defs
        const contentDefs = this.adoptedContent.defs();

        // Setup loading animation
        this.loadingAnimation.setAttribute('id', 'cvat_canvas_loading_animation');
        loadingCircle.setAttribute('id', 'cvat_canvas_loading_circle');
        loadingCircle.setAttribute('r', '30');
        loadingCircle.setAttribute('cx', '50%');
        loadingCircle.setAttribute('cy', '50%');

        // Setup grid
        this.grid.setAttribute('id', 'cvat_canvas_grid');
        this.grid.setAttribute('version', '2');
        this.gridPath.setAttribute('d', 'M 1000 0 L 0 0 0 1000');
        this.gridPath.setAttribute('fill', 'none');
        this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH}`);
        this.gridPath.setAttribute('opacity', 'inherit');
        this.gridPattern.setAttribute('id', 'cvat_canvas_grid_pattern');
        this.gridPattern.setAttribute('width', '100');
        this.gridPattern.setAttribute('height', '100');
        this.gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        gridRect.setAttribute('width', '100%');
        gridRect.setAttribute('height', '100%');
        gridRect.setAttribute('fill', 'url(#cvat_canvas_grid_pattern)');

        // Setup content
        this.text.setAttribute('id', 'cvat_canvas_text_content');
        this.background.setAttribute('id', 'cvat_canvas_background');
        this.content.setAttribute('id', 'cvat_canvas_content');
        this.bitmap.setAttribute('id', 'cvat_canvas_bitmap');
        this.bitmap.style.display = 'none';

        // Setup sticked div
        this.attachmentBoard.setAttribute('id', 'cvat_canvas_attachment_board');

        // Setup wrappers
        this.canvas.setAttribute('id', 'cvat_canvas_wrapper');

        // Unite created HTML elements together
        this.loadingAnimation.appendChild(loadingCircle);
        this.grid.appendChild(gridDefs);
        this.grid.appendChild(gridRect);

        gridDefs.appendChild(this.gridPattern);
        this.gridPattern.appendChild(this.gridPath);

        this.canvas.appendChild(this.loadingAnimation);
        this.canvas.appendChild(this.text);
        this.canvas.appendChild(this.background);
        this.canvas.appendChild(this.bitmap);
        this.canvas.appendChild(this.grid);
        this.canvas.appendChild(this.content);
        this.canvas.appendChild(this.attachmentBoard);

        const self = this;

        // Setup event handlers
        this.content.addEventListener('dblclick', (e: MouseEvent): void => {
            self.controller.fit();
            e.preventDefault();
        });

        model.subscribe(this);
    }

    public async notify(model: Canvas3dModel & Master, reason: UpdateReasons): void {

        if (reason === UpdateReasons.IMAGE_CHANGED) {
            const loader = new PCDLoader();
            this.clearScene()
            const objectURL = URL.createObjectURL(model.data.image.imageData);
            loader.load(objectURL, this.addScene.bind(this))
            URL.revokeObjectURL(objectURL)
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.renderer.domElement.dispatchEvent(event);
        }
    }

    public clearScene() {
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            this.scene.remove(this.scene.children[i]);
        }
    }

    public addScene(points: any) {
        points.material.size = 0.03;
        points.material.color = new THREE.Color(0x0000ff);
        this.scene.add(points)
    }

    public render() {
        this.renderer.render(this.scene, this.camera);

    }

    public html(): any {
        this.render();
        return this.renderer.domElement;
    }

}
