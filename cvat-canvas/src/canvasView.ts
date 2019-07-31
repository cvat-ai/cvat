/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import CanvasModelImpl from './canvasModel';
import CanvasControllerImpl from './canvasController';

interface CanvasView {
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

export default class CanvasViewImpl implements CanvasView {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private background: SVGSVGElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private rotationWrapper: HTMLDivElement;
    private gridPath: SVGPathElement;
    private model: CanvasModelImpl;
    private controller: CanvasControllerImpl;

    public constructor(model: CanvasModelImpl, controller: CanvasControllerImpl) {
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
    }

    public html(): HTMLDivElement {
        return this.rotationWrapper;
    }
}
