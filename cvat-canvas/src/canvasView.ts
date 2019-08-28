/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';

// tslint:disable-next-line: ordered-imports
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';

import { CanvasController } from './canvasController';
import { Listener, Master } from './master';
import { DrawHandler, DrawHandlerImpl } from './drawHandler';
import { MergeHandler, MergeHandlerImpl } from './mergeHandler';
import { SplitHandler, SplitHandlerImpl } from './splitHandler';
import { GroupHandler, GroupHandlerImpl } from './groupHandler';
import { translateToSVG, translateFromSVG } from './shared';
import consts from './consts';
import {
    CanvasModel,
    Geometry,
    Size,
    UpdateReasons,
    FocusData,
    FrameZoom,
    ActiveElement,
    DrawData,
} from './canvasModel';

export interface CanvasView {
    html(): HTMLDivElement;
}


interface ShapeDict {
    [index: number]: SVG.Shape;
}

interface TextDict {
    [index: number]: SVG.Text;
}

enum Mode {
    IDLE = 'idle',
    DRAG = 'drag',
    RESIZE = 'resize',
    DRAW = 'draw',
}

function selectize(value: boolean, shape: SVG.Element, geometry: Geometry): void {
    if (value) {
        (shape as any).selectize(value, {
            deepSelect: true,
            pointSize: consts.BASE_POINT_SIZE / geometry.scale,
            rotationPoint: false,
            pointType(cx: number, cy: number): SVG.Circle {
                const circle: SVG.Circle = this.nested
                    .circle(this.options.pointSize)
                    .stroke('black')
                    .fill(shape.node.getAttribute('fill'))
                    .center(cx, cy)
                    .attr({
                        'stroke-width': consts.BASE_STROKE_WIDTH / (3 * geometry.scale),
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
        });
    } else {
        (shape as any).selectize(false, {
            deepSelect: true,
        });
    }
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
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private gridPattern: SVGPatternElement;
    private controller: CanvasController;
    private svgShapes: ShapeDict;
    private svgTexts: TextDict;
    private drawHandler: DrawHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private activeElement: {
        state: any;
        attributeID: number;
    };

    private mode: Mode;

    private onDrawDone(data: object): void {
        if (data) {
            const event: CustomEvent = new CustomEvent('canvas.drawn', {
                bubbles: false,
                cancelable: true,
                detail: {
                    // eslint-disable-next-line new-cap
                    state: new this.controller.objectStateClass(data),
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.controller.draw({
            enabled: false,
        });
    }

    private onMergeDone(objects: any[]): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.merged', {
                bubbles: false,
                cancelable: true,
                detail: {
                    states: objects,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }
    }

    private onSplitDone(object: any): void {
        if (object) {
            const event: CustomEvent = new CustomEvent('canvas.splitted', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state: object,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }
    }

    private onGroupDone(objects: any[], reset: boolean): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.groupped', {
                bubbles: false,
                cancelable: true,
                detail: {
                    states: objects,
                    reset,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }
    }

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;
        this.svgShapes = {};
        this.svgTexts = {};
        this.activeElement = null;
        this.mode = Mode.IDLE;

        // Create HTML elements
        this.loadingAnimation = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = (SVG.adopt((this.text as any as HTMLElement)) as SVG.Container);
        this.background = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.gridPattern = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedContent = (SVG.adopt((this.content as any as HTMLElement)) as SVG.Container);

        this.canvas = window.document.createElement('div');

        const loadingCircle: SVGCircleElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'circle');
        const gridDefs: SVGDefsElement = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'defs');
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
        this.canvas.appendChild(this.grid);
        this.canvas.appendChild(this.content);


        // A little hack to get size after first mounting
        // http://www.backalleycoder.com/2012/04/25/i-want-a-damnodeinserted/
        const self = this;
        const canvasFirstMounted = (event: AnimationEvent): void => {
            if (event.animationName === 'loadingAnimation') {
                const { geometry } = this.controller;
                geometry.canvas = {
                    height: self.canvas.clientHeight,
                    width: self.canvas.clientWidth,
                };

                this.controller.geometry = geometry;
                self.canvas.removeEventListener('animationstart', canvasFirstMounted);
            }
        };

        this.canvas.addEventListener('animationstart', canvasFirstMounted);

        // Setup API handlers
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone.bind(this),
            this.adoptedContent,
            this.background,
        );
        this.mergeHandler = new MergeHandlerImpl(
            this.onMergeDone.bind(this),
        );
        this.splitHandler = new SplitHandlerImpl(
            this.onSplitDone.bind(this),
        );
        this.groupHandler = new GroupHandlerImpl(
            this.onGroupDone.bind(this),
        );


        // Setup event handlers
        this.content.addEventListener('dblclick', (): void => {
            self.controller.fit();
        });

        this.content.addEventListener('mousedown', (event): void => {
            if ((event.which === 1 && this.mode === Mode.IDLE) || (event.which === 2)) {
                self.controller.enableDrag(event.clientX, event.clientY);
            }
        });

        this.content.addEventListener('mousemove', (event): void => {
            self.controller.drag(event.clientX, event.clientY);
        });

        window.document.addEventListener('mouseup', (event): void => {
            if (event.which === 1 || event.which === 2) {
                self.controller.disableDrag();
            }
        });

        this.content.addEventListener('wheel', (event): void => {
            const point = translateToSVG(self.background, [event.clientX, event.clientY]);
            self.controller.zoom(point[0], point[1], event.deltaY > 0 ? -1 : 1);
            event.preventDefault();
        });

        this.content.addEventListener('mousemove', (e): void => {
            if (this.mode !== Mode.IDLE) return;

            const [x, y] = translateToSVG(this.background, [e.clientX, e.clientY]);
            const event: CustomEvent = new CustomEvent('canvas.moved', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x,
                    y,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);
        });

        this.content.oncontextmenu = (): boolean => false;
        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        function transform(geometry: Geometry): void {
            // Transform canvas
            for (const obj of [this.background, this.grid, this.loadingAnimation, this.content]) {
                obj.style.transform = `scale(${geometry.scale}) rotate(${geometry.angle}deg)`;
            }

            // Transform grid
            this.gridPath.setAttribute('stroke-width', `${consts.BASE_STROKE_WIDTH / (2 * geometry.scale)}px`);

            // Transform all shape points
            for (const element of window.document.getElementsByClassName('svg_select_points')) {
                element.setAttribute(
                    'stroke-width',
                    `${consts.BASE_STROKE_WIDTH / (3 * geometry.scale)}`,
                );
                element.setAttribute(
                    'r',
                    `${consts.BASE_POINT_SIZE / (2 * geometry.scale)}`,
                );
            }

            for (const element of
                window.document.getElementsByClassName('cvat_canvas_selected_point')) {
                element.setAttribute(
                    'stroke-width',
                    `${+element.getAttribute('stroke-width') * 2}`,
                );
            }

            // Transform all drawn shapes
            for (const key in this.svgShapes) {
                if (Object.prototype.hasOwnProperty.call(this.svgShapes, key)) {
                    const object = this.svgShapes[key];
                    if (object.attr('stroke-width')) {
                        object.attr({
                            'stroke-width': consts.BASE_STROKE_WIDTH / (geometry.scale),
                        });
                    }
                }
            }

            // Transform all text
            for (const key in this.svgShapes) {
                if (Object.prototype.hasOwnProperty.call(this.svgShapes, key)
                    && Object.prototype.hasOwnProperty.call(this.svgTexts, key)) {
                    this.updateTextPosition(
                        this.svgTexts[key],
                        this.svgShapes[key],
                    );
                }
            }

            // Transform handlers
            this.drawHandler.transform(geometry);
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
                obj.style.top = `${geometry.top - geometry.offset}px`;
                obj.style.left = `${geometry.left - geometry.offset}px`;
            }

            // Transform handlers
            this.drawHandler.transform(geometry);
        }

        function computeFocus(focusData: FocusData, geometry: Geometry): void {
            // This computation cann't be done in the model because of lack of data
            const object = this.svgShapes[focusData.clientID];
            if (!object) {
                return;
            }

            // First of all, compute and apply scale

            let scale = null;
            const bbox: SVG.BBox = object.node.getBBox();
            if ((geometry.angle / 90) % 2) {
                // 90, 270, ..
                scale = Math.min(Math.max(Math.min(
                    geometry.canvas.width / bbox.height,
                    geometry.canvas.height / bbox.width,
                ), FrameZoom.MIN), FrameZoom.MAX);
            } else {
                scale = Math.min(Math.max(Math.min(
                    geometry.canvas.width / bbox.width,
                    geometry.canvas.height / bbox.height,
                ), FrameZoom.MIN), FrameZoom.MAX);
            }

            transform.call(this, Object.assign({}, geometry, {
                scale,
            }));

            const [x, y] = translateFromSVG(this.content, [
                bbox.x + bbox.width / 2,
                bbox.y + bbox.height / 2,
            ]);

            const [cx, cy] = [
                this.canvas.clientWidth / 2 + this.canvas.offsetLeft,
                this.canvas.clientHeight / 2 + this.canvas.offsetTop,
            ];

            const dragged = Object.assign({}, geometry, {
                top: geometry.top + cy - y,
                left: geometry.left + cx - x,
                scale,
            });

            this.controller.geometry = dragged;
            move.call(this, dragged);
        }

        function setupObjects(objects: any[], geometry: Geometry): void {
            const ctm = this.content.getScreenCTM()
                .inverse().multiply(this.background.getScreenCTM());

            this.deactivate();

            // TODO: Compute difference

            // Instead of simple clearing let's remove all objects properly
            for (const id of Object.keys(this.svgShapes)) {
                if (id in this.svgTexts) {
                    this.svgTexts[id].remove();
                }

                this.svgShapes[id].remove();
            }

            this.svgTexts = {};
            this.svgShapes = {};

            this.addObjects(ctm, objects, geometry);
            // TODO: Update objects
            // TODO: Delete objects
            this.mergeHandler.updateObjects(objects);
            this.groupHandler.updateObjects(objects);
            this.splitHandler.updateObjects(objects);
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
            }
        } else if (reason === UpdateReasons.ZOOM || reason === UpdateReasons.FIT) {
            move.call(this, geometry);
            transform.call(this, geometry);
        } else if (reason === UpdateReasons.MOVE) {
            move.call(this, geometry);
        } else if (reason === UpdateReasons.OBJECTS) {
            setupObjects.call(this, this.controller.objects, geometry);
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.canvas.dispatchEvent(event);
        } else if (reason === UpdateReasons.GRID) {
            const size: Size = geometry.grid;
            this.gridPattern.setAttribute('width', `${size.width}`);
            this.gridPattern.setAttribute('height', `${size.height}`);
        } else if (reason === UpdateReasons.FOCUS) {
            computeFocus.call(this, this.controller.focusData, geometry);
        } else if (reason === UpdateReasons.ACTIVATE) {
            this.activate(geometry, this.controller.activeElement);
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled) {
                this.mode = Mode.DRAW;
                this.deactivate();
            } else {
                this.mode = Mode.IDLE;
            }
            this.drawHandler.draw(data, geometry);
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    private addObjects(ctm: SVGMatrix, states: any[], geometry: Geometry): void {
        for (const state of states) {
            if (state.objectType === 'tag') {
                this.addTag(state, geometry);
            } else {
                const points: number[] = (state.points as number[]);
                const translatedPoints: number[] = [];
                for (let i = 0; i <= points.length - 1; i += 2) {
                    let point: SVGPoint = this.background.createSVGPoint();
                    point.x = points[i];
                    point.y = points[i + 1];
                    point = point.matrixTransform(ctm);
                    translatedPoints.push(point.x, point.y);
                }

                // TODO: Use enums after typification cvat-core
                if (state.shapeType === 'rectangle') {
                    this.svgShapes[state.clientID] = this
                        .addRect(translatedPoints, state, geometry);
                } else {
                    const stringified = translatedPoints.reduce(
                        (acc: string, val: number, idx: number): string => {
                            if (idx % 2) {
                                return `${acc}${val} `;
                            }

                            return `${acc}${val},`;
                        }, '',
                    );

                    if (state.shapeType === 'polygon') {
                        this.svgShapes[state.clientID] = this
                            .addPolygon(stringified, state, geometry);
                    } else if (state.shapeType === 'polyline') {
                        this.svgShapes[state.clientID] = this
                            .addPolyline(stringified, state, geometry);
                    } else if (state.shapeType === 'points') {
                        this.svgShapes[state.clientID] = this
                            .addPoints(stringified, state, geometry);
                    }
                }

                // TODO: Use enums after typification cvat-core
                if (state.visibility === 'all') {
                    this.svgTexts[state.clientID] = this.addText(state);
                    this.updateTextPosition(
                        this.svgTexts[state.clientID],
                        this.svgShapes[state.clientID],
                    );
                }
            }
        }
    }

    private deactivate(): void {
        if (this.activeElement) {
            const { state } = this.activeElement;
            const shape = this.svgShapes[this.activeElement.state.clientID];
            (shape as any).draggable(false);

            if (state.shapeType !== 'points') {
                selectize(false, shape, null);
            }

            (shape as any).resize(false);

            // Hide text only if it is hidden by settings
            const text = this.svgTexts[state.clientID];
            if (text && state.visibility === 'shape') {
                text.remove();
                delete this.svgTexts[state.clientID];
            }
            this.activeElement = null;
        }
    }

    private activate(geometry: Geometry, activeElement: ActiveElement): void {
        // Check if other element have been already activated
        if (this.activeElement) {
            // Check if it is the same element
            if (this.activeElement.state.clientID === activeElement.clientID) {
                return;
            }

            // Deactivate previous element
            this.deactivate();
        }

        const state = this.controller.objects
            .filter((el): boolean => el.clientID === activeElement.clientID)[0];
        this.activeElement = {
            attributeID: activeElement.attributeID,
            state,
        };

        const shape = this.svgShapes[activeElement.clientID];
        let text = this.svgTexts[activeElement.clientID];
        // Draw text if it's hidden by default
        if (!text && state.visibility === 'shape') {
            text = this.addText(state);
            this.svgTexts[state.clientID] = text;
            this.updateTextPosition(
                text,
                shape,
            );
        }

        const self = this;
        this.content.append(shape.node);
        (shape as any).draggable().on('dragstart', (): void => {
            this.mode = Mode.DRAG;
            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        }).on('dragend', (): void => {
            this.mode = Mode.IDLE;
            if (text) {
                text.removeClass('cvat_canvas_hidden');
                self.updateTextPosition(
                    text,
                    shape,
                );
            }
        });

        if (state.shapeType !== 'points') {
            selectize(true, shape, geometry);
        }

        (shape as any).resize().on('resizestart', (): void => {
            this.mode = Mode.RESIZE;
            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        }).on('resizedone', (): void => {
            this.mode = Mode.IDLE;
            if (text) {
                text.removeClass('cvat_canvas_hidden');
                self.updateTextPosition(
                    text,
                    shape,
                );
            }
        });
    }

    // Update text position after corresponding box has been moved, resized, etc.
    private updateTextPosition(text: SVG.Text, shape: SVG.Shape): void {
        let box = (shape.node as any).getBBox();

        // Translate the whole box to the client coordinate system
        const [x1, y1, x2, y2]: number[] = translateFromSVG(this.content, [
            box.x,
            box.y,
            box.x + box.width,
            box.y + box.height,
        ]);

        box = {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.max(x1, x2) - Math.min(x1, x2),
            height: Math.max(y1, y2) - Math.min(y1, y2),
        };

        // Find the best place for a text
        let [clientX, clientY]: number[] = [box.x + box.width, box.y];
        if (clientX + (text.node as any as SVGTextElement)
            .getBBox().width + consts.TEXT_MARGIN > this.canvas.offsetWidth) {
            ([clientX, clientY] = [box.x, box.y]);
        }

        // Translate back to text SVG
        const [x, y]: number[] = translateToSVG(this.text, [
            clientX + consts.TEXT_MARGIN,
            clientY,
        ]);

        // Finally draw a text
        text.move(x, y);
        for (const tspan of (text.lines() as any).members) {
            tspan.attr('x', text.attr('x'));
        }
    }

    private addText(state: any): SVG.Text {
        const { label, clientID, attributes } = state;
        const attrNames = label.attributes.reduce((acc: any, val: any): void => {
            acc[val.id] = val.name;
            return acc;
        }, {});

        return this.adoptedText.text((block): void => {
            block.tspan(`${label.name} ${clientID}`).style('text-transform', 'uppercase');
            for (const attrID of Object.keys(attributes)) {
                block.tspan(`${attrNames[attrID]}: ${attributes[attrID]}`).attr({
                    attrID,
                    dy: '1em',
                    x: 0,
                });
            }
        }).move(0, 0).addClass('cvat_canvas_text');
    }

    private addRect(points: number[], state: any, geometry: Geometry): SVG.Rect {
        const [xtl, ytl, xbr, ybr] = points;

        return this.adoptedContent.rect().size(xbr - xtl, ybr - ytl).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
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
            'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
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
            'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');
    }

    private addPoints(points: string, state: any, geometry: Geometry): SVG.PolyLine {
        const shape = this.adoptedContent.polyline(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');

        selectize(true, shape, geometry);
        shape.remove = function remove(): void {
            this.selectize(false, shape);
            shape.constructor.prototype.remove.call(shape);
        }.bind(this);
        shape.attr('fill', 'none');

        return shape;
    }

    /* eslint-disable-next-line */
    private addTag(state: any, geometry: Geometry): void {
        console.log(state, geometry);
    }
}
