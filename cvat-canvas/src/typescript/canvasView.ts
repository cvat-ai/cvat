// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

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
import { ZoomHandler, ZoomHandlerImpl } from './zoomHandler';
import consts from './consts';
import {
    translateToSVG,
    translateFromSVG,
    pointsToArray,
    displayShapeSize,
    ShapeSizeElement,
} from './shared';
import {
    CanvasModel,
    Geometry,
    UpdateReasons,
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

export class CanvasViewImpl implements CanvasView, Listener {
    private loadingAnimation: SVGSVGElement;
    private text: SVGSVGElement;
    private adoptedText: SVG.Container;
    private background: HTMLCanvasElement;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private adoptedContent: SVG.Container;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private gridPattern: SVGPatternElement;
    private controller: CanvasController;
    private svgShapes: Record<number, SVG.Shape>;
    private svgTexts: Record<number, SVG.Text>;
    private drawnStates: Record<number, any>;
    private geometry: Geometry;
    private drawHandler: DrawHandler;
    private editHandler: EditHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private zoomHandler: ZoomHandler;
    private activeElement: ActiveElement;

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    private onDrawDone(data: object | null, duration: number, continueDraw?: boolean): void {
        if (data) {
            const { zLayer } = this.controller;
            const event: CustomEvent = new CustomEvent('canvas.drawn', {
                bubbles: false,
                cancelable: true,
                detail: {
                    // eslint-disable-next-line new-cap
                    state: {
                        ...data,
                        zOrder: zLayer || 0,
                    },
                    continue: continueDraw,
                    duration,
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

        if (continueDraw) {
            this.drawHandler.draw(
                this.controller.drawData,
                this.geometry,
            );
        } else {
            this.mode = Mode.IDLE;
            this.controller.draw({
                enabled: false,
            });
        }
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

    private onMergeDone(objects: any[]| null, duration?: number): void {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.merged', {
                bubbles: false,
                cancelable: true,
                detail: {
                    duration,
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

    private onGroupDone(objects?: any[]): void {
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
            const { offset } = this.controller.geometry;
            const [x, y] = translateToSVG(this.content, [e.clientX, e.clientY]);
            const event: CustomEvent = new CustomEvent('canvas.find', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x: x - offset,
                    y: y - offset,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);

            e.preventDefault();
        }
    }

    private onFocusRegion(x: number, y: number, width: number, height: number): void {
        // First of all, compute and apply scale
        let scale = null;

        if ((this.geometry.angle / 90) % 2) {
            // 90, 270, ..
            scale = Math.min(Math.max(Math.min(
                this.geometry.canvas.width / height,
                this.geometry.canvas.height / width,
            ), FrameZoom.MIN), FrameZoom.MAX);
        } else {
            scale = Math.min(Math.max(Math.min(
                this.geometry.canvas.width / width,
                this.geometry.canvas.height / height,
            ), FrameZoom.MIN), FrameZoom.MAX);
        }

        this.geometry = { ...this.geometry, scale };
        this.transformCanvas();

        const [canvasX, canvasY] = translateFromSVG(this.content, [
            x + width / 2,
            y + height / 2,
        ]);

        const canvasOffset = this.canvas.getBoundingClientRect();
        const [cx, cy] = [
            this.canvas.clientWidth / 2 + canvasOffset.left,
            this.canvas.clientHeight / 2 + canvasOffset.top,
        ];

        const dragged = {
            ...this.geometry,
            top: this.geometry.top + cy - canvasY,
            left: this.geometry.left + cx - canvasX,
            scale,
        };

        this.controller.geometry = dragged;
        this.geometry = dragged;
        this.moveCanvas();
    }

    private moveCanvas(): void {
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
        this.zoomHandler.transform(this.geometry);
    }

    private transformCanvas(): void {
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
            const previousWidth = element.getAttribute('stroke-width') as string;
            element.setAttribute(
                'stroke-width',
                `${+previousWidth * 2}`,
            );
        }

        // Transform all drawn shapes
        for (const key in this.svgShapes) {
            if (Object.prototype.hasOwnProperty.call(this.svgShapes, key)) {
                const object = this.svgShapes[key];
                object.attr({
                    'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                });
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

    private resizeCanvas(): void {
        for (const obj of [this.background, this.grid, this.loadingAnimation]) {
            obj.style.width = `${this.geometry.image.width}px`;
            obj.style.height = `${this.geometry.image.height}px`;
        }

        for (const obj of [this.content, this.text]) {
            obj.style.width = `${this.geometry.image.width + this.geometry.offset * 2}px`;
            obj.style.height = `${this.geometry.image.height + this.geometry.offset * 2}px`;
        }
    }


    private setupObjects(states: any[]): void {
        const { offset } = this.controller.geometry;
        const translate = (points: number[]): number[] => points
            .map((coord: number): number => coord + offset);

        const created = [];
        const updated = [];
        for (const state of states) {
            if (!(state.clientID in this.drawnStates)) {
                created.push(state);
            } else {
                const drawnState = this.drawnStates[state.clientID];
                if (drawnState.updated !== state.updated || drawnState.frame !== state.frame) {
                    updated.push(state);
                }
            }
        }
        const newIDs = states.map((state: any): number => state.clientID);
        const deleted = Object.keys(this.drawnStates).map((clientID: string): number => +clientID)
            .filter((id: number): boolean => !newIDs.includes(id))
            .map((id: number): any => this.drawnStates[id]);


        if (this.activeElement.clientID !== null) {
            this.deactivate();
        }

        for (const state of deleted) {
            if (state.clientID in this.svgTexts) {
                this.svgTexts[state.clientID].remove();
            }

            this.svgShapes[state.clientID].off('click.canvas');
            this.svgShapes[state.clientID].remove();
            delete this.drawnStates[state.clientID];
        }

        this.addObjects(created, translate);
        this.updateObjects(updated, translate);
        this.sortObjects();

        if (this.controller.activeElement.clientID !== null) {
            const { clientID } = this.controller.activeElement;
            if (states.map((state: any): number => state.clientID).includes(clientID)) {
                this.activate(this.controller.activeElement);
            }
        }
    }

    private selectize(value: boolean, shape: SVG.Element): void {
        const self = this;

        function dblClickHandler(e: MouseEvent): void {
            const pointID = Array.prototype.indexOf
                .call(((e.target as HTMLElement).parentElement as HTMLElement).children, e.target);

            if (self.activeElement.clientID !== null) {
                const [state] = self.controller.objects
                    .filter((_state: any): boolean => (
                        _state.clientID === self.activeElement.clientID
                    ));
                if (e.ctrlKey) {
                    const { points } = state;
                    self.onEditDone(
                        state,
                        points.slice(0, pointID * 2).concat(points.slice(pointID * 2 + 2)),
                    );
                } else if (e.shiftKey) {
                    self.canvas.dispatchEvent(new CustomEvent('canvas.editstart', {
                        bubbles: false,
                        cancelable: true,
                    }));

                    self.mode = Mode.EDIT;
                    self.deactivate();
                    self.editHandler.edit({
                        enabled: true,
                        state,
                        pointID,
                    });
                }
            }

            e.preventDefault();
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
                        .fill('inherit')
                        .center(cx, cy)
                        .attr({
                            'fill-opacity': 1,
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                    circle.on('mouseenter', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.on('dblclick', dblClickHandler);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.on('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / self.geometry.scale,
                        });

                        circle.off('dblclick', dblClickHandler);
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

        const handler = shape.remember('_selectHandler');
        if (handler && handler.nested) {
            handler.nested.fill(shape.attr('fill'));
        }
    }

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;
        this.geometry = controller.geometry;
        this.svgShapes = {};
        this.svgTexts = {};
        this.drawnStates = {};
        this.activeElement = {
            clientID: null,
            attributeID: null,
        };
        this.mode = Mode.IDLE;

        // Create HTML elements
        this.loadingAnimation = window.document
            .createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = (SVG.adopt((this.text as any as HTMLElement)) as SVG.Container);
        this.background = window.document.createElement('canvas');
        // window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

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


        const self = this;

        // Setup API handlers
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone.bind(this),
            this.adoptedContent,
            this.adoptedText,
        );
        this.editHandler = new EditHandlerImpl(
            this.onEditDone.bind(this),
            this.adoptedContent,
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
        this.zoomHandler = new ZoomHandlerImpl(
            this.onFocusRegion.bind(this),
            this.adoptedContent,
            this.geometry,
        );

        // Setup event handlers
        this.content.addEventListener('dblclick', (e: MouseEvent): void => {
            if (e.ctrlKey || e.shiftKey) return;
            self.controller.fit();
            e.preventDefault();
        });

        this.content.addEventListener('mousedown', (event): void => {
            if ([1, 2].includes(event.which)) {
                if (![Mode.ZOOM_CANVAS, Mode.GROUP].includes(this.mode) || event.which === 2) {
                    self.controller.enableDrag(event.clientX, event.clientY);
                }
            }
        });

        window.document.addEventListener('mouseup', (event): void => {
            if (event.which === 1 || event.which === 2) {
                self.controller.disableDrag();
            }
        });

        this.content.addEventListener('wheel', (event): void => {
            const { offset } = this.controller.geometry;
            const point = translateToSVG(this.content, [event.clientX, event.clientY]);
            self.controller.zoom(point[0] - offset, point[1] - offset, event.deltaY > 0 ? -1 : 1);
            this.canvas.dispatchEvent(new CustomEvent('canvas.zoom', {
                bubbles: false,
                cancelable: true,
            }));
            event.preventDefault();
        });

        this.content.addEventListener('mousemove', (e): void => {
            self.controller.drag(e.clientX, e.clientY);

            if (this.mode !== Mode.IDLE) return;
            if (e.ctrlKey || e.shiftKey) return;

            const { offset } = this.controller.geometry;
            const [x, y] = translateToSVG(this.content, [e.clientX, e.clientY]);
            const event: CustomEvent = new CustomEvent('canvas.moved', {
                bubbles: false,
                cancelable: true,
                detail: {
                    x: x - offset,
                    y: y - offset,
                    states: this.controller.objects,
                },
            });

            this.canvas.dispatchEvent(event);
        });

        this.content.oncontextmenu = (): boolean => false;
        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        this.geometry = this.controller.geometry;
        if (reason === UpdateReasons.IMAGE_CHANGED) {
            const { image } = model;
            if (!image) {
                this.loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('cvat_canvas_hidden');
                const ctx = this.background.getContext('2d');
                this.background.setAttribute('width', `${image.width}px`);
                this.background.setAttribute('height', `${image.height}px`);
                if (ctx) {
                    ctx.drawImage(image, 0, 0);
                }
                this.moveCanvas();
                this.resizeCanvas();
                this.transformCanvas();
            }
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            // Canvas geometry is going to be changed. Old object positions aren't valid any more
            this.setupObjects([]);
            this.moveCanvas();
            this.resizeCanvas();
        } else if ([UpdateReasons.IMAGE_ZOOMED, UpdateReasons.IMAGE_FITTED].includes(reason)) {
            this.moveCanvas();
            this.transformCanvas();
            if (reason === UpdateReasons.IMAGE_FITTED) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.fit', {
                    bubbles: false,
                    cancelable: true,
                }));
            }
        } else if (reason === UpdateReasons.IMAGE_MOVED) {
            this.moveCanvas();
        } else if ([UpdateReasons.OBJECTS_UPDATED, UpdateReasons.SET_Z_LAYER].includes(reason)) {
            if (this.mode === Mode.GROUP) {
                this.groupHandler.resetSelectedObjects();
            }
            this.setupObjects(this.controller.objects);
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.repeatSelection();
            }
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.canvas.dispatchEvent(event);
        } else if (reason === UpdateReasons.GRID_UPDATED) {
            const size: Size = this.geometry.grid;
            this.gridPattern.setAttribute('width', `${size.width}`);
            this.gridPattern.setAttribute('height', `${size.height}`);
        } else if (reason === UpdateReasons.SHAPE_FOCUSED) {
            const {
                padding,
                clientID,
            } = this.controller.focusData;
            const object = this.svgShapes[clientID];
            if (object) {
                const bbox: SVG.BBox = object.bbox();
                this.onFocusRegion(bbox.x - padding, bbox.y - padding,
                    bbox.width + padding * 2, bbox.height + padding * 2);
            }
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            this.activate(this.controller.activeElement);
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstart', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstop', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = '';
            }
        } else if (reason === UpdateReasons.ZOOM_CANVAS) {
            if (this.mode === Mode.ZOOM_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstart', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = 'zoom-in';
                this.zoomHandler.zoom();
            } else {
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstop', {
                    bubbles: false,
                    cancelable: true,
                }));
                this.canvas.style.cursor = '';
                this.zoomHandler.cancel();
            }
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled && this.mode === Mode.IDLE) {
                this.canvas.style.cursor = 'crosshair';
                this.mode = Mode.DRAW;
                this.drawHandler.draw(data, this.geometry);
            } else {
                this.canvas.style.cursor = '';
                if (this.mode !== Mode.IDLE) {
                    this.drawHandler.draw(data, this.geometry);
                }
            }
        } else if (reason === UpdateReasons.MERGE) {
            const data: MergeData = this.controller.mergeData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.MERGE;
            } else {
                this.canvas.style.cursor = '';
            }
            this.mergeHandler.merge(data);
        } else if (reason === UpdateReasons.SPLIT) {
            const data: SplitData = this.controller.splitData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.SPLIT;
            } else {
                this.canvas.style.cursor = '';
            }
            this.splitHandler.split(data);
        } else if (reason === UpdateReasons.GROUP) {
            const data: GroupData = this.controller.groupData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.GROUP;
            } else {
                this.canvas.style.cursor = '';
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
            } else if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(new CustomEvent('canvas.dragstop', {
                    bubbles: false,
                    cancelable: true,
                }));
            } else if (this.mode === Mode.ZOOM_CANVAS) {
                this.zoomHandler.cancel();
                this.canvas.dispatchEvent(new CustomEvent('canvas.zoomstop', {
                    bubbles: false,
                    cancelable: true,
                }));
            }
            this.mode = Mode.IDLE;
            this.canvas.style.cursor = '';
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    private saveState(state: any): void {
        this.drawnStates[state.clientID] = {
            clientID: state.clientID,
            outside: state.outside,
            occluded: state.occluded,
            hidden: state.hidden,
            lock: state.lock,
            shapeType: state.shapeType,
            points: [...state.points],
            attributes: { ...state.attributes },
            zOrder: state.zOrder,
            pinned: state.pinned,
        };
    }

    private updateObjects(states: any[], translate: (points: number[]) => number[]): void {
        for (const state of states) {
            const { clientID } = state;
            const drawnState = this.drawnStates[clientID];

            if (drawnState.hidden !== state.hidden || drawnState.outside !== state.outside) {
                const none = state.hidden || state.outside;
                if (state.shapeType === 'points') {
                    this.svgShapes[clientID].remember('_selectHandler').nested
                        .style('display', none ? 'none' : '');
                } else {
                    this.svgShapes[clientID].style('display', none ? 'none' : '');
                }
            }

            if (drawnState.zOrder !== state.zOrder) {
                if (state.shapeType === 'points') {
                    this.svgShapes[clientID].remember('_selectHandler').nested
                        .attr('data-z-order', state.zOrder);
                } else {
                    this.svgShapes[clientID].attr('data-z-order', state.zOrder);
                }
            }

            if (drawnState.occluded !== state.occluded) {
                if (state.occluded) {
                    this.svgShapes[clientID].addClass('cvat_canvas_shape_occluded');
                } else {
                    this.svgShapes[clientID].removeClass('cvat_canvas_shape_occluded');
                }
            }

            if (drawnState.pinned !== state.pinned && this.activeElement.clientID !== null) {
                const activeElement = { ...this.activeElement };
                this.deactivate();
                this.activate(activeElement);
            }

            if (state.points
                .some((p: number, id: number): boolean => p !== drawnState.points[id])
            ) {
                const translatedPoints: number[] = translate(state.points);

                if (state.shapeType === 'rectangle') {
                    const [xtl, ytl, xbr, ybr] = translatedPoints;

                    this.svgShapes[clientID].attr({
                        x: xtl,
                        y: ytl,
                        width: xbr - xtl,
                        height: ybr - ytl,
                    });
                } else {
                    const stringified = translatedPoints.reduce(
                        (acc: string, val: number, idx: number): string => {
                            if (idx % 2) {
                                return `${acc}${val} `;
                            }

                            return `${acc}${val},`;
                        }, '',
                    );
                    (this.svgShapes[clientID] as any).clear();
                    this.svgShapes[clientID].attr('points', stringified);

                    if (state.shapeType === 'points') {
                        this.selectize(false, this.svgShapes[clientID]);
                        this.setupPoints(this.svgShapes[clientID] as SVG.PolyLine, state);
                    }
                }
            }

            for (const attrID of Object.keys(state.attributes)) {
                if (state.attributes[attrID] !== drawnState.attributes[attrID]) {
                    const text = this.svgTexts[state.clientID];
                    if (text) {
                        const [span] = this.svgTexts[state.clientID].node
                            .querySelectorAll(`[attrID="${attrID}"]`) as any as SVGTSpanElement[];
                        if (span && span.textContent) {
                            const prefix = span.textContent.split(':').slice(0, -1).join(':');
                            span.textContent = `${prefix}: ${state.attributes[attrID]}`;
                        }
                    }
                }
            }

            this.saveState(state);
        }
    }

    private addObjects(states: any[], translate: (points: number[]) => number[]): void {
        for (const state of states) {
            if (state.objectType === 'tag') {
                this.addTag(state);
            } else {
                const points: number[] = (state.points as number[]);
                const translatedPoints: number[] = translate(points);

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

                this.svgShapes[state.clientID].on('click.canvas', (): void => {
                    this.canvas.dispatchEvent(new CustomEvent('canvas.clicked', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state,
                        },
                    }));
                });
            }

            this.saveState(state);
        }
    }

    private sortObjects(): void {
        // TODO: Can be significantly optimized
        const states = Array.from(
            this.content.getElementsByClassName('cvat_canvas_shape'),
        ).map((state: SVGElement): [SVGElement, number] => (
            [state, +state.getAttribute('data-z-order')]
        ));

        const needSort = states.some((pair): boolean => pair[1] !== states[0][1]);
        if (!states.length || !needSort) {
            return;
        }

        const sorted = states.sort((a, b): number => a[1] - b[1]);
        sorted.forEach((pair): void => {
            this.content.appendChild(pair[0]);
        });

        this.content.prepend(...sorted.map((pair): SVGElement => pair[0]));
    }

    private deactivateAttribute(): void {
        const { clientID, attributeID } = this.activeElement;
        if (clientID !== null && attributeID !== null) {
            const text = this.svgTexts[clientID];
            if (text) {
                const [span] = text.node
                    .querySelectorAll(`[attrID="${attributeID}"]`) as any as SVGTSpanElement[];
                if (span) {
                    span.style.fill = '';
                }
            }

            this.activeElement = {
                ...this.activeElement,
                attributeID: null,
            };
        }
    }

    private deactivateShape(): void {
        if (this.activeElement.clientID !== null) {
            const { clientID } = this.activeElement;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[clientID];

            shape.removeClass('cvat_canvas_shape_activated');

            if (!drawnState.pinned) {
                (shape as any).off('dragstart');
                (shape as any).off('dragend');
                (shape as any).draggable(false);
            }

            if (drawnState.shapeType !== 'points') {
                this.selectize(false, shape);
            }

            (shape as any).off('resizestart');
            (shape as any).off('resizing');
            (shape as any).off('resizedone');
            (shape as any).resize(false);

            // TODO: Hide text only if it is hidden by settings
            const text = this.svgTexts[clientID];
            if (text) {
                text.remove();
                delete this.svgTexts[clientID];
            }

            this.sortObjects();

            this.activeElement = {
                ...this.activeElement,
                clientID: null,
            };
        }
    }

    private deactivate(): void {
        this.deactivateAttribute();
        this.deactivateShape();
    }

    private activateAttribute(clientID: number, attributeID: number): void {
        const text = this.svgTexts[clientID];
        if (text) {
            const [span] = text.node
                .querySelectorAll(`[attrID="${attributeID}"]`) as any as SVGTSpanElement[];
            if (span) {
                span.style.fill = 'red';
            }

            this.activeElement = {
                ...this.activeElement,
                attributeID,
            };
        }
    }

    private activateShape(clientID: number): void {
        const [state] = this.controller.objects
            .filter((_state: any): boolean => _state.clientID === clientID);

        if (state && state.shapeType === 'points') {
            this.svgShapes[clientID].remember('_selectHandler').nested
                .style('pointer-events', state.lock ? 'none' : '');
        }

        if (!state || state.hidden || state.outside) {
            return;
        }

        const shape = this.svgShapes[clientID];

        let text = this.svgTexts[clientID];
        if (!text) {
            text = this.addText(state);
            this.svgTexts[state.clientID] = text;
            this.updateTextPosition(
                text,
                shape,
            );
        }

        if (state.lock) {
            return;
        }

        shape.addClass('cvat_canvas_shape_activated');
        if (state.shapeType === 'points') {
            this.content.append(this.svgShapes[clientID]
                .remember('_selectHandler').nested.node);
        } else {
            this.content.append(shape.node);
        }

        if (!state.pinned) {
            (shape as any).draggable().on('dragstart', (): void => {
                this.mode = Mode.DRAG;
                if (text) {
                    text.addClass('cvat_canvas_hidden');
                }
            }).on('dragend', (e: CustomEvent): void => {
                if (text) {
                    text.removeClass('cvat_canvas_hidden');
                    this.updateTextPosition(
                        text,
                        shape,
                    );
                }

                this.mode = Mode.IDLE;
                const p1 = e.detail.handler.startPoints.point;
                const p2 = e.detail.p;
                const delta = 1;
                const { offset } = this.controller.geometry;
                if (Math.sqrt(((p1.x - p2.x) ** 2) + ((p1.y - p2.y) ** 2)) >= delta) {
                    const points = pointsToArray(
                        shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                            + `${shape.attr('x') + shape.attr('width')},`
                            + `${shape.attr('y') + shape.attr('height')}`,
                    ).map((x: number): number => x - offset);

                    this.drawnStates[state.clientID].points = points;
                    this.canvas.dispatchEvent(new CustomEvent('canvas.dragshape', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            id: state.clientID,
                        },
                    }));
                    this.onEditDone(state, points);
                }
            });
        }

        if (state.shapeType !== 'points') {
            this.selectize(true, shape);
        }

        let shapeSizeElement: ShapeSizeElement | null = null;
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
                this.updateTextPosition(
                    text,
                    shape,
                );
            }

            this.mode = Mode.IDLE;

            if (resized) {
                const { offset } = this.controller.geometry;

                const points = pointsToArray(
                    shape.attr('points') || `${shape.attr('x')},${shape.attr('y')} `
                        + `${shape.attr('x') + shape.attr('width')},`
                        + `${shape.attr('y') + shape.attr('height')}`,
                ).map((x: number): number => x - offset);

                this.drawnStates[state.clientID].points = points;
                this.canvas.dispatchEvent(new CustomEvent('canvas.resizeshape', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        id: state.clientID,
                    },
                }));
                this.onEditDone(state, points);
            }
        });

        this.activeElement = {
            ...this.activeElement,
            clientID,
        };

        this.canvas.dispatchEvent(new CustomEvent('canvas.activated', {
            bubbles: false,
            cancelable: true,
            detail: {
                state,
            },
        }));
    }

    private activate(activeElement: ActiveElement): void {
        // Check if another element have been already activated
        if (this.activeElement.clientID !== null) {
            if (this.activeElement.clientID !== activeElement.clientID) {
                // Deactivate previous shape and attribute
                this.deactivate();
            } else if (this.activeElement.attributeID !== activeElement.attributeID) {
                this.deactivateAttribute();
            }
        }

        const { clientID, attributeID } = activeElement;
        if (clientID !== null && this.activeElement.clientID !== clientID) {
            this.activateShape(clientID);
        }

        if (clientID !== null
            && attributeID !== null
            && this.activeElement.attributeID !== attributeID
        ) {
            this.activateAttribute(clientID, attributeID);
        }
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
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).move(xtl, ytl)
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            rect.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside) {
            rect.style('display', 'none');
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
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polygon.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside) {
            polygon.style('display', 'none');
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
            stroke: state.color,
            'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            'data-z-order': state.zOrder,
        }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polyline.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside) {
            polyline.style('display', 'none');
        }

        return polyline;
    }

    private setupPoints(basicPolyline: SVG.PolyLine, state: any): any {
        this.selectize(true, basicPolyline);

        const group: SVG.G = basicPolyline.remember('_selectHandler').nested
            .addClass('cvat_canvas_shape').attr({
                clientID: state.clientID,
                id: `cvat_canvas_shape_${state.clientID}`,
                'data-z-order': state.zOrder,
            });

        group.on('click.canvas', (event: MouseEvent): void => {
            // Need to redispatch the event on another element
            basicPolyline.fire(new MouseEvent('click', event));
        });

        group.bbox = basicPolyline.bbox.bind(basicPolyline);
        group.clone = basicPolyline.clone.bind(basicPolyline);

        return group;
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

        const group = this.setupPoints(shape, state);

        if (state.hidden || state.outside) {
            group.style('display', 'none');
        }

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
