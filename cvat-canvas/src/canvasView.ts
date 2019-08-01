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

function setAttributes(element: HTMLElement | SVGElement, attributes: HTMLAttribute): void {
    for (const key of Object.keys(attributes)) {
        element.setAttribute(key, attributes[key]);
    }
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

        this.loadingAnimation = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.background = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.rotationWrapper = window.document.createElement('div');

        this.rotationWrapper.appendChild(this.loadingAnimation);
        this.rotationWrapper.appendChild(this.text);
        this.rotationWrapper.appendChild(this.background);
        this.rotationWrapper.appendChild(this.grid);
        this.rotationWrapper.appendChild(this.content);

        const loadingCircle: SVGCircleElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridPattern: SVGPatternElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        const gridRect: SVGRectElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        // Setup loading animation
        setAttributes(this.loadingAnimation, {
            id: 'canvas_loading_animation',
        });

        setAttributes(loadingCircle, {
            id: 'canvas_loading_circle',
            r: '30',
            cx: '50%',
            cy: '50%',
        });

        // Setup grid
        setAttributes(this.grid, {
            style: 'width: 100%; height: 100%;',
            id: 'canvas_grid',
        });

        setAttributes(this.gridPath, {
            d: 'M 1000 0 L 0 0 0 1000',
            fill: 'none',
            'stroke-width': '1',
        });

        setAttributes(gridPattern, {
            id: 'canvas_grid_pattern',
            width: '100',
            height: '100',
            patternUnits: 'userSpaceOnUse',
            style: 'stroke: white;',
        });

        setAttributes(gridRect, {
            width: '100%',
            height: '100%',
            fill: 'url(#canvas_grid_pattern)',
        });


        // Setup content
        setAttributes(this.text, {
            id: 'canvas_text_content',
        });

        setAttributes(this.background, {
            id: 'canvas_background',
        });

        setAttributes(this.content, {
            id: 'canvas_content',
        });


        // Setup wrappers
        setAttributes(this.rotationWrapper, {
            style: 'width: 100%; height: 100%; position: relative',
        });

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

                for (const obj of [this.background, this.grid]) {
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
