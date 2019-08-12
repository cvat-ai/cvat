/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

// Disable till full implementation
/* eslint class-methods-use-this: "off" */

import * as SVG from 'svg.js';

// tslint:disable-next-line: ordered-imports
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';

import { CanvasController } from './canvasController';
import { CanvasModel, Geometry, UpdateReasons } from './canvasModel';
import { Listener, Master } from './master';

export interface CanvasView {
    html(): HTMLDivElement;
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

function darker(color: string, percentage: number): string {
    const R = Math.round(parseInt(color.slice(1, 3), 16) * (1 - percentage / 100));
    const G = Math.round(parseInt(color.slice(3, 5), 16) * (1 - percentage / 100));
    const B = Math.round(parseInt(color.slice(5, 7), 16) * (1 - percentage / 100));

    const rHex = Math.max(0, R).toString(16);
    const gHex = Math.max(0, G).toString(16);
    const bHex = Math.max(0, B).toString(16);

    return `#${rHex.length === 1 ? `0${rHex}` : rHex}`
        + `${gHex.length === 1 ? `0${gHex}` : gHex}`
        + `${bHex.length === 1 ? `0${bHex}` : bHex}`;
}

export class CanvasViewImpl implements CanvasView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private adoptedText: SVG.Container;
    private background: SVGSVGElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private adoptedContent: SVG.Container;
    private rotationWrapper: HTMLDivElement;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private controller: CanvasController;
    private svgShapes: SVG.Shape[];
    private svgTexts: SVG.Text[];
    private readonly BASE_STROKE_WIDTH: number;
    private readonly BASE_POINT_SIZE: number;

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;
        this.BASE_STROKE_WIDTH = 2.5;
        this.BASE_POINT_SIZE = 7;
        this.svgShapes = [];
        this.svgTexts = [];

        // Create HTML elements
        this.loadingAnimation = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = (SVG.adopt((this.text as any as HTMLElement)) as SVG.Container);
        this.background = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedContent = (SVG.adopt((this.content as any as HTMLElement)) as SVG.Container);
        this.rotationWrapper = window.document.createElement('div');
        this.canvas = window.document.createElement('div');

