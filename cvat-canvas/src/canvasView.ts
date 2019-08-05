/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasModel, UpdateReasons, Geometry } from './canvasModel';
import { Listener, Master } from './master';
import { CanvasController } from './canvasController';

export interface CanvasView {
    html(): HTMLDivElement;
}

interface HTMLAttribute {
    [index: string]: string;
}


function translateToSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = svg.getScreenCTM().inverse();
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length; i += 2) {
        [pt.x] = points;
        [, pt.y] = points;
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

function translateFromSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = svg.getScreenCTM();
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length; i += 2) {
        [pt.x] = points;
        [, pt.y] = points;
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

export class CanvasViewImpl implements CanvasView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private background: SVGSVGElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private rotationWrapper: HTMLDivElement;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private controller: CanvasController;

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;

        // Create HTML elements
        this.loadingAnimation = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.background = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.rotationWrapper = window.document.createElement('div');
        this.canvas = window.document.createElement('div');

        const loadingCircle: SVGCircleElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridPattern: SVGPatternElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        const gridRect: SVGRectElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        // Setup loading animation
        this.loadingAnimation.setAttribute('id', 'canvas_loading_animation');
        loadingCircle.setAttribute('id', 'canvas_loading_circle');
        loadingCircle.setAttribute('r', '30');
        loadingCircle.setAttribute('cx', '50%');
        loadingCircle.setAttribute('cy', '50%');

        // Setup grid
        this.grid.setAttribute('id', 'canvas_grid');
        this.grid.setAttribute('version', '2');
        this.gridPath.setAttribute('d', 'M 1000 0 L 0 0 0 1000');
        this.gridPath.setAttribute('fill', 'none');
        this.gridPath.setAttribute('stroke-width', '1.5');
        gridPattern.setAttribute('id', 'canvas_grid_pattern');
        gridPattern.setAttribute('width', '100');
        gridPattern.setAttribute('height', '100');
        gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        gridRect.setAttribute('width', '100%');
        gridRect.setAttribute('height', '100%');
        gridRect.setAttribute('fill', 'url(#canvas_grid_pattern)');


        // Setup content
        this.text.setAttribute('id', 'canvas_text_content');
        this.background.setAttribute('id', 'canvas_background');
        this.content.setAttribute('id', 'canvas_content');

        // Setup wrappers
        this.rotationWrapper.setAttribute('id', 'canvas_rotation_wrapper');
        this.canvas.setAttribute('id', 'canvas_wrapper');

        // Unite created HTML elements together
        this.loadingAnimation.appendChild(loadingCircle);
        this.grid.appendChild(gridDefs);
        this.grid.appendChild(gridRect);

        gridDefs.appendChild(gridPattern);
        gridPattern.appendChild(this.gridPath);

        this.rotationWrapper.appendChild(this.loadingAnimation);
        this.rotationWrapper.appendChild(this.text);
        this.rotationWrapper.appendChild(this.background);
        this.rotationWrapper.appendChild(this.grid);
        this.rotationWrapper.appendChild(this.content);

        this.canvas.appendChild(this.rotationWrapper);

        // A little hack to get size after first mounting
        // http://www.backalleycoder.com/2012/04/25/i-want-a-damnodeinserted/
        const self = this;
        const canvasFirstMounted = (event: AnimationEvent): void => {
            if (event.animationName === 'loadingAnimation') {
                self.controller.canvasSize = {
                    width: self.rotationWrapper.clientWidth,
                    height: self.rotationWrapper.clientHeight,
                };

                self.rotationWrapper.removeEventListener('animationstart', canvasFirstMounted);
            }
        };

        this.canvas.addEventListener('animationstart', canvasFirstMounted);
        this.content.addEventListener('dblclick', (): void => {
            self.controller.fit();
        });

        this.content.addEventListener('mousedown', (event): void => {
            self.controller.enableDrag(event.clientX, event.clientY);
        });

        this.content.addEventListener('mousemove', (event): void => {
            self.controller.drag(event.clientX, event.clientY);
        });

        window.document.addEventListener('mouseup', (): void => {
            self.controller.disableDrag();
        });

        this.content.addEventListener('wheel', (event): void => {
            const point = translateToSVG(self.background, [event.clientX, event.clientY]);
            self.controller.zoom(point[0], point[1], event.deltaY > 0 ? -1 : 1);
            event.preventDefault();
        });

        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        function transform(geometry: Geometry): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation, this.content]) {
                obj.style.transform = `scale(${geometry.scale})`;
            }
        }

        function resize(geometry: Geometry): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.width = `${geometry.image.width}`;
                obj.style.height = `${geometry.image.height}`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.width = `${geometry.image.width + geometry.offset * 2}`;
                obj.style.height = `${geometry.image.height + geometry.offset * 2}`;
            }
        }

        function move(geometry: Geometry): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.top = `${geometry.top}`;
                obj.style.left = `${geometry.left}`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.top = `${geometry.top - geometry.offset * geometry.scale}`;
                obj.style.left = `${geometry.left - geometry.offset * geometry.scale}`;
            }

            this.content.style.transform = `scale(${geometry.scale})`;
        }

        const { geometry } = this.controller;
        if (reason === UpdateReasons.IMAGE) {
            if (!model.image.length) {
                this.loadingAnimation.classList.remove('canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('canvas_hidden');
                this.background.style.backgroundImage = `url("${model.image}")`;
                move.call(this, geometry);
                resize.call(this, geometry);
                transform.call(this, geometry);
                const event: Event = new Event('canvas.setup');
                this.canvas.dispatchEvent(event);
            }
        } else if (reason === UpdateReasons.ZOOM || reason === UpdateReasons.FIT) {
            move.call(this, geometry);
            resize.call(this, geometry);
            transform.call(this, geometry);
        } else if (reason === UpdateReasons.MOVE) {
            move.call(this, geometry);
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }
}
