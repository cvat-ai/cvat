/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import { CanvasModel, UpdateReasons } from './canvasModel';
import { Listener, Master } from './master';
import { CanvasController } from './canvasController';

export interface CanvasView {
    html(): HTMLDivElement;
}

interface HTMLAttribute {
    [index: string]: string;
}

export class CanvasViewImpl implements CanvasView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private background: SVGSVGElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private rotationWrapper: HTMLDivElement;
    private gridPath: SVGPathElement;
    private model: CanvasModel & Master;
    private controller: CanvasController;

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.model = model;
        this.controller = controller;

        // Create HTML elements
        this.loadingAnimation = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.background = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.rotationWrapper = window.document.createElement('div');

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
        gridRect.setAttribute('width', '100%classList.remove('canvas_hidden');');
        gridRect.setAttribute('height', '100%');
        gridRect.setAttribute('fill', 'url(#canvas_grid_pattern)');


        // Setup content
        this.text.setAttribute('id', 'canvas_text_content');
        this.background.setAttribute('id', 'canvas_background');
        this.content.setAttribute('id', 'canvas_content');

        // Setup wrappers
        this.rotationWrapper.style.width = '100%';
        this.rotationWrapper.style.height = '100%';
        this.rotationWrapper.style.position = 'relatiove';

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

        // A little hack to get size after first mounting
        // http://www.backalleycoder.com/2012/04/25/i-want-a-damnodeinserted/
        const self = this;
        const canvasFirstMounted = (event: AnimationEvent): void => {
            if (event.animationName === 'loadingAnimation') {
                self.model.imageSize = {
                    width: self.rotationWrapper.clientWidth,
                    height: self.rotationWrapper.clientHeight,
                };

                self.rotationWrapper.removeEventListener('animationstart', canvasFirstMounted);
            }
        };

        this.rotationWrapper.addEventListener('animationstart', canvasFirstMounted);
        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        if (reason === UpdateReasons.IMAGE) {
            if (!model.image.length) {
                this.loadingAnimation.classList.remove('canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('canvas_hidden');
                this.background.style.backgroundImage = `url("${model.image}")`;
                const { geometry } = this.controller;

                for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                    obj.style.width = `${geometry.image.width}`;
                    obj.style.height = `${geometry.image.height}`;
                    obj.style.top = `${geometry.top}`;
                    obj.style.left = `${geometry.left}`;
                    obj.style.transform = `scale(${geometry.scale})`;
                }

                for (const obj of [this.content, this.text]) {
                    obj.style.width = `${geometry.image.width + geometry.offset * 2}`;
                    obj.style.height = `${geometry.image.height + geometry.offset * 2}`;
                    obj.style.top = `${geometry.top - geometry.offset * geometry.scale}`;
                    obj.style.left = `${geometry.left - geometry.offset * geometry.scale}`;
                }

                const event: Event = new Event('canvas.setup');
                this.rotationWrapper.dispatchEvent(event);
            }
        }
    }

    public html(): HTMLDivElement {
        return this.rotationWrapper;
    }
}