        const loadingCircle: SVGCircleElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridPattern: SVGPatternElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'pattern');
        const gridRect: SVGRectElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'rect');

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
        this.gridPath.setAttribute('stroke-width', '1.5');
        gridPattern.setAttribute('id', 'cvat_canvas_grid_pattern');
        gridPattern.setAttribute('width', '100');
        gridPattern.setAttribute('height', '100');
        gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        gridRect.setAttribute('width', '100%');
        gridRect.setAttribute('height', '100%');
        gridRect.setAttribute('fill', 'url(#cvat_canvas_grid_pattern)');

        // Setup content
        this.text.setAttribute('id', 'cvat_canvas_text_content');
        this.background.setAttribute('id', 'cvat_canvas_background');
        this.content.setAttribute('id', 'cvat_canvas_content');

        // Setup wrappers
        this.rotationWrapper.setAttribute('id', 'cvat_canvas_rotation_wrapper');
        this.canvas.setAttribute('id', 'cvat_canvas_wrapper');

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
                    height: self.rotationWrapper.clientHeight,
                    width: self.rotationWrapper.clientWidth,
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
            // Transform canvas
            for (const obj of [this.background, this.grid, this.loadingAnimation, this.content]) {
                obj.style.transform = `scale(${geometry.scale})`;
            }

            this.rotationWrapper.style.transform = `rotate(${geometry.angle}deg)`;

            // Transform all shapes
            for (const element of window.document.getElementsByClassName('svg_select_points')) {
                element.setAttribute(
                    'stroke-width',
                    `${this.BASE_STROKE_WIDTH / (3 * geometry.scale)}`,
                );
                element.setAttribute(
                    'r',
                    `${this.BASE_POINT_SIZE / (2 * geometry.scale)}`,
                );
            }

            for (const element of
                window.document.getElementsByClassName('cvat_canvas_selected_point')) {
                element.setAttribute(
                    'stroke-width',
                    `${+element.getAttribute('stroke-width') * 2}`,
                );
            }

            for (const object of this.svgShapes) {
                if (object.attr('stroke-width')) {
                    object.attr({
                        'stroke-width': this.BASE_STROKE_WIDTH / (geometry.scale),
                    });
                }
            }
        }

        function resize(geometry: Geometry): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.width = `${geometry.image.width}px`;
                obj.style.height = `${geometry.image.height}px`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.width = `${geometry.image.width + geometry.offset * 2}px`;
                obj.style.height = `${geometry.image.height + geometry.offset * 2}px`;
            }
        }

        function move(geometry: Geometry): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.top = `${geometry.top}px`;
                obj.style.left = `${geometry.left}px`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.top = `${geometry.top - geometry.offset * geometry.scale}px`;
                obj.style.left = `${geometry.left - geometry.offset * geometry.scale}px`;
            }

            this.content.style.transform = `scale(${geometry.scale})`;
        }

        function setupObjects(objects: any[], geometry: Geometry): void {
            this.adoptedContent.clear();
            const ctm = this.content.getScreenCTM()
                .inverse().multiply(this.background.getScreenCTM());

            // TODO: Compute difference
            this.addObjects(ctm, objects, geometry);
            // TODO: Update objects
            // TODO: Delete objects
        }

        const { geometry } = this.controller;
        if (reason === UpdateReasons.IMAGE) {
            if (!model.image.length) {
                this.loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('cvat_canvas_hidden');
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
        } else if (reason === UpdateReasons.OBJECTS) {
            setupObjects.call(this, this.controller.objects, geometry);
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    private addObjects(ctm: SVGMatrix, objects: any[], geometry: Geometry): void {
        for (const object of objects) {
            if (object.objectType === 'tag') {
                this.addTag(object, geometry);
            } else {
                const points: number[] = (object.points as number[]);
                const translatedPoints: number[] = [];
                for (let i = 0; i <= points.length - 1; i += 2) {
                    let point: SVGPoint = this.background.createSVGPoint();
                    point.x = points[i];
                    point.y = points[i + 1];
                    point = point.matrixTransform(ctm);
                    translatedPoints.push(point.x, point.y);
                }

                // TODO: Use enums after typification cvat-core
                if (object.shapeType === 'rectangle') {
                    this.svgShapes.push(this.addRect(translatedPoints, object, geometry));
                } else {
                    const stringified = translatedPoints.reduce(
                        (acc: string, val: number, idx: number): string => {
                            if (idx % 2) {
                                return `${acc}${val} `;
                            }

                            return `${acc}${val},`;
                        }, '',
                    );

                    if (object.shapeType === 'polygon') {
                        this.svgShapes.push(this.addPolygon(stringified, object, geometry));
                    } else if (object.shapeType === 'polyline') {
                        this.svgShapes.push(this.addPolyline(stringified, object, geometry));
                    } else if (object.shapeType === 'points') {
                        this.svgShapes.push(this.addPoints(stringified, object, geometry));
                    }
                }

                // TODO: add text here if need
            }
        }

        this.activate(geometry);
    }

    private activate(geometry: Geometry): void {
        for (const shape of this.svgShapes) {
            const self = this;
            (shape as any).draggable().on('dragstart', (): void => {
                console.log('hello');
            }).on('dragend', (): void => {
                console.log('hello');
            });

            (shape as any).selectize({
                deepSelect: true,
                pointSize: this.BASE_POINT_SIZE / geometry.scale,
                rotationPoint: false,
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill(shape.node.getAttribute('fill'))
                        .center(cx, cy)
                        .attr({
                            'stroke-width': self.BASE_STROKE_WIDTH / (3 * geometry.scale),
                        });

                    circle.node.addEventListener('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': circle.attr('stroke-width') * 2,
                        });

                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.node.addEventListener('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': circle.attr('stroke-width') / 2,
                        });

                        circle.removeClass('cvat_canvas_selected_point');
                    });

                    return circle;
                },
            }).resize();
        }

        // add selectable
        // add draggable
        // add resizable
    }

    private addRect(points: number[], state: any, geometry: Geometry): SVG.Rect {
        const [xtl, ytl, xbr, ybr] = points;

        return this.adoptedContent.rect().size(xbr - xtl, ybr - ytl).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': this.BASE_STROKE_WIDTH / geometry.scale,
            zOrder: state.zOrder,
        }).move(xtl, ytl)
            .addClass('cvat_canvas_shape');
    }

    private addPolygon(points: string, state: any, geometry: Geometry): SVG.Polygon {
        return this.adoptedContent.polygon(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': this.BASE_STROKE_WIDTH / geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');
    }

    private addPolyline(points: string, state: any, geometry: Geometry): SVG.PolyLine {
        return this.adoptedContent.polyline(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': this.BASE_STROKE_WIDTH / geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');
    }

    private addPoints(points: string, state: any, geometry: Geometry): SVG.Polygon {
        return this.adoptedContent.polygon(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            opacity: 0,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': this.BASE_STROKE_WIDTH / geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');
    }

    private addTag(state: any, geometry: Geometry): void {
        console.log(state, geometry);
    }
}
