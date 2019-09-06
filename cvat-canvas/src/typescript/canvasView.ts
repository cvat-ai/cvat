/*
* Copyright (C) 2019 Intel Corporation
* SPDX-License-Identifier: MIT
*/

import * as SVG from 'svg.js';

import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';

import { CanvasController } from './canvasController';
import { Listener, Master } from './master';
import { DrawHandler, DrawHandlerImpl } from './drawHandler';
import { EditHandler, EditHandlerImpl } from './editHandler';
import { MergeHandler, MergeHandlerImpl } from './mergeHandler';
import { SplitHandler, SplitHandlerImpl } from './splitHandler';
import { GroupHandler, GroupHandlerImpl } from './groupHandler';
import consts from './consts';
import {
    translateToSVG,
    translateFromSVG,
    translateBetweenSVG,
    pointsToArray,
    displayShapeSize,
    ShapeSizeElement,
} from './shared';
import {
    CanvasModel,
    Geometry,
    UpdateReasons,
    FocusData,
    FrameZoom,
    ActiveElement,
    DrawData,
    MergeData,
    SplitData,
    GroupData,
    Mode,
    Size,
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
    private geometry: Geometry;
    private drawHandler: DrawHandler;
    private editHandler: EditHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private activeElement: {
        state: any;
        attributeID: number;
    };

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    private onDrawDone(data: object): void {
        if (data) {
            const event: CustomEvent = new CustomEvent('canvas.drawn', {
                bubbles: false,
                cancelable: true,
                detail: {
                    // eslint-disable-next-line new-cap
                    state: data,
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

        this.mode = Mode.IDLE;
    }

    private onEditDone(state: any, points: number[]): void {
        if (state && points) {
            const event: CustomEvent = new CustomEvent('canvas.edited', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                    points,
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

        this.mode = Mode.IDLE;
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

        this.controller.merge({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onSplitDone(object: any): void {
        if (object) {
            const event: CustomEvent = new CustomEvent('canvas.splitted', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state: object,
                    frame: object.frame,
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

        this.controller.split({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onGroupDone(objects: any[]): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.groupped', {
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

        this.controller.group({
            enabled: false,
        });

        this.mode = Mode.IDLE;
    }

    private onFindObject(e: MouseEvent): void {
        if (e.which === 1 || e.which === 0) {
            const [x, y] = translateToSVG(this.background, [e.clientX, e.clientY]);
            const event: CustomEvent = new CustomEvent('canvas.find', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x,
                    y,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);

            e.preventDefault();
        }
    }

    private selectize(value: boolean, shape: SVG.Element): void {
        const self = this;

        function dblClickHandler(e: MouseEvent): void {
            const pointID = Array.prototype.indexOf
                .call((e.target as HTMLElement).parentElement.children, e.target);

            if (self.activeElement) {
                if (e.ctrlKey) {
                    const { points } = self.activeElement.state;
                    self.onEditDone(
                        self.activeElement.state,
                        points.slice(0, pointID * 2).concat(points.slice(pointID * 2 + 2)),
                    );
                } else if (e.shiftKey) {
                    self.mode = Mode.EDIT;
                    const { state } = self.activeElement;
                    self.deactivate();
                    self.editHandler.edit({
                        enabled: true,
                        state,
                        pointID,
                    });
                }
            }
        }

        if (value) {
            (shape as any).selectize(value, {
                deepSelect: true,
                pointSize: 2 * consts.BASE_POINT_SIZE / self.geometry.scale,
                rotationPoint: false,
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill(shape.node.getAttribute('fill') || 'inherit')
                        .center(cx, cy)
                        .attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                    circle.node.addEventListener('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.node.addEventListener('dblclick', dblClickHandler);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.node.addEventListener('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.node.removeEventListener('dblclick', dblClickHandler);
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
                this.geometry = geometry;
                self.canvas.removeEventListener('animationstart', canvasFirstMounted);
            }
        };

        this.canvas.addEventListener('animationstart', canvasFirstMounted);

        // Setup API handlers
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone.bind(this),
            this.adoptedContent,
            this.adoptedText,
            this.background,
        );
        this.editHandler = new EditHandlerImpl(
            this.onEditDone.bind(this),
            this.adoptedContent,
            this.background,
        );
        this.mergeHandler = new MergeHandlerImpl(
            this.onMergeDone.bind(this),
            this.onFindObject.bind(this),
            this.adoptedContent,
        );
        this.splitHandler = new SplitHandlerImpl(
            this.onSplitDone.bind(this),
            this.onFindObject.bind(this),
            this.adoptedContent,
        );
        this.groupHandler = new GroupHandlerImpl(
            this.onGroupDone.bind(this),
            (): any[] => this.controller.objects,
            this.onFindObject.bind(this),
            this.adoptedContent,
        );


        // Setup event handlers
        this.content.addEventListener('dblclick', (e: MouseEvent): void => {
            if (e.ctrlKey || e.shiftKey) return;
            self.controller.fit();
            e.preventDefault();
        });

        this.content.addEventListener('mousedown', (event): void => {
            if ((event.which === 1 && this.mode === Mode.IDLE) || (event.which === 2)) {
                self.controller.enableDrag(event.clientX, event.clientY);

                event.preventDefault();
            }
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
            self.controller.drag(e.clientX, e.clientY);

            if (this.mode !== Mode.IDLE) return;
            if (e.ctrlKey || e.shiftKey) return;

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
        function transform(): void {
            // Transform canvas
            for (const obj of [this.background, this.grid, this.loadingAnimation, this.content]) {
                obj.style.transform = `scale(${this.geometry.scale}) rotate(${this.geometry.angle}deg)`;
            }

            // Transform grid
            this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH / (this.geometry.scale)}px`);

            // Transform all shape points
            for (const element of window.document.getElementsByClassName('svg_select_points')) {
                element.setAttribute(
                    'stroke-width',
                    `${consts.POINTS_STROKE_WIDTH / this.geometry.scale}`,
                );
                element.setAttribute(
                    'r',
                    `${consts.BASE_POINT_SIZE / this.geometry.scale}`,
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
                            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
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
            this.drawHandler.transform(this.geometry);
            this.editHandler.transform(this.geometry);
        }

        function resize(): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.width = `${this.geometry.image.width}px`;
                obj.style.height = `${this.geometry.image.height}px`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.width = `${this.geometry.image.width + this.geometry.offset * 2}px`;
                obj.style.height = `${this.geometry.image.height + this.geometry.offset * 2}px`;
            }
        }

        function move(): void {
            for (const obj of [this.background, this.grid, this.loadingAnimation]) {
                obj.style.top = `${this.geometry.top}px`;
                obj.style.left = `${this.geometry.left}px`;
            }

            for (const obj of [this.content, this.text]) {
                obj.style.top = `${this.geometry.top - this.geometry.offset}px`;
                obj.style.left = `${this.geometry.left - this.geometry.offset}px`;
            }

            // Transform handlers
            this.drawHandler.transform(this.geometry);
            this.editHandler.transform(this.geometry);
        }

        function computeFocus(focusData: FocusData): void {
            // This computation cann't be done in the model because of lack of data
            const object = this.svgShapes[focusData.clientID];
            if (!object) {
                return;
            }

            // First of all, compute and apply scale

            let scale = null;
            const bbox: SVG.BBox = object.bbox();
            if ((this.geometry.angle / 90) % 2) {
                // 90, 270, ..
                scale = Math.min(Math.max(Math.min(
                    this.geometry.canvas.width / bbox.height,
                    this.geometry.canvas.height / bbox.width,
                ), FrameZoom.MIN), FrameZoom.MAX);
            } else {
                scale = Math.min(Math.max(Math.min(
                    this.geometry.canvas.width / bbox.width,
                    this.geometry.canvas.height / bbox.height,
                ), FrameZoom.MIN), FrameZoom.MAX);
            }

            this.geometry = { ...this.geometry, scale };
            transform.call(this);

            const [x, y] = translateFromSVG(this.content, [
                bbox.x + bbox.width / 2,
                bbox.y + bbox.height / 2,
            ]);

            const [cx, cy] = [
                this.canvas.clientWidth / 2 + this.canvas.offsetLeft,
                this.canvas.clientHeight / 2 + this.canvas.offsetTop,
            ];

            const dragged = {
                ...this.geometry,
                top: this.geometry.top + cy - y,
                left: this.geometry.left + cx - x,
                scale,
            };

            this.controller.geometry = dragged;
            this.geometry = dragged;
            move.call(this);
        }

        function setupObjects(objects: any[]): void {
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

            this.addObjects(ctm, objects);
            // TODO: Update objects
            // TODO: Delete objects
        }

        this.geometry = this.controller.geometry;
        if (reason === UpdateReasons.IMAGE) {
            if (!model.image.length) {
                this.loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('cvat_canvas_hidden');
                this.background.style.backgroundImage = `url("${model.image}")`;
                move.call(this);
                resize.call(this);
                transform.call(this);
            }
        } else if (reason === UpdateReasons.ZOOM || reason === UpdateReasons.FIT) {
            move.call(this);
            transform.call(this);
        } else if (reason === UpdateReasons.MOVE) {
            move.call(this);
        } else if (reason === UpdateReasons.OBJECTS) {
            setupObjects.call(this, this.controller.objects);
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.canvas.dispatchEvent(event);
        } else if (reason === UpdateReasons.GRID) {
            const size: Size = this.geometry.grid;
            this.gridPattern.setAttribute('width', `${size.width}`);
            this.gridPattern.setAttribute('height', `${size.height}`);
        } else if (reason === UpdateReasons.FOCUS) {
            computeFocus.call(this, this.controller.focusData);
        } else if (reason === UpdateReasons.ACTIVATE) {
            this.activate(this.controller.activeElement);
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled) {
                this.mode = Mode.DRAW;
                this.deactivate();
            }
            this.drawHandler.draw(data, this.geometry);
        } else if (reason === UpdateReasons.MERGE) {
            const data: MergeData = this.controller.mergeData;
            if (data.enabled) {
                this.mode = Mode.MERGE;
                this.deactivate();
            }
            this.mergeHandler.merge(data);
        } else if (reason === UpdateReasons.SPLIT) {
            const data: SplitData = this.controller.splitData;
            if (data.enabled) {
                this.mode = Mode.SPLIT;
                this.deactivate();
            }
            this.splitHandler.split(data);
        } else if (reason === UpdateReasons.GROUP) {
            const data: GroupData = this.controller.groupData;
            if (data.enabled) {
                this.mode = Mode.GROUP;
                this.deactivate();
            }
            this.groupHandler.group(data);
        } else if (reason === UpdateReasons.SELECT) {
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.select(this.controller.selected);
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.select(this.controller.selected);
            } else if (this.mode === Mode.GROUP) {
                this.groupHandler.select(this.controller.selected);
            }
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                this.drawHandler.cancel();
            } else if (this.mode === Mode.MERGE) {
                this.mergeHandler.cancel();
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.cancel();
            } else if (this.mode === Mode.GROUP) {
                this.groupHandler.cancel();
            } else if (this.mode === Mode.EDIT) {
                this.editHandler.cancel();
            }
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    private addObjects(ctm: SVGMatrix, states: any[]): void {
        for (const state of states) {
            if (state.objectType === 'tag') {
                this.addTag(state);
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
                        .addRect(translatedPoints, state);
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
                            .addPolygon(stringified, state);
                    } else if (state.shapeType === 'polyline') {
                        this.svgShapes[state.clientID] = this
                            .addPolyline(stringified, state);
                    } else if (state.shapeType === 'points') {
                        this.svgShapes[state.clientID] = this
                            .addPoints(stringified, state);
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
            shape.removeClass('cvat_canvas_shape_activated');

            (shape as any).draggable(false);

            if (state.shapeType !== 'points') {
                this.selectize(false, shape);
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

    private activate(activeElement: ActiveElement): void {
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
        shape.addClass('cvat_canvas_shape_activated');
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
        }).on('dragend', (e: CustomEvent): void => {
            if (text) {
                text.removeClass('cvat_canvas_hidden');
                self.updateTextPosition(
                    text,
                    shape,
                );
            }

            this.mode = Mode.IDLE;

            const p1 = e.detail.handler.startPoints.point;
            const p2 = e.detail.p;
            const delta = 1;
            if (Math.sqrt(((p1.x - p2.x) ** 2) + ((p1.y - p2.y) ** 2)) >= delta) {
                const points = pointsToArray(
                    shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                        + `${shape.attr('x') + shape.attr('width')},`
                        + `${shape.attr('y') + shape.attr('height')}`,
                );

                this.onEditDone(state, translateBetweenSVG(this.content, this.background, points));
            }
        });

        if (state.shapeType !== 'points') {
            this.selectize(true, shape);
        }

        let shapeSizeElement: ShapeSizeElement = null;
        let resized = false;
        (shape as any).resize().on('resizestart', (): void => {
            this.mode = Mode.RESIZE;
            if (state.shapeType === 'rectangle') {
                shapeSizeElement = displayShapeSize(this.adoptedContent, this.adoptedText);
            }
            resized = false;
            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        }).on('resizing', (): void => {
            resized = true;
            if (shapeSizeElement) {
                shapeSizeElement.update(shape);
            }
        }).on('resizedone', (): void => {
            if (shapeSizeElement) {
                shapeSizeElement.rm();
            }

            if (text) {
                text.removeClass('cvat_canvas_hidden');
                self.updateTextPosition(
                    text,
                    shape,
                );
            }

            this.mode = Mode.IDLE;

            if (resized) {
                const points = pointsToArray(
                    shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                        + `${shape.attr('x') + shape.attr('width')},`
                        + `${shape.attr('y') + shape.attr('height')}`,
                );

                this.onEditDone(state, translateBetweenSVG(this.content, this.background, points));
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
            clientY + consts.TEXT_MARGIN,
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

    private addRect(points: number[], state: any): SVG.Rect {
        const [xtl, ytl, xbr, ybr] = points;
        const rect = this.adoptedContent.rect().size(xbr - xtl, ybr - ytl).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            zOrder: state.zOrder,
        }).move(xtl, ytl)
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            rect.addClass('cvat_canvas_shape_occluded');
        }

        return rect;
    }

    private addPolygon(points: string, state: any): SVG.Polygon {
        const polygon = this.adoptedContent.polygon(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polygon.addClass('cvat_canvas_shape_occluded');
        }

        return polygon;
    }

    private addPolyline(points: string, state: any): SVG.PolyLine {
        const polyline = this.adoptedContent.polyline(points).attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            fill: state.color,
            'shape-rendering': 'geometricprecision',
            stroke: darker(state.color, 50),
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            zOrder: state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polyline.addClass('cvat_canvas_shape_occluded');
        }

        return polyline;
    }

    private addPoints(points: string, state: any): SVG.PolyLine {
        const shape = this.adoptedContent.polyline(points).attr({
            'color-rendering': 'optimizeQuality',
            'pointer-events': 'none',
            'shape-rendering': 'geometricprecision',
            'stroke-width': 0,
            fill: state.color, // to right fill property when call SVG.Shape::clone()
        }).style({
            opacity: 0,
        });

        this.selectize(true, shape);

        const group = shape.remember('_selectHandler').nested
            .addClass('cvat_canvas_shape').attr({
                clientID: state.clientID,
                zOrder: state.zOrder,
                id: `cvat_canvas_shape_${state.clientID}`,
                fill: state.color,
            }).style({
                'fill-opacity': 1,
            });
        group.bbox = shape.bbox.bind(shape);
        group.clone = shape.clone.bind(shape);

        shape.remove = (): SVG.PolyLine => {
            this.selectize(false, shape);
            shape.constructor.prototype.remove.call(shape);
            return shape;
        };

        return shape;
    }

    /* eslint-disable-next-line */
    private addTag(state: any): void {
        console.log(state);
    }
}
