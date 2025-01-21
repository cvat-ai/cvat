// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import polylabel from 'polylabel';
import { fabric } from 'fabric';
import * as SVG from 'svg.js';

import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';

import { CanvasController } from './canvasController';
import { Listener, Master } from './master';
import { DrawHandler, DrawHandlerImpl } from './drawHandler';
import { MasksHandler, MasksHandlerImpl } from './masksHandler';
import { EditHandler, EditHandlerImpl } from './editHandler';
import { MergeHandler, MergeHandlerImpl } from './mergeHandler';
import { SplitHandler, SplitHandlerImpl } from './splitHandler';
import { ObjectSelector, ObjectSelectorImpl } from './objectSelector';
import { GroupHandler, GroupHandlerImpl } from './groupHandler';
import { SliceHandler, SliceHandlerImpl } from './sliceHandler';
import { RegionSelector, RegionSelectorImpl } from './regionSelector';
import { ZoomHandler, ZoomHandlerImpl } from './zoomHandler';
import { InteractionHandler, InteractionHandlerImpl } from './interactionHandler';
import { AutoborderHandler, AutoborderHandlerImpl } from './autoborderHandler';
import consts from './consts';
import {
    translateToSVG, translateFromSVG, translateToCanvas, translateFromCanvas,
    pointsToNumberArray, parsePoints, displayShapeSize, scalarProduct,
    vectorLength, ShapeSizeElement, DrawnState, rotate2DPoints,
    readPointsFromShape, setupSkeletonEdges, makeSVGFromTemplate,
    imageDataToDataURL, expandChannels, stringifyPoints, zipChannels,
} from './shared';
import {
    CanvasModel, Geometry, UpdateReasons, FrameZoom, ActiveElement,
    DrawData, MergeData, SplitData, Mode, Size, Configuration,
    InteractionResult, InteractionData, ColorBy, HighlightedElements,
    HighlightSeverity, GroupData, JoinData, CanvasHint,
} from './canvasModel';

export interface CanvasView {
    html(): HTMLDivElement;
    setupConflictRegions(clientID: number): number[];
}

export class CanvasViewImpl implements CanvasView, Listener {
    private text: SVGSVGElement;
    private adoptedText: SVG.Container;
    private background: HTMLCanvasElement;
    private masksContent: HTMLCanvasElement;
    private bitmap: HTMLCanvasElement;
    private bitmapUpdateReqId: number;
    private grid: SVGSVGElement;
    private content: SVGSVGElement;
    private attachmentBoard: HTMLDivElement;
    private adoptedContent: SVG.Container;
    private canvas: HTMLDivElement;
    private gridPath: SVGPathElement;
    private gridPattern: SVGPatternElement;
    private controller: CanvasController;
    private svgShapes: Record<number, SVG.Shape>;
    private svgTexts: Record<number, SVG.Text>;
    private isImageLoading: boolean;
    private issueRegionPattern_1: SVG.Pattern;
    private issueRegionPattern_2: SVG.Pattern;
    private drawnStates: Record<number, DrawnState>;
    private drawnIssueRegions: Record<number, SVG.Shape>;
    private geometry: Geometry;
    private drawHandler: DrawHandler;
    private masksHandler: MasksHandler;
    private editHandler: EditHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private sliceHandler: SliceHandler;
    private regionSelector: RegionSelector;
    private objectSelector: ObjectSelector;
    private zoomHandler: ZoomHandler;
    private autoborderHandler: AutoborderHandler;
    private interactionHandler: InteractionHandler;
    private activeElement: ActiveElement;
    private highlightedElements: HighlightedElements;
    private configuration: Configuration;
    private snapToAngleResize: number;
    private draggableShape: SVG.Shape | null;
    private resizableShape: SVG.Shape | null;
    private innerObjectsFlags: {
        drawHidden: Record<number, boolean>;
        editHidden: Record<number, boolean>;
        sliceHidden: Record<number, boolean>;
    };

    private set mode(value: Mode) {
        this.controller.mode = value;
    }

    private get mode(): Mode {
        return this.controller.mode;
    }

    private onMessage = (messages: CanvasHint[] | null, topic: string): void => {
        this.canvas.dispatchEvent(
            new CustomEvent('canvas.message', {
                bubbles: false,
                cancelable: true,
                detail: {
                    topic,
                    messages,
                },
            }),
        );
    };

    private onError = (exception: unknown, domain?: string): void => {
        this.canvas.dispatchEvent(
            new CustomEvent('canvas.error', {
                bubbles: false,
                cancelable: true,
                detail: {
                    domain,
                    exception: exception instanceof Error ?
                        exception : new Error(`Unknown exception: "${exception}"`),
                },
            }),
        );
    };

    private stateIsLocked(state: any): boolean {
        const { configuration } = this.controller;
        return state.lock || configuration.forceDisableEditing;
    }

    private translateToCanvas(points: number[]): number[] {
        const { offset } = this.controller.geometry;
        return translateToCanvas(offset, points);
    }

    private translateFromCanvas(points: number[]): number[] {
        const { offset } = this.controller.geometry;
        return translateFromCanvas(offset, points);
    }

    private translatePointsFromRotatedShape(
        shape: SVG.Shape, points: number[], cx: number = null, cy: number = null,
    ): number[] {
        const { rotation } = shape.transform();
        // currently shape is rotated and SHIFTED somehow additionally (css transform property)
        // let's remove rotation to get correct transformation matrix (element -> screen)
        // correct means that we do not consider points to be rotated
        // because rotation property is stored separately and already saved
        if (cx !== null && cy !== null) {
            shape.rotate(0, cx, cy);
        } else {
            shape.rotate(0);
        }

        const result = [];

        try {
            // get each point and apply a couple of matrix transformation to it
            const point = this.content.createSVGPoint();
            // matrix to convert from ELEMENT coordinate system to CLIENT coordinate system
            const ctm = (
                (shape.node as any) as SVGRectElement | SVGPolygonElement | SVGPolylineElement | SVGGElement
            ).getScreenCTM();
            // matrix to convert from CLIENT coordinate system to CANVAS coordinate system
            const ctm1 = this.content.getScreenCTM().inverse();
            // NOTE: I tried to use element.getCTM(), but this way does not work on firefox

            for (let i = 0; i < points.length; i += 2) {
                point.x = points[i];
                point.y = points[i + 1];
                let transformedPoint = point.matrixTransform(ctm);
                transformedPoint = transformedPoint.matrixTransform(ctm1);

                result.push(transformedPoint.x, transformedPoint.y);
            }
        } finally {
            if (cx !== null && cy !== null) {
                shape.rotate(rotation, cx, cy);
            } else {
                shape.rotate(rotation);
            }
        }

        return result;
    }

    private isInnerHidden(clientID: number): boolean {
        return this.innerObjectsFlags.drawHidden[clientID] ||
            this.innerObjectsFlags.editHidden[clientID] ||
            this.innerObjectsFlags.sliceHidden[clientID] ||
            false;
    }

    private setupInnerFlags(clientID: number, path: keyof CanvasViewImpl['innerObjectsFlags'], value: boolean): void {
        this.innerObjectsFlags[path][clientID] = value;
        const shape = this.svgShapes[clientID];
        const text = this.svgTexts[clientID];
        const state = this.drawnStates[clientID];

        if (value && clientID === this.controller.activeElement.clientID) {
            this.deactivate();
        }

        if (value) {
            if (shape) {
                (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape).addClass(
                    'cvat_canvas_hidden',
                );
            }

            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        } else {
            delete this.innerObjectsFlags[path][clientID];

            if (state) {
                if (!state.outside && !state.hidden) {
                    if (shape) {
                        (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape).removeClass(
                            'cvat_canvas_hidden',
                        );
                    }

                    if (text) {
                        text.removeClass('cvat_canvas_hidden');
                        this.updateTextPosition(text);
                    }
                }
            }
        }
    }

    private dispatchCanceledEvent(): void {
        this.mode = Mode.IDLE;
        const event: CustomEvent = new CustomEvent('canvas.canceled', {
            bubbles: false,
            cancelable: true,
        });

        this.canvas.dispatchEvent(event);
    }

    private resetViewPosition(clientID: number): void {
        const drawnState = this.drawnStates[clientID];
        const drawnShape = this.svgShapes[clientID];

        if (drawnState && drawnShape) {
            const { shapeType, points } = drawnState;
            const translatedPoints: number[] = this.translateToCanvas(points);
            const stringified = stringifyPoints(translatedPoints);
            if (shapeType === 'cuboid') {
                drawnShape.attr('points', stringified);
            } else if (['polygon', 'polyline', 'points'].includes(shapeType)) {
                (drawnShape as SVG.PolyLine | SVG.Polygon).plot(stringified);
                if (shapeType === 'points') {
                    this.selectize(false, drawnShape);
                    this.setupPoints(drawnShape as SVG.PolyLine, drawnState);
                }
            } else if (shapeType === 'rectangle') {
                const [xtl, ytl, xbr, ybr] = translatedPoints;
                drawnShape.rotate(0);
                drawnShape.size(xbr - xtl, ybr - ytl).move(xtl, ytl);
                drawnShape.rotate(drawnState.rotation);
            } else if (shapeType === 'ellipse') {
                const [cx, cy, rightX, topY] = translatedPoints;
                const [rx, ry] = [rightX - cx, cy - topY];
                drawnShape.rotate(0);
                drawnShape.size(rx * 2, ry * 2).center(cx, cy);
                drawnShape.rotate(drawnState.rotation);
            } else if (shapeType === 'skeleton') {
                drawnShape.rotate(0);
                for (const child of (drawnShape as SVG.G).children()) {
                    if (child.type === 'circle') {
                        const childClientID = child.attr('data-client-id');
                        const element = drawnState.elements.find((el: any) => el.clientID === childClientID);
                        const [x, y] = this.translateToCanvas(element.points);
                        child.center(x, y);
                    }
                }
                drawnShape.rotate(drawnState.rotation);
            } else if (shapeType === 'mask') {
                const [left, top] = points.slice(-4);
                drawnShape.move(this.geometry.offset + left, this.geometry.offset + top);
            } else {
                throw new Error('Not implemented');
            }
        }
    }

    private onInteraction = (
        shapes: InteractionResult[] | null,
        shapesUpdated = true,
        isDone = false,
    ): void => {
        const { zLayer } = this.controller;
        if (Array.isArray(shapes)) {
            const event: CustomEvent = new CustomEvent('canvas.interacted', {
                bubbles: false,
                cancelable: true,
                detail: {
                    shapesUpdated,
                    isDone,
                    shapes,
                    zOrder: zLayer || 0,
                },
            });

            this.canvas.dispatchEvent(event);
        }

        if (shapes === null || isDone) {
            this.dispatchCanceledEvent();
        }
    };

    private onDrawDone = (
        data: any | null,
        duration: number,
        continueDraw?: boolean,
        prevDrawData?: DrawData,
    ): void => {
        const hiddenBecauseOfDraw = Object.keys(this.innerObjectsFlags.drawHidden)
            .map((_clientID): number => +_clientID);
        if (hiddenBecauseOfDraw.length) {
            for (const hidden of hiddenBecauseOfDraw) {
                this.setupInnerFlags(hidden, 'drawHidden', false);
            }
        }

        if (data) {
            const { clientID, elements } = data as any;
            const points = data.points || elements.map((el: any) => el.points).flat();
            if (typeof clientID === 'number') {
                const [state] = this.controller.objects
                    .filter((_state: any): boolean => _state.clientID === clientID);
                this.onEditDone(state, points);
                this.dispatchCanceledEvent();
                return;
            }

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
        } else if (!continueDraw) {
            this.dispatchCanceledEvent();
        }

        if (continueDraw) {
            this.canvas.dispatchEvent(
                new CustomEvent('canvas.drawstart', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        drawData: prevDrawData,
                    },
                }),
            );
        } else {
            // when draw stops from inside canvas (for example if use predefined number of points)
            this.mode = Mode.IDLE;
            this.canvas.style.cursor = '';
        }
    };

    private onEditStart = (state?: any): void => {
        this.canvas.style.cursor = 'crosshair';
        this.deactivate();
        this.canvas.dispatchEvent(
            new CustomEvent('canvas.editstart', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                },
            }),
        );

        if (state && state.shapeType === 'mask') {
            this.setupInnerFlags(state.clientID, 'editHidden', true);
        }

        this.mode = Mode.EDIT;
    };

    private onEditDone = (state: any, points: number[], rotation?: number): void => {
        this.canvas.style.cursor = '';
        this.mode = Mode.IDLE;
        if (state && points) {
            const event: CustomEvent = new CustomEvent('canvas.edited', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                    points,
                    rotation: typeof rotation === 'number' ? rotation : state.rotation,
                },
            });

            this.canvas.dispatchEvent(event);
        } else {
            this.dispatchCanceledEvent();
        }

        for (const clientID of Object.keys(this.innerObjectsFlags.editHidden)) {
            this.setupInnerFlags(+clientID, 'editHidden', false);
        }
    };

    private onMergeDone = (objects: any[] | null, duration?: number): void => {
        if (objects) {
            const event: CustomEvent = new CustomEvent('canvas.merged', {
                bubbles: false,
                cancelable: true,
                detail: {
                    duration,
                    states: objects,
                },
            });

            this.mode = Mode.IDLE;
            this.canvas.dispatchEvent(event);
        } else {
            this.dispatchCanceledEvent();
        }
    };

    private onSplitDone = (object?: any, duration?: number): void => {
        if (object && typeof duration !== 'undefined') {
            const event: CustomEvent = new CustomEvent('canvas.splitted', {
                bubbles: false,
                cancelable: true,
                detail: {
                    duration,
                    state: object,
                    frame: object.frame,
                },
            });

            this.canvas.style.cursor = '';
            this.mode = Mode.IDLE;
            this.splitHandler.split({ enabled: false });
            this.canvas.dispatchEvent(event);
        } else {
            this.dispatchCanceledEvent();
        }
    };

    private onSelectDone = (objects?: any[], duration?: number): void => {
        if (this.mode === Mode.JOIN) {
            this.onMessage(null, 'join');
        }

        if (objects && typeof duration !== 'undefined') {
            if (this.mode === Mode.GROUP && objects.length > 1) {
                this.mode = Mode.IDLE;
                this.canvas.dispatchEvent(new CustomEvent('canvas.groupped', {
                    bubbles: false,
                    cancelable: true,
                    detail: {
                        duration,
                        states: objects,
                    },
                }));
            } else if (this.mode === Mode.JOIN && objects.length > 1) {
                this.mode = Mode.IDLE;
                let [left, top, right, bottom] = objects[0].points.slice(-4);
                objects.forEach((state) => {
                    const [curLeft, curTop, curRight, curBottom] = state.points.slice(-4);
                    left = Math.min(left, curLeft);
                    top = Math.min(top, curTop);
                    right = Math.max(right, curRight);
                    bottom = Math.max(bottom, curBottom);
                });

                Promise.all(objects.map((state) => {
                    const [curLeft, , curRight] = state.points.slice(-4, -1);
                    const image = new ImageData(expandChannels(255, 255, 255, state.points), curRight - curLeft + 1);
                    return createImageBitmap(image);
                })).then((results) => {
                    const canvas = new OffscreenCanvas(right - left + 1, bottom - top + 1);
                    results.forEach((bitmap, idx) => {
                        const [curLeft, curTop] = objects[idx].points.slice(-4, -2);
                        canvas.getContext('2d').drawImage(bitmap, curLeft - left, curTop - top);
                        bitmap.close();
                    });

                    const imageData = canvas.getContext('2d')
                        .getImageData(0, 0, right - left + 1, bottom - top + 1);
                    const rle = zipChannels(imageData.data);
                    rle.push(left, top, right, bottom);
                    this.canvas.dispatchEvent(new CustomEvent('canvas.joined', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            duration,
                            states: objects,
                            points: rle,
                        },
                    }));
                }).catch(this.onError);
            }
        } else {
            this.dispatchCanceledEvent();
        }
    };

    private onSliceDone = (state?: any, results?: number[][], duration?: number): void => {
        if (state && results && typeof duration !== 'undefined') {
            this.mode = Mode.IDLE;
            this.sliceHandler.slice({ enabled: false });
            this.canvas.dispatchEvent(new CustomEvent('canvas.sliced', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                    results,
                    duration,
                },
            }));
        } else {
            this.dispatchCanceledEvent();
        }
    };

    private onRegionSelected = (points?: number[]): void => {
        if (points) {
            this.canvas.dispatchEvent(new CustomEvent('canvas.regionselected', {
                bubbles: false,
                cancelable: true,
                detail: {
                    points,
                },
            }));
        } else {
            this.dispatchCanceledEvent();
        }
    };

    private onFindObject = (e: MouseEvent): void => {
        if (e.button === 0) {
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
    };

    private onFocusRegion = (x: number, y: number, width: number, height: number): void => {
        // First of all, compute and apply scale
        let scale = null;

        if ((this.geometry.angle / 90) % 2) {
            // 90, 270, ..
            scale = Math.min(
                Math.max(
                    Math.min(this.geometry.canvas.width / height, this.geometry.canvas.height / width),
                    FrameZoom.MIN,
                ),
                FrameZoom.MAX,
            );
        } else {
            scale = Math.min(
                Math.max(
                    Math.min(this.geometry.canvas.width / width, this.geometry.canvas.height / height),
                    FrameZoom.MIN,
                ),
                FrameZoom.MAX,
            );
        }

        this.geometry = { ...this.geometry, scale };
        this.transformCanvas();

        const [canvasX, canvasY] = translateFromSVG(this.content, [x + width / 2, y + height / 2]);

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
    };

    private moveCanvas(): void {
        for (const obj of [this.background, this.grid, this.bitmap]) {
            obj.style.top = `${this.geometry.top}px`;
            obj.style.left = `${this.geometry.left}px`;
        }

        for (const obj of [this.content, this.text, this.attachmentBoard]) {
            obj.style.top = `${this.geometry.top - this.geometry.offset}px`;
            obj.style.left = `${this.geometry.left - this.geometry.offset}px`;
        }

        // Transform handlers
        this.drawHandler.transform(this.geometry);
        this.masksHandler.transform(this.geometry);
        this.editHandler.transform(this.geometry);
        this.zoomHandler.transform(this.geometry);
        this.autoborderHandler.transform(this.geometry);
        this.interactionHandler.transform(this.geometry);
        this.regionSelector.transform(this.geometry);
        this.objectSelector.transform(this.geometry);
        this.sliceHandler.transform(this.geometry);
    }

    private transformCanvas(): void {
        // Transform canvas
        for (const obj of [
            this.background,
            this.grid,
            this.content,
            this.bitmap,
            this.attachmentBoard,
        ]) {
            obj.style.transform = `scale(${this.geometry.scale}) rotate(${this.geometry.angle}deg)`;
        }

        // Transform grid
        this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH / this.geometry.scale}px`);

        // Transform all shape points
        for (const element of [
            ...window.document.getElementsByClassName('svg_select_points'),
            ...window.document.getElementsByClassName('svg_select_points_rot'),
            ...window.document.getElementsByClassName('svg_select_boundingRect'),
        ]) {
            element.setAttribute('stroke-width', `${consts.POINTS_STROKE_WIDTH / this.geometry.scale}`);
            element.setAttribute('r', `${this.configuration.controlPointsSize / this.geometry.scale}`);
        }

        for (const element of window.document.getElementsByClassName('cvat_canvas_poly_direction')) {
            const angle = (element as any).instance.data('angle');

            (element as any).instance.style({
                transform: `scale(${1 / this.geometry.scale}) rotate(${angle}deg)`,
            });
        }

        for (const element of window.document.getElementsByClassName('cvat_canvas_selected_point')) {
            const previousWidth = element.getAttribute('stroke-width') as string;
            element.setAttribute('stroke-width', `${+previousWidth * 2}`);
        }

        // Transform all drawn shapes and text
        for (const key of Object.keys(this.svgShapes)) {
            const clientID = +key;
            const object = this.svgShapes[clientID];
            object.attr({
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
            });
            if (object.type === 'circle') {
                object.attr('r', `${this.configuration.controlPointsSize / this.geometry.scale}`);
            }
            if (clientID in this.svgTexts) {
                this.updateTextPosition(this.svgTexts[clientID]);
            }
        }

        // Transform skeleton edges
        for (const skeletonEdge of window.document.getElementsByClassName('cvat_canvas_skeleton_edge')) {
            skeletonEdge.setAttribute('stroke-width', `${consts.BASE_STROKE_WIDTH / this.geometry.scale}`);
        }

        // Transform all drawn issues region
        for (const issueRegion of Object.values(this.drawnIssueRegions)) {
            ((issueRegion as any) as SVG.Shape).attr('r', `${(consts.BASE_POINT_SIZE * 3) / this.geometry.scale}`);
            ((issueRegion as any) as SVG.Shape).attr(
                'stroke-width',
                `${consts.BASE_STROKE_WIDTH / this.geometry.scale}`,
            );
        }

        // Transform patterns
        for (const pattern of [this.issueRegionPattern_1, this.issueRegionPattern_2]) {
            pattern.attr({
                width: consts.BASE_PATTERN_SIZE / this.geometry.scale,
                height: consts.BASE_PATTERN_SIZE / this.geometry.scale,
            });

            pattern.children().forEach((element: SVG.Element): void => {
                element.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
            });
        }

        // Transform handlers
        this.drawHandler.transform(this.geometry);
        this.masksHandler.transform(this.geometry);
        this.editHandler.transform(this.geometry);
        this.zoomHandler.transform(this.geometry);
        this.autoborderHandler.transform(this.geometry);
        this.interactionHandler.transform(this.geometry);
        this.regionSelector.transform(this.geometry);
    }

    private resizeCanvas(): void {
        for (const obj of [this.background, this.masksContent, this.grid, this.bitmap]) {
            obj.style.width = `${this.geometry.image.width}px`;
            obj.style.height = `${this.geometry.image.height}px`;
        }

        for (const obj of [this.content, this.text, this.attachmentBoard]) {
            obj.style.width = `${this.geometry.image.width + this.geometry.offset * 2}px`;
            obj.style.height = `${this.geometry.image.height + this.geometry.offset * 2}px`;
        }
    }

    private setupIssueRegions(issueRegions: Record<number, { hidden: boolean; points: number[] }>): void {
        for (const issueRegion of Object.keys(this.drawnIssueRegions)) {
            if (!(issueRegion in issueRegions) || !+issueRegion) {
                this.drawnIssueRegions[+issueRegion].remove();
                delete this.drawnIssueRegions[+issueRegion];
            }
        }

        for (const issueRegion of Object.keys(issueRegions)) {
            if (issueRegion in this.drawnIssueRegions) continue;
            const points = this.translateToCanvas(issueRegions[+issueRegion].points);
            if (points.length === 2) {
                this.drawnIssueRegions[+issueRegion] = this.adoptedContent
                    .circle((consts.BASE_POINT_SIZE * 3 * 2) / this.geometry.scale)
                    .center(points[0], points[1])
                    .addClass('cvat_canvas_issue_region')
                    .attr({
                        id: `cvat_canvas_issue_region_${issueRegion}`,
                        fill: 'url(#cvat_issue_region_pattern_1)',
                    });
            } else if (points.length === 4) {
                const stringified = stringifyPoints([
                    points[0],
                    points[1],
                    points[2],
                    points[1],
                    points[2],
                    points[3],
                    points[0],
                    points[3],
                ]);
                this.drawnIssueRegions[+issueRegion] = this.adoptedContent
                    .polygon(stringified)
                    .addClass('cvat_canvas_issue_region')
                    .attr({
                        id: `cvat_canvas_issue_region_${issueRegion}`,
                        fill: 'url(#cvat_issue_region_pattern_1)',
                        'stroke-width': `${consts.BASE_STROKE_WIDTH / this.geometry.scale}`,
                    });
            } else {
                const stringified = stringifyPoints(points);
                this.drawnIssueRegions[+issueRegion] = this.adoptedContent
                    .polygon(stringified)
                    .addClass('cvat_canvas_issue_region')
                    .attr({
                        id: `cvat_canvas_issue_region_${issueRegion}`,
                        fill: 'url(#cvat_issue_region_pattern_1)',
                        'stroke-width': `${consts.BASE_STROKE_WIDTH / this.geometry.scale}`,
                    });
            }

            if (issueRegions[+issueRegion].hidden) {
                this.drawnIssueRegions[+issueRegion].style({ display: 'none' });
            }
        }
    }

    private setupObjects(states: any[]): void {
        const created = [];
        const updated = [];

        for (const state of states) {
            if (!(state.clientID in this.drawnStates)) {
                created.push(state);
            } else {
                const drawnState = this.drawnStates[state.clientID];
                // object has been changed or changed frame for a track
                if (drawnState.updated !== state.updated || drawnState.frame !== state.frame) {
                    updated.push(state);
                }
            }
        }
        const newIDs = states.map((state: any): number => state.clientID);
        const deleted = Object.keys(this.drawnStates)
            .map((clientID: string): number => +clientID)
            .filter((id: number): boolean => !newIDs.includes(id))
            .map((id: number): any => this.drawnStates[id]);

        if (deleted.length || updated.length || created.length) {
            if (this.activeElement.clientID !== null) {
                this.deactivate();
            }

            this.deleteObjects(deleted);
            this.addObjects(created);

            const updatedSkeletons = updated.filter((state: any): boolean => state.shapeType === 'skeleton');
            const updatedNotSkeletons = updated.filter((state: any): boolean => state.shapeType !== 'skeleton');
            // todo: implement updateObjects for skeletons, add group and color to updateObjects function
            // change colors if necessary (for example when instance color is changed)
            this.updateObjects(updatedNotSkeletons);

            this.deleteObjects(updatedSkeletons);
            this.addObjects(updatedSkeletons);

            this.sortObjects();

            if (this.controller.activeElement.clientID !== null) {
                const { clientID } = this.controller.activeElement;
                if (states.map((state: any): number => state.clientID).includes(clientID)) {
                    this.activate(this.controller.activeElement);
                }
            }

            this.autoborderHandler.updateObjects();
        }
    }

    private hideDirection(shape: SVG.Polygon | SVG.PolyLine): void {
        /* eslint class-methods-use-this: 0 */
        const handler = shape.remember('_selectHandler');
        if (!handler || !handler.nested) return;
        const nested = handler.nested as SVG.Parent;
        if (nested.children().length) {
            nested.children()[0].removeClass('cvat_canvas_first_poly_point');
        }

        const node = nested.node as SVG.LinkedHTMLElement;
        const directions = node.getElementsByClassName('cvat_canvas_poly_direction');
        for (const direction of directions) {
            const { instance } = direction as any;
            instance.off('click');
            instance.remove();
        }
    }

    private showDirection(state: any, shape: SVG.Polygon | SVG.PolyLine): void {
        const path = consts.ARROW_PATH;

        const points = parsePoints(state.points);
        const handler = shape.remember('_selectHandler');

        if (!handler || !handler.nested) return;
        const firstCircle = handler.nested.children()[0];
        const secondCircle = handler.nested.children()[1];
        firstCircle.addClass('cvat_canvas_first_poly_point');

        const [cx, cy] = [(secondCircle.cx() + firstCircle.cx()) / 2, (secondCircle.cy() + firstCircle.cy()) / 2];
        const [firstPoint, secondPoint] = points.slice(0, 2);
        const xAxis = { i: 1, j: 0 };
        const baseVector = { i: secondPoint.x - firstPoint.x, j: secondPoint.y - firstPoint.y };
        const baseVectorLength = vectorLength(baseVector);
        let cosinus = 0;

        if (baseVectorLength !== 0) {
            // two points have the same coordinates
            cosinus = scalarProduct(xAxis, baseVector) / (vectorLength(xAxis) * baseVectorLength);
        }
        const angle = (Math.acos(cosinus) * (Math.sign(baseVector.j) || 1) * 180) / Math.PI;

        const pathElement = handler.nested
            .path(path)
            .fill('white')
            .stroke({
                width: 1,
                color: 'black',
            })
            .addClass('cvat_canvas_poly_direction')
            .style({
                'transform-origin': `${cx}px ${cy}px`,
                transform: `scale(${1 / this.geometry.scale}) rotate(${angle}deg)`,
            })
            .move(cx, cy);

        pathElement.on('click', (e: MouseEvent): void => {
            if (e.button === 0) {
                e.stopPropagation();
                if (state.shapeType === 'polygon') {
                    const reversedPoints = [points[0], ...points.slice(1).reverse()];
                    this.onEditDone(state, pointsToNumberArray(reversedPoints));
                } else {
                    const reversedPoints = points.reverse();
                    this.onEditDone(state, pointsToNumberArray(reversedPoints));
                }
            }
        });

        pathElement.data('angle', angle);
        pathElement.dmove(-pathElement.width() / 2, -pathElement.height() / 2);
    }

    private selectize(value: boolean, shape: SVG.Element): void {
        const mousedownHandler = (e: MouseEvent): void => {
            if (e.button !== 0) return;
            e.preventDefault();

            if (this.activeElement.clientID !== null) {
                const pointID = Array.prototype.indexOf.call(
                    ((e.target as HTMLElement).parentElement as HTMLElement).children,
                    e.target,
                );
                const [state] = this.controller.objects.filter(
                    (_state: any): boolean => _state.clientID === this.activeElement.clientID,
                );

                if (['polygon', 'polyline', 'points'].includes(state.shapeType)) {
                    if (state.shapeType === 'points' && (e.altKey || e.ctrlKey)) {
                        const selectedClientID = +((e.target as HTMLElement).parentElement as HTMLElement).getAttribute('clientID');

                        if (state.clientID !== selectedClientID) {
                            return;
                        }
                    }
                    if (e.altKey) {
                        const { points } = state;
                        if (
                            (state.shapeType === 'polygon' && state.points.length > 6) ||
                            (state.shapeType === 'polyline' && state.points.length > 4) ||
                            (state.shapeType === 'points' && state.points.length > 2)
                        ) {
                            this.onEditDone(state, points.slice(0, pointID * 2).concat(points.slice(pointID * 2 + 2)));
                        }
                    } else if (e.shiftKey) {
                        this.onEditStart(state);
                        this.editHandler.edit({
                            enabled: true,
                            state,
                            pointID,
                        });
                    }
                }
            }
        };

        const dblClickHandler = (e: MouseEvent): void => {
            e.preventDefault();

            if (this.activeElement.clientID !== null) {
                const [state] = this.controller.objects.filter(
                    (_state: any): boolean => _state.clientID === this.activeElement.clientID,
                );

                if (state.shapeType === 'cuboid') {
                    if (e.shiftKey) {
                        const points = this.translateFromCanvas(
                            pointsToNumberArray((e.target as any).parentElement.parentElement.instance.attr('points')),
                        );
                        this.onEditDone(state, points);
                    }
                }
            }
        };

        const contextMenuHandler = (e: MouseEvent): void => {
            const pointID = Array.prototype.indexOf.call(
                ((e.target as HTMLElement).parentElement as HTMLElement).children,
                e.target,
            );
            if (this.activeElement.clientID !== null) {
                const [state] = this.controller.objects.filter(
                    (_state: any): boolean => _state.clientID === this.activeElement.clientID,
                );
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.contextmenu', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            mouseEvent: e,
                            objectState: state,
                            pointID,
                        },
                    }),
                );
            }
            e.preventDefault();
        };

        if (value) {
            const getGeometry = (): Geometry => this.geometry;
            const getController = (): CanvasController => this.controller;
            const getActiveElement = (): ActiveElement => this.activeElement;
            (shape as any).selectize(value, {
                deepSelect: true,
                pointSize: (2 * this.configuration.controlPointsSize) / this.geometry.scale,
                rotationPoint: shape.type === 'rect' || shape.type === 'ellipse',
                pointsExclude: shape.type === 'image' ? ['lt', 'rt', 'rb', 'lb', 't', 'r', 'b', 'l'] : [],
                pointType(cx: number, cy: number): SVG.Circle {
                    const circle: SVG.Circle = this.nested
                        .circle(this.options.pointSize)
                        .stroke('black')
                        .fill('inherit')
                        .center(cx, cy)
                        .attr({
                            'fill-opacity': 1,
                            'stroke-width': consts.POINTS_STROKE_WIDTH / getGeometry().scale,
                        });

                    circle.on('mouseenter', (e: MouseEvent): void => {
                        const activeElement = getActiveElement();
                        if (activeElement !== null && (e.altKey || e.ctrlKey)) {
                            const [state] = getController().objects.filter(
                                (_state: any): boolean => _state.clientID === activeElement.clientID,
                            );
                            if (state?.shapeType === 'points') {
                                const selectedClientID = +((e.target as HTMLElement).parentElement as HTMLElement).getAttribute('clientID');
                                if (state.clientID !== selectedClientID) {
                                    return;
                                }
                            }
                        }

                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / getGeometry().scale,
                        });

                        circle.on('dblclick', dblClickHandler);
                        circle.on('mousedown', mousedownHandler);
                        circle.on('contextmenu', contextMenuHandler);
                        circle.addClass('cvat_canvas_selected_point');
                    });

                    circle.on('mouseleave', (): void => {
                        circle.attr({
                            'stroke-width': consts.POINTS_STROKE_WIDTH / getGeometry().scale,
                        });

                        circle.off('dblclick', dblClickHandler);
                        circle.off('mousedown', mousedownHandler);
                        circle.off('contextmenu', contextMenuHandler);
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

        const [rotationPoint] = window.document.getElementsByClassName('svg_select_points_rot');
        const [topPoint] = window.document.getElementsByClassName('svg_select_points_t');
        if (rotationPoint && !rotationPoint.children.length) {
            if (topPoint) {
                const rotY = +(rotationPoint as SVGEllipseElement).getAttribute('cy');
                const topY = +(topPoint as SVGEllipseElement).getAttribute('cy');
                (rotationPoint as SVGCircleElement).style.transform = `translate(0px, -${rotY - topY + 20}px)`;
            }

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = 'Hold Shift to snap angle';
            rotationPoint.appendChild(title);
        }

        if (value && shape.type === 'image') {
            const [boundingRect] = window.document.getElementsByClassName('svg_select_boundingRect');
            if (boundingRect) {
                (boundingRect as SVGRectElement).style.opacity = '1';
                boundingRect.setAttribute('fill', 'none');
                boundingRect.setAttribute('stroke', shape.attr('stroke'));
                boundingRect.setAttribute('stroke-width', `${consts.BASE_STROKE_WIDTH / this.geometry.scale}px`);
                if (shape.hasClass('cvat_canvas_shape_occluded')) {
                    boundingRect.setAttribute('stroke-dasharray', '5');
                }
            }
        }
    }

    private draggable(
        state: any,
        shape: SVG.Shape,
        onDragStart: () => void = () => {},
        onDragMove: () => void = () => {},
        onDragEnd: () => void = () => {},
    ): void {
        let draggableInstance = shape;
        if (shape.classes().includes('cvat_canvas_shape_skeleton')) {
            // for skeletons we use wrapping rectangle to drag the skeleton itself
            draggableInstance = (shape as any).children().find((child: SVG.Element) => child.type === 'rect');
        }

        if (state) {
            let start = Date.now();
            let aborted = false;
            let skeletonSVGTemplate: SVG.G = null;
            shape.addClass('cvat_canvas_shape_draggable');
            (draggableInstance as any).draggable({
                ...(state.shapeType === 'mask' ? { snapToGrid: 1 } : {}),
            });

            let startCenter = null;
            draggableInstance.on('dragstart', (): void => {
                onDragStart();
                this.draggableShape = shape;
                const { cx, cy } = shape.bbox();
                startCenter = { x: cx, y: cy };
                start = Date.now();
            }).on('dragmove', (e: CustomEvent): void => {
                onDragMove();
                if (state.shapeType === 'skeleton' && e.target) {
                    const { instance } = e.target as any;
                    const [x, y] = [instance.x(), instance.y()];
                    const prevXtl = +draggableInstance.attr('data-xtl');
                    const prevYtl = +draggableInstance.attr('data-ytl');

                    for (const child of (shape as SVG.G).children()) {
                        if (child.type === 'circle') {
                            const childClientID = child.attr('data-client-id');
                            if (state.elements.find((el: any) => el.clientID === childClientID).lock || false) {
                                continue;
                            }
                            child.center(child.cx() - prevXtl + x, child.cy() - prevYtl + y);
                        }
                    }

                    draggableInstance.attr('data-xtl', x);
                    draggableInstance.attr('data-ytl', y);
                    draggableInstance.attr('data-xbr', x + instance.width());
                    draggableInstance.attr('data-ybr', y + instance.height());

                    skeletonSVGTemplate = skeletonSVGTemplate ?? makeSVGFromTemplate(state.label.structure.svg);
                    setupSkeletonEdges(shape as SVG.G, skeletonSVGTemplate);
                }
            }).on('dragend', (): void => {
                if (aborted) {
                    this.resetViewPosition(state.clientID);
                    return;
                }

                onDragEnd();
                this.draggableShape = null;
                const { cx, cy } = shape.bbox();

                const dx2 = (startCenter.x - cx) ** 2;
                const dy2 = (startCenter.y - cy) ** 2;
                if (Math.sqrt(dx2 + dy2) > 0) {
                    if (state.shapeType === 'mask') {
                        const { points } = state;
                        const x = Math.trunc(shape.x()) - this.geometry.offset;
                        const y = Math.trunc(shape.y()) - this.geometry.offset;
                        points.splice(-4);
                        points.push(x, y, x + shape.width() - 1, y + shape.height() - 1);
                        this.onEditDone(state, points);
                    } else if (state.shapeType === 'skeleton') {
                        const points = [];
                        state.elements.forEach((element: any) => {
                            const elementShape = (shape as SVG.G).children()
                                .find((child: SVG.Shape) => (
                                    child.id() === `cvat_canvas_shape_${element.clientID}`
                                ));

                            if (elementShape) {
                                points.push(...this.translateFromCanvas(readPointsFromShape(elementShape)));
                            }
                        });
                        this.onEditDone(state, points);
                    } else {
                        // these points does not take into account possible transformations, applied on the element
                        // so, if any (like rotation) we need to map them to canvas coordinate space
                        let points = readPointsFromShape(shape);
                        const { rotation } = shape.transform();
                        if (rotation) {
                            points = this.translatePointsFromRotatedShape(shape, points);
                        }

                        this.onEditDone(state, this.translateFromCanvas(points));
                    }

                    this.canvas.dispatchEvent(
                        new CustomEvent('canvas.dragshape', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                state,
                                duration: Date.now() - start,
                            },
                        }),
                    );
                }
            }).on('dragabort', (): void => {
                onDragEnd();
                this.draggableShape = null;
                aborted = true;
                // disable internal drag events of SVG.js
                // call chain is (mouseup -> SVG.handler.end -> SVG.handler.drag -> dragend)
                window.dispatchEvent(new MouseEvent('mouseup'));
            });
        } else {
            shape.removeClass('cvat_canvas_shape_draggable');

            if (this.draggableShape === shape) {
                draggableInstance.fire('dragabort');
            }

            draggableInstance.off('dragstart');
            draggableInstance.off('dragmove');
            draggableInstance.off('dragend');
            draggableInstance.off('dragabort');
            (draggableInstance as any).draggable(false);
        }
    }

    private resizable(
        state: any,
        shape: SVG.Shape,
        onResizeStart: () => void = () => {},
        onResizing: () => void = () => {},
        onResizeEnd: () => void = () => {},
    ): void {
        let resizableInstance = shape;
        let skeletonSVGTemplate: SVG.G = null;

        if (shape.classes().includes('cvat_canvas_shape_skeleton')) {
            // for skeletons we use wrapping rectangle to resize the skeleton itself
            resizableInstance = (shape as any).children().find((child: SVG.Element) => child.type === 'rect');

            const circles = (shape as any).children().filter((child: SVG.Element) => child.type === 'circle');
            const svgElements = Object.fromEntries(circles.map((circle: SVG.Circle) => [circle.attr('data-client-id'), circle]));

            Object.entries(svgElements).forEach(([key, element]) => {
                if (state) {
                    const clientID = +key;
                    const elementState = state.elements
                        .find((_element: any) => _element.clientID === clientID);
                    const text = this.svgTexts[clientID];
                    const hideElementText = (): void => {
                        if (text) {
                            text.addClass('cvat_canvas_hidden');
                        }
                    };

                    const showElementText = (): void => {
                        if (text) {
                            text.removeClass('cvat_canvas_hidden');
                            this.updateTextPosition(text);
                        }
                    };

                    if (!elementState.lock) {
                        this.draggable(elementState, element, () => {
                            this.mode = Mode.DRAG;
                            hideElementText();
                        }, () => {
                            skeletonSVGTemplate = skeletonSVGTemplate ?? makeSVGFromTemplate(state.label.structure.svg);
                            setupSkeletonEdges(shape as SVG.G, skeletonSVGTemplate);
                        }, () => {
                            this.mode = Mode.IDLE;
                            showElementText();
                        });
                    }
                } else {
                    this.draggable(null, element);
                }
            });
        }

        if (state) {
            let resized = false;
            let aborted = false;
            let start = Date.now();

            (resizableInstance as any)
                .resize({
                    snapToGrid: 0.1,
                    snapToAngle: this.snapToAngleResize,
                })
                .on('resizestart', (): void => {
                    onResizeStart();
                    resized = false;
                    start = Date.now();
                    this.resizableShape = shape;
                })
                .on('resizing', (e: CustomEvent): void => {
                    resized = true;
                    onResizing();

                    if (state.shapeType === 'skeleton' && e.target) {
                        const { instance } = e.target as any;

                        // rotate skeleton instead of wrapping bounding box
                        const { rotation } = resizableInstance.transform();
                        shape.rotate(rotation);

                        const [x, y] = [instance.x(), instance.y()];
                        const prevXtl = +resizableInstance.attr('data-xtl');
                        const prevYtl = +resizableInstance.attr('data-ytl');
                        const prevXbr = +resizableInstance.attr('data-xbr');
                        const prevYbr = +resizableInstance.attr('data-ybr');

                        if (prevXbr - prevXtl < 0.1) return;
                        if (prevYbr - prevYtl < 0.1) return;

                        for (const child of (shape as SVG.G).children()) {
                            if (child.type === 'circle') {
                                const childClientID = child.attr('data-client-id');
                                if (state.elements.find((el: any) => el.clientID === childClientID).lock || false) {
                                    continue;
                                }
                                const offsetX = (child.cx() - prevXtl) / (prevXbr - prevXtl);
                                const offsetY = (child.cy() - prevYtl) / (prevYbr - prevYtl);
                                child.center(offsetX * instance.width() + x, offsetY * instance.height() + y);
                            }
                        }

                        resizableInstance.attr('data-xtl', x);
                        resizableInstance.attr('data-ytl', y);
                        resizableInstance.attr('data-xbr', x + instance.width());
                        resizableInstance.attr('data-ybr', y + instance.height());

                        resized = true;
                        skeletonSVGTemplate = skeletonSVGTemplate ?? makeSVGFromTemplate(state.label.structure.svg);
                        setupSkeletonEdges(shape as SVG.G, skeletonSVGTemplate);
                    }
                })
                .on('resizedone', (): void => {
                    if (aborted) {
                        this.resetViewPosition(state.clientID);
                        return;
                    }

                    onResizeEnd();
                    this.resizableShape = null;

                    // be sure, that rotation in range [0; 360]
                    let rotation = shape.transform().rotation || 0;
                    while (rotation < 0) rotation += 360;
                    rotation %= 360;

                    if (resized) {
                        if (state.shapeType === 'skeleton') {
                            if (rotation) {
                                this.onEditDone(state, state.points, rotation);
                            } else {
                                const points: number[] = [];
                                state.elements.forEach((element: any) => {
                                    const elementShape = (shape as SVG.G).children()
                                        .find((child: SVG.Shape) => (
                                            child.id() === `cvat_canvas_shape_${element.clientID}`
                                        ));

                                    if (elementShape) {
                                        points.push(...this.translateFromCanvas(
                                            readPointsFromShape(elementShape),
                                        ));
                                    }
                                });
                                this.onEditDone(state, points, 0);
                            }
                        } else {
                            // these points does not take into account possible transformations, applied on the element
                            // so, if any (like rotation) we need to map them to canvas coordinate space
                            let points = readPointsFromShape(shape);
                            if (rotation) {
                                points = this.translatePointsFromRotatedShape(shape, points);
                            }
                            this.onEditDone(state, this.translateFromCanvas(points), rotation);
                        }

                        this.canvas.dispatchEvent(
                            new CustomEvent('canvas.resizeshape', {
                                bubbles: false,
                                cancelable: true,
                                detail: {
                                    state,
                                    duration: Date.now() - start,
                                },
                            }),
                        );
                    }
                }).on('resizeabort', () => {
                    onResizeEnd();
                    aborted = true;
                    this.resizableShape = null;
                    // disable internal resize events of SVG.js
                    // call chain is (mouseup -> SVG.handler.end -> SVG.handler.resize-> resizeend)
                    window.dispatchEvent(new MouseEvent('mouseup'));
                });
        } else {
            if (this.resizableShape === shape) {
                resizableInstance.fire('resizeabort');
            }

            (shape as any).off('resizestart');
            (shape as any).off('resizing');
            (shape as any).off('resizedone');
            (shape as any).off('resizeabort');
            (shape as any).resize('stop');
        }
    }

    private onShiftKeyDown = (e: KeyboardEvent): void => {
        if (!e.repeat && (e.code || '').toLowerCase().includes('shift')) {
            this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_SHIFT;
            if (this.activeElement) {
                const shape = this.svgShapes[this.activeElement.clientID];
                if (shape && shape?.remember('_selectHandler')?.options?.rotationPoint) {
                    if (this.drawnStates[this.activeElement.clientID]?.shapeType === 'skeleton') {
                        const wrappingRect = (shape as any).children().find((child: SVG.Element) => child.type === 'rect');
                        if (wrappingRect) {
                            (wrappingRect as any).resize({ snapToAngle: this.snapToAngleResize });
                        }
                    } else {
                        (shape as any).resize({ snapToAngle: this.snapToAngleResize });
                    }
                }
            }
        }
    };

    private onShiftKeyUp = (e: KeyboardEvent): void => {
        if ((e.code || '').toLowerCase().includes('shift') && this.activeElement) {
            this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_DEFAULT;
            if (this.activeElement) {
                const shape = this.svgShapes[this.activeElement.clientID];
                if (shape && shape?.remember('_selectHandler')?.options?.rotationPoint) {
                    if (this.drawnStates[this.activeElement.clientID]?.shapeType === 'skeleton') {
                        const wrappingRect = (shape as any).children().find((child: SVG.Element) => child.type === 'rect');
                        if (wrappingRect) {
                            (wrappingRect as any).resize({ snapToAngle: this.snapToAngleResize });
                        }
                    } else {
                        (shape as any).resize({ snapToAngle: this.snapToAngleResize });
                    }
                }
            }
        }
    };

    private onMouseUp = (event: MouseEvent): void => {
        if (event.button === 0 || event.button === 1) {
            this.controller.disableDrag();
        }
    };

    public constructor(model: CanvasModel & Master, controller: CanvasController) {
        this.controller = controller;
        this.geometry = controller.geometry;
        this.svgShapes = {};
        this.svgTexts = {};
        this.drawnStates = {};
        this.drawnIssueRegions = {};
        this.activeElement = {
            clientID: null,
            attributeID: null,
        };
        this.highlightedElements = {
            elementsIDs: [],
            severity: null,
        };
        this.configuration = model.configuration;
        this.mode = Mode.IDLE;
        this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_DEFAULT;
        this.innerObjectsFlags = {
            drawHidden: {},
            editHidden: {},
            sliceHidden: {},
        };

        this.isImageLoading = true;
        this.draggableShape = null;
        this.resizableShape = null;

        // Create HTML elements
        this.text = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedText = SVG.adopt((this.text as any) as HTMLElement) as SVG.Container;
        this.background = window.document.createElement('canvas');
        this.masksContent = window.document.createElement('canvas');
        this.bitmapUpdateReqId = 0;
        this.bitmap = window.document.createElement('canvas');
        // window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.grid = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.gridPath = window.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.gridPattern = window.document.createElementNS('http://www.w3.org/2000/svg', 'pattern');

        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.adoptedContent = SVG.adopt((this.content as any) as HTMLElement) as SVG.Container;

        this.attachmentBoard = window.document.createElement('div');

        this.canvas = window.document.createElement('div');

        const gridDefs: SVGDefsElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gridRect: SVGRectElement = window.document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        // Setup defs
        const contentDefs = this.adoptedContent.defs();

        this.issueRegionPattern_1 = contentDefs
            .pattern(consts.BASE_PATTERN_SIZE, consts.BASE_PATTERN_SIZE, (add): void => {
                add.line(0, 0, 0, 10).stroke('red');
            })
            .attr({
                id: 'cvat_issue_region_pattern_1',
                patternTransform: 'rotate(45)',
                patternUnits: 'userSpaceOnUse',
            });

        this.issueRegionPattern_2 = contentDefs
            .pattern(consts.BASE_PATTERN_SIZE, consts.BASE_PATTERN_SIZE, (add): void => {
                add.line(0, 0, 0, 10).stroke('yellow');
            })
            .attr({
                id: 'cvat_issue_region_pattern_2',
                patternTransform: 'rotate(45)',
                patternUnits: 'userSpaceOnUse',
            });

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
        this.masksContent.setAttribute('id', 'cvat_canvas_masks_content');
        this.content.setAttribute('id', 'cvat_canvas_content');
        this.bitmap.setAttribute('id', 'cvat_canvas_bitmap');
        this.bitmap.style.display = 'none';

        // Setup sticked div
        this.attachmentBoard.setAttribute('id', 'cvat_canvas_attachment_board');

        // Setup wrappers
        this.canvas.setAttribute('id', 'cvat_canvas_wrapper');

        // Unite created HTML elements together
        this.grid.appendChild(gridDefs);
        this.grid.appendChild(gridRect);

        gridDefs.appendChild(this.gridPattern);
        this.gridPattern.appendChild(this.gridPath);

        this.canvas.appendChild(this.text);
        this.canvas.appendChild(this.background);
        this.canvas.appendChild(this.masksContent);
        this.canvas.appendChild(this.bitmap);
        this.canvas.appendChild(this.grid);
        this.canvas.appendChild(this.content);
        this.canvas.appendChild(this.attachmentBoard);

        // Setup API handlers
        this.autoborderHandler = new AutoborderHandlerImpl(this.content);
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone,
            this.adoptedContent,
            this.adoptedText,
            this.autoborderHandler,
            this.geometry,
            this.configuration,
        );
        this.masksHandler = new MasksHandlerImpl(
            this.onDrawDone,
            this.controller.draw.bind(this.controller),
            this.onEditStart,
            this.onEditDone,
            this.drawHandler,
            this.masksContent,
        );
        this.editHandler = new EditHandlerImpl(this.onEditDone, this.adoptedContent, this.autoborderHandler);
        this.mergeHandler = new MergeHandlerImpl(
            this.onMergeDone,
            this.onFindObject,
            this.adoptedContent,
        );
        this.splitHandler = new SplitHandlerImpl(
            this.onSplitDone,
            this.onFindObject,
            this.adoptedContent,
        );
        this.objectSelector = new ObjectSelectorImpl(
            this.onFindObject,
            () => this.controller.objects,
            this.geometry,
            this.adoptedContent,
        );
        this.groupHandler = new GroupHandlerImpl(this.onSelectDone, this.objectSelector);
        this.sliceHandler = new SliceHandlerImpl(
            (clientID) => this.setupInnerFlags(clientID, 'sliceHidden', true),
            (clientID) => this.setupInnerFlags(clientID, 'sliceHidden', false),
            this.onSliceDone,
            this.onMessage,
            this.onError,
            () => this.controller.objects,
            this.geometry,
            this.adoptedContent,
            this.objectSelector,
        );
        this.regionSelector = new RegionSelectorImpl(
            this.onRegionSelected,
            this.adoptedContent,
            this.geometry,
        );
        this.zoomHandler = new ZoomHandlerImpl(this.onFocusRegion, this.adoptedContent, this.geometry);
        this.interactionHandler = new InteractionHandlerImpl(
            this.onInteraction,
            this.adoptedContent,
            this.geometry,
            this.configuration,
        );

        // Setup event handlers
        this.canvas.addEventListener('dblclick', (e: MouseEvent): void => {
            this.controller.fit();
            e.preventDefault();
        });

        this.canvas.addEventListener('mousedown', (event): void => {
            if ([0, 1].includes(event.button)) {
                if (
                    [Mode.IDLE, Mode.DRAG_CANVAS, Mode.MERGE, Mode.SPLIT]
                        .includes(this.mode) || event.button === 1 || event.altKey
                ) {
                    this.controller.enableDrag(event.clientX, event.clientY);
                }
            }
        });

        window.document.addEventListener('mouseup', this.onMouseUp);
        window.document.addEventListener('keydown', this.onShiftKeyDown);
        window.document.addEventListener('keyup', this.onShiftKeyUp);

        for (const eventName of ['wheel', 'mousedown', 'dblclick', 'contextmenu']) {
            this.attachmentBoard.addEventListener(eventName, (event) => {
                event.stopPropagation();
            });
        }

        this.canvas.addEventListener('wheel', (event): void => {
            if (event.ctrlKey) return;
            const { offset } = this.controller.geometry;
            const point = translateToSVG(this.content, [event.clientX, event.clientY]);
            this.controller.zoom(point[0] - offset, point[1] - offset, event.deltaY > 0 ? -1 : 1);
            this.canvas.dispatchEvent(
                new CustomEvent('canvas.zoom', {
                    bubbles: false,
                    cancelable: true,
                }),
            );
            event.preventDefault();
        });

        this.canvas.addEventListener('mousemove', (e): void => {
            this.controller.drag(e.clientX, e.clientY);

            if (this.mode !== Mode.IDLE) return;
            if (e.ctrlKey || e.altKey) return;

            if (!this.isImageLoading) {
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
            }
        });

        this.content.oncontextmenu = (): boolean => false;
        model.subscribe(this);
    }

    public notify(model: CanvasModel & Master, reason: UpdateReasons): void {
        this.geometry = this.controller.geometry;
        if (reason === UpdateReasons.CONFIG_UPDATED) {
            const { activeElement } = this;
            this.deactivate();
            const { configuration } = model;

            const updateShapeViews = (states: DrawnState[], parentState?: DrawnState): void => {
                for (const drawnState of states) {
                    const {
                        fill, stroke, 'fill-opacity': fillOpacity,
                    } = this.getShapeColorization(drawnState, { parentState });
                    const shapeView = window.document.getElementById(`cvat_canvas_shape_${drawnState.clientID}`);
                    const [objectState] = this.controller.objects
                        .filter((_state: any) => _state.clientID === drawnState.clientID);
                    if (shapeView) {
                        const handler = (shapeView as any).instance.remember('_selectHandler');
                        if (handler && handler.nested) {
                            handler.nested.fill({ color: fill });
                        }

                        if (drawnState.shapeType === 'mask') {
                            // if there are masks, we need to redraw them
                            this.deleteObjects([drawnState]);
                            this.addObjects([objectState]);
                            continue;
                        }

                        (shapeView as any).instance
                            .fill({ color: fill, opacity: fillOpacity })
                            .stroke({ color: stroke });
                    }

                    if (drawnState.elements) {
                        updateShapeViews(drawnState.elements, drawnState);
                    }
                }
            };

            const withUpdatingShapeViews = configuration.shapeOpacity !== this.configuration.shapeOpacity ||
                configuration.selectedShapeOpacity !== this.configuration.selectedShapeOpacity ||
                configuration.outlinedBorders !== this.configuration.outlinedBorders ||
                configuration.colorBy !== this.configuration.colorBy ||
                configuration.showConflicts !== this.configuration.showConflicts;

            if (configuration.displayAllText && !this.configuration.displayAllText) {
                for (const i in this.drawnStates) {
                    if (!(i in this.svgTexts)) {
                        this.svgTexts[i] = this.addText(this.drawnStates[i]);
                    }
                }
            } else if (configuration.displayAllText === false && this.configuration.displayAllText) {
                for (const clientID in this.drawnStates) {
                    if (+clientID !== activeElement.clientID) {
                        this.deleteText(+clientID);
                    }
                }
            }

            const recreateText = configuration.textContent !== this.configuration.textContent;
            const updateTextPosition = configuration.displayAllText !== this.configuration.displayAllText ||
                configuration.textFontSize !== this.configuration.textFontSize ||
                configuration.textPosition !== this.configuration.textPosition ||
                recreateText;

            if (configuration.smoothImage === true) {
                this.background.classList.remove('cvat_canvas_pixelized');
            } else if (configuration.smoothImage === false) {
                this.background.classList.add('cvat_canvas_pixelized');
            }

            this.configuration = configuration;
            if (withUpdatingShapeViews) {
                updateShapeViews(Object.values(this.drawnStates));
            }

            if (recreateText) {
                const states = this.controller.objects;
                for (const key of Object.keys(this.drawnStates)) {
                    const clientID = +key;
                    const [state] = states.filter((_state: any) => _state.clientID === clientID);
                    if (clientID in this.svgTexts) {
                        this.deleteText(+clientID);
                        if (state) {
                            this.addText(state);
                        }
                    }
                }
            }

            if (updateTextPosition) {
                for (const i in this.drawnStates) {
                    if (i in this.svgTexts) {
                        this.updateTextPosition(this.svgTexts[i]);
                    }
                }
            }

            if (typeof configuration.CSSImageFilter === 'string') {
                this.background.style.filter = configuration.CSSImageFilter;
            }

            this.activate(activeElement);
            this.editHandler.configurate(this.configuration);
            this.drawHandler.configurate(this.configuration);
            this.masksHandler.configurate(this.configuration);
            this.autoborderHandler.configurate(this.configuration);
            this.interactionHandler.configurate(this.configuration);
            this.sliceHandler.configurate(this.configuration);
            this.transformCanvas();

            // remove if exist and not enabled
            // this.setupObjects([]);
            // this.setupObjects(model.objects);
        } else if (reason === UpdateReasons.BITMAP) {
            const { imageBitmap } = model;
            if (imageBitmap) {
                this.bitmap.style.display = '';
                this.redrawBitmap();
            } else {
                this.bitmap.style.display = 'none';
            }
        } else if (reason === UpdateReasons.IMAGE_CHANGED) {
            const { image } = model;
            if (image) {
                this.isImageLoading = false;
                const ctx = this.background.getContext('2d');
                this.background.setAttribute('width', `${image.renderWidth}px`);
                this.background.setAttribute('height', `${image.renderHeight}px`);

                if (ctx) {
                    ctx.drawImage(image.imageData, 0, 0, image.renderWidth, image.renderHeight);
                }

                if (model.imageIsDeleted) {
                    let { width, height } = this.background;
                    if (image.imageData instanceof ImageData) {
                        width = image.imageData.width;
                        height = image.imageData.height;
                    }

                    this.background.classList.add('cvat_canvas_removed_image');
                    const canvasContext = this.background.getContext('2d');
                    const fontSize = width / 10;
                    canvasContext.font = `bold ${fontSize}px serif`;
                    canvasContext.textAlign = 'center';
                    canvasContext.lineWidth = fontSize / 20;
                    canvasContext.strokeStyle = 'white';
                    canvasContext.strokeText('IMAGE REMOVED', width / 2, height / 2);
                    canvasContext.fillStyle = 'black';
                    canvasContext.fillText('IMAGE REMOVED', width / 2, height / 2);
                } else if (this.background.classList.contains('cvat_canvas_removed_image')) {
                    this.background.classList.remove('cvat_canvas_removed_image');
                }

                this.moveCanvas();
                this.resizeCanvas();
                this.transformCanvas();
            } else {
                this.isImageLoading = true;
            }
        } else if (reason === UpdateReasons.FITTED_CANVAS) {
            // Canvas geometry is going to be changed. Old object positions aren't valid any more
            this.setupObjects([]);
            this.setupIssueRegions({});
            this.moveCanvas();
            this.resizeCanvas();
            this.canvas.dispatchEvent(
                new CustomEvent('canvas.reshape', {
                    bubbles: false,
                    cancelable: true,
                }),
            );
        } else if ([UpdateReasons.IMAGE_ZOOMED, UpdateReasons.IMAGE_FITTED].includes(reason)) {
            if (reason === UpdateReasons.IMAGE_FITTED) {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.fit', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            }

            this.moveCanvas();
            this.transformCanvas();
        } else if (reason === UpdateReasons.IMAGE_ROTATED) {
            this.transformCanvas();
        } else if (reason === UpdateReasons.IMAGE_MOVED) {
            this.moveCanvas();
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            this.objectSelector.resetSelected();
            this.setupObjects(this.controller.objects);
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.repeatSelection();
            }
            const event: CustomEvent = new CustomEvent('canvas.setup');
            this.canvas.dispatchEvent(event);
        } else if (reason === UpdateReasons.ISSUE_REGIONS_UPDATED) {
            this.setupIssueRegions(this.controller.issueRegions);
        } else if (reason === UpdateReasons.GRID_UPDATED) {
            const size: Size = this.geometry.grid;
            this.gridPattern.setAttribute('width', `${size.width}`);
            this.gridPattern.setAttribute('height', `${size.height}`);
        } else if (reason === UpdateReasons.SHAPE_FOCUSED) {
            const { padding, clientID } = this.controller.focusData;
            const drawnState = this.drawnStates[clientID];
            const object = this.svgShapes[clientID];
            if (drawnState && object) {
                const { offset } = this.geometry;
                let [x, y, width, height] = [0, 0, 0, 0];

                if (drawnState.shapeType === 'mask') {
                    const [xtl, ytl, xbr, ybr] = drawnState.points.slice(-4);
                    x = xtl + offset;
                    y = ytl + offset;
                    width = xbr - xtl + 1;
                    height = ybr - ytl + 1;
                } else {
                    const bbox: SVG.BBox = object.bbox();
                    ({
                        x, y, width, height,
                    } = bbox);
                }

                this.onFocusRegion(x - padding, y - padding, width + padding * 2, height + padding * 2);
            }
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            this.activate(this.controller.activeElement);
        } else if (reason === UpdateReasons.SHAPE_HIGHLIGHTED) {
            this.highlight(this.controller.highlightedElements);
        } else if (reason === UpdateReasons.SELECT_REGION) {
            if (this.mode === Mode.SELECT_REGION) {
                this.regionSelector.select(true);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.regionSelector.select(false);
                this.canvas.style.cursor = '';
            }
        } else if (reason === UpdateReasons.DRAG_CANVAS) {
            if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.dragstart', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.dragstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
                this.canvas.style.cursor = '';
            }
        } else if (reason === UpdateReasons.ZOOM_CANVAS) {
            if (this.mode === Mode.ZOOM_CANVAS) {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.zoomstart', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
                this.canvas.style.cursor = 'zoom-in';
                this.zoomHandler.zoom();
            } else {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.zoomstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
                this.canvas.style.cursor = '';
                this.zoomHandler.cancel();
            }
        } else if (reason === UpdateReasons.DRAW) {
            const data: DrawData = this.controller.drawData;
            if (data.enabled && [Mode.IDLE, Mode.DRAW].includes(this.mode)) {
                if (data.shapeType !== 'mask') {
                    this.drawHandler.draw(data, this.geometry);
                } else {
                    this.masksHandler.draw(data);
                }

                if (this.mode === Mode.IDLE) {
                    this.canvas.style.cursor = 'crosshair';
                    this.mode = Mode.DRAW;
                    this.canvas.dispatchEvent(
                        new CustomEvent('canvas.drawstart', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                drawData: data,
                            },
                        }),
                    );

                    if (typeof data.redraw === 'number') {
                        this.setupInnerFlags(data.redraw, 'drawHidden', true);
                    }
                }
            } else if (this.mode !== Mode.IDLE) {
                this.canvas.style.cursor = '';
                this.mode = Mode.IDLE;
                if (this.masksHandler.enabled) {
                    this.masksHandler.draw(data);
                } else {
                    this.drawHandler.draw(data, this.geometry);
                }
            }
        } else if (reason === UpdateReasons.EDIT) {
            const data = this.controller.editData;
            if (data.enabled && data.state.shapeType === 'mask') {
                this.masksHandler.edit(data);
            } else if (this.masksHandler.enabled) {
                this.masksHandler.edit(data);
            } else if (this.editHandler.enabled && this.editHandler.shapeType === 'polyline') {
                this.editHandler.edit(data);
            }
        } else if (reason === UpdateReasons.INTERACT) {
            const data: InteractionData = this.controller.interactionData;
            if (data.enabled && (this.mode === Mode.IDLE || data.intermediateShape)) {
                if (!data.intermediateShape) {
                    this.canvas.style.cursor = 'crosshair';
                    this.mode = Mode.INTERACT;
                }
                this.interactionHandler.interact(data);
            } else {
                if (!data.enabled) {
                    this.canvas.style.cursor = '';
                }
                if (this.mode !== Mode.IDLE) {
                    this.interactionHandler.interact(data);
                }
            }
        } else if (reason === UpdateReasons.MERGE) {
            const data: MergeData = this.controller.mergeData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.MERGE;
            }
            this.mergeHandler.merge(data);
        } else if (reason === UpdateReasons.SPLIT) {
            const data: SplitData = this.controller.splitData;
            if (data.enabled) {
                this.canvas.style.cursor = 'copy';
                this.mode = Mode.SPLIT;
                this.splitHandler.split(data);
            }
        } else if ([UpdateReasons.JOIN, UpdateReasons.GROUP].includes(reason)) {
            let data: GroupData | JoinData = null;
            if (reason === UpdateReasons.GROUP) {
                data = this.controller.groupData;
                this.mode = Mode.GROUP;
                this.groupHandler.group(data, {});
            } else {
                data = this.controller.joinData;
                this.mode = Mode.JOIN;

                this.onMessage([{
                    type: 'text',
                    icon: 'info',
                    content: 'Click masks you would like to join together. To unselect click selected mask one more time',
                }], 'join');

                this.groupHandler.group(data, {
                    shapeType: ['mask'],
                    objectType: ['shape'],
                });
            }
        } else if (reason === UpdateReasons.SLICE) {
            const data = this.controller.sliceData;
            if (data.enabled && this.mode === Mode.IDLE) {
                this.mode = Mode.SLICE;
                this.sliceHandler.slice(data);
            }
        } else if (reason === UpdateReasons.SELECT) {
            this.objectSelector.push(this.controller.selected);
            if (this.mode === Mode.MERGE) {
                this.mergeHandler.select(this.controller.selected);
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.select(this.controller.selected);
            }
        } else if (reason === UpdateReasons.CANCEL) {
            if (this.mode === Mode.DRAW) {
                if (this.masksHandler.enabled) {
                    this.masksHandler.cancel();
                } else {
                    this.drawHandler.cancel();
                }
            } else if (this.mode === Mode.INTERACT) {
                this.interactionHandler.cancel();
            } else if (this.mode === Mode.MERGE) {
                this.mergeHandler.cancel();
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.cancel();
            } else if (this.mode === Mode.GROUP || this.mode === Mode.JOIN) {
                this.groupHandler.cancel();
            } else if (this.mode === Mode.SLICE) {
                this.sliceHandler.cancel();
            } else if (this.mode === Mode.SELECT_REGION) {
                this.regionSelector.cancel();
            } else if (this.mode === Mode.EDIT) {
                if (this.masksHandler.enabled) {
                    this.masksHandler.cancel();
                } else {
                    this.editHandler.cancel();
                }
            } else if (this.mode === Mode.DRAG_CANVAS) {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.dragstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            } else if (this.mode === Mode.ZOOM_CANVAS) {
                this.zoomHandler.cancel();
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.zoomstop', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            }
            this.canvas.style.cursor = '';
            this.dispatchCanceledEvent();
        } else if (reason === UpdateReasons.DATA_FAILED) {
            this.onError(model.exception, 'data fetching');
        } else if (reason === UpdateReasons.DESTROY) {
            this.canvas.dispatchEvent(
                new CustomEvent('canvas.destroy', {
                    bubbles: false,
                    cancelable: true,
                }),
            );

            window.document.removeEventListener('keydown', this.onShiftKeyDown);
            window.document.removeEventListener('keyup', this.onShiftKeyUp);
            window.document.removeEventListener('mouseup', this.onMouseUp);
            this.interactionHandler.destroy();
        }

        if (model.imageBitmap && [UpdateReasons.OBJECTS_UPDATED].includes(reason)) {
            this.redrawBitmap();
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    public setupConflictRegions(state: any): number[] {
        let cx = 0;
        let cy = 0;
        const shape = this.svgShapes[state.clientID];
        if (!shape) return [];
        const box = (shape.node as any).getBBox();
        cx = box.x + (box.width) / 2;
        cy = box.y;
        return [cx, cy];
    }

    private redrawBitmap(): void {
        this.bitmapUpdateReqId++;
        const { bitmapUpdateReqId } = this;
        const width = +this.background.style.width.slice(0, -2);
        const height = +this.background.style.height.slice(0, -2);
        this.bitmap.setAttribute('width', `${width}px`);
        this.bitmap.setAttribute('height', `${height}px`);
        const states = this.controller.objects;

        const ctx = this.bitmap.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);
            for (const state of states) {
                if (state.hidden || state.outside) continue;
                ctx.fillStyle = 'white';
                if (['rectangle', 'polygon', 'cuboid'].includes(state.shapeType)) {
                    let points = [...state.points];
                    if (state.shapeType === 'rectangle') {
                        points = rotate2DPoints(
                            points[0] + (points[2] - points[0]) / 2,
                            points[1] + (points[3] - points[1]) / 2,
                            state.rotation,
                            [
                                points[0], // xtl
                                points[1], // ytl
                                points[2], // xbr
                                points[1], // ytl
                                points[2], // xbr
                                points[3], // ybr
                                points[0], // xtl
                                points[3], // ybr
                            ],
                        );
                    } else if (state.shapeType === 'cuboid') {
                        points = [
                            points[0],
                            points[1],
                            points[4],
                            points[5],
                            points[8],
                            points[9],
                            points[12],
                            points[13],
                        ];
                    }
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);
                    for (let i = 0; i < points.length; i += 2) {
                        ctx.lineTo(points[i], points[i + 1]);
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                if (state.shapeType === 'ellipse') {
                    const [cx, cy, rightX, topY] = state.points;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rightX - cx, cy - topY, (state.rotation * Math.PI) / 180.0, 0, 2 * Math.PI);
                    ctx.closePath();
                    ctx.fill();
                }

                if (state.shapeType === 'mask') {
                    const { points } = state;
                    const [left, top, right, bottom] = points.slice(-4);
                    const imageBitmap = expandChannels(255, 255, 255, points);
                    imageDataToDataURL(imageBitmap, right - left + 1, bottom - top + 1, (dataURL: string) => new
                    Promise((resolve) => {
                        if (bitmapUpdateReqId === this.bitmapUpdateReqId) {
                            const img = document.createElement('img');
                            img.addEventListener('load', () => {
                                ctx.drawImage(img, left, top);
                                URL.revokeObjectURL(dataURL);
                                resolve();
                            });
                            img.src = dataURL;
                        }
                    }));
                }

                if (state.shapeType === 'cuboid') {
                    for (let i = 0; i < 5; i++) {
                        const points = [
                            state.points[(0 + i * 4) % 16],
                            state.points[(1 + i * 4) % 16],
                            state.points[(2 + i * 4) % 16],
                            state.points[(3 + i * 4) % 16],
                            state.points[(6 + i * 4) % 16],
                            state.points[(7 + i * 4) % 16],
                            state.points[(4 + i * 4) % 16],
                            state.points[(5 + i * 4) % 16],
                        ];
                        ctx.beginPath();
                        ctx.moveTo(points[0], points[1]);
                        for (let j = 0; j < points.length; j += 2) {
                            ctx.lineTo(points[j], points[j + 1]);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        }
    }

    private saveState(state: any): DrawnState {
        const result = {
            clientID: state.clientID,
            outside: state.outside,
            occluded: state.occluded,
            source: state.source,
            hidden: state.hidden,
            lock: state.lock,
            shapeType: state.shapeType,
            points: [...state.points],
            rotation: state.rotation,
            attributes: { ...state.attributes },
            descriptions: [...state.descriptions],
            zOrder: state.zOrder,
            pinned: state.pinned,
            updated: state.updated,
            frame: state.frame,
            label: state.label,
            group: { id: state.group.id, color: state.group.color },
            color: state.color,
            elements: state.shapeType === 'skeleton' ?
                state.elements.map((element: any) => this.saveState(element)) : null,
        };

        return result;
    }

    private getShapeColorization(state: any, opts: {
        parentState?: any,
    } = {}): { fill: string; stroke: string, 'fill-opacity': number } {
        const { shapeType } = state;
        const parentShapeType = opts.parentState?.shapeType;
        const { configuration } = this;
        const { colorBy, shapeOpacity, outlinedBorders } = configuration;
        let shapeColor = '';

        if (colorBy === ColorBy.INSTANCE) {
            shapeColor = state.color;
        } else if (colorBy === ColorBy.GROUP) {
            shapeColor = state.group.color;
        } else if (colorBy === ColorBy.LABEL) {
            shapeColor = state.label.color;
        }
        if (this.highlightedElements.elementsIDs.length) {
            if (this.highlightedElements.elementsIDs.includes(state.clientID)) {
                if (this.highlightedElements.severity === HighlightSeverity.ERROR) {
                    shapeColor = consts.CONFLICT_COLOR;
                } else if (this.highlightedElements.severity === HighlightSeverity.WARNING) {
                    shapeColor = consts.WARNING_COLOR;
                }
            } else {
                shapeColor = consts.SHADED_COLOR;
            }
        }
        const outlinedColor = parentShapeType === 'skeleton' ? 'black' : outlinedBorders || shapeColor;

        return {
            fill: shapeColor,
            stroke: outlinedColor,
            'fill-opacity': !['polyline', 'points', 'skeleton'].includes(shapeType) || parentShapeType === 'skeleton' ? shapeOpacity : 0,
        };
    }

    private getHighlightClassname(): string {
        const { severity } = this.highlightedElements;
        if (severity === HighlightSeverity.ERROR) {
            return 'cvat_canvas_conflicted';
        }
        if (severity === HighlightSeverity.WARNING) {
            return 'cvat_canvas_warned';
        }
        return '';
    }

    private updateObjects(states: any[]): void {
        for (const state of states) {
            const { clientID } = state;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[state.clientID];
            const text = this.svgTexts[state.clientID];
            const isInvisible = state.hidden || state.outside || this.isInnerHidden(state.clientID);

            if (drawnState.hidden !== state.hidden || drawnState.outside !== state.outside) {
                if (isInvisible) {
                    (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape).addClass(
                        'cvat_canvas_hidden',
                    );
                    if (text) {
                        text.addClass('cvat_canvas_hidden');
                    }
                } else {
                    (state.shapeType === 'points' ? shape.remember('_selectHandler').nested : shape).removeClass(
                        'cvat_canvas_hidden',
                    );
                    if (text) {
                        text.removeClass('cvat_canvas_hidden');
                        this.updateTextPosition(text);
                    }
                }
            }

            if (drawnState.zOrder !== state.zOrder) {
                if (state.shapeType === 'points') {
                    shape.remember('_selectHandler').nested.attr('data-z-order', state.zOrder);
                } else {
                    shape.attr('data-z-order', state.zOrder);
                }
            }

            if (drawnState.occluded !== state.occluded) {
                const instance = state.shapeType === 'points' ? this.svgShapes[clientID].remember('_selectHandler').nested : shape;
                if (state.occluded) {
                    instance.addClass('cvat_canvas_shape_occluded');
                } else {
                    instance.removeClass('cvat_canvas_shape_occluded');
                }
            }

            if (drawnState.pinned !== state.pinned && this.activeElement.clientID !== null) {
                const activeElement = { ...this.activeElement };
                this.deactivate();
                this.activate(activeElement);
            }

            if (drawnState.rotation) {
                // need to rotate it back before changing points
                shape.untransform();
            }

            if (
                state.points.length !== drawnState.points.length ||
                state.points.some((p: number, id: number): boolean => p !== drawnState.points[id])
            ) {
                if (state.shapeType === 'mask') {
                    // if masks points were updated, draw from scratch
                    this.deleteObjects([this.drawnStates[+clientID]]);
                    this.addObjects([state]);
                    continue;
                }

                const translatedPoints: number[] = this.translateToCanvas(state.points);

                if (state.shapeType === 'rectangle') {
                    const [xtl, ytl, xbr, ybr] = translatedPoints;

                    shape.attr({
                        x: xtl,
                        y: ytl,
                        width: xbr - xtl,
                        height: ybr - ytl,
                    });
                } else if (state.shapeType === 'ellipse') {
                    const [cx, cy] = translatedPoints;
                    const [rx, ry] = [translatedPoints[2] - cx, cy - translatedPoints[3]];
                    shape.attr({
                        cx, cy, rx, ry,
                    });
                } else {
                    const stringified = stringifyPoints(translatedPoints);
                    if (state.shapeType !== 'cuboid') {
                        (shape as any).clear();
                    }
                    shape.attr('points', stringified);

                    if (state.shapeType === 'points' && !isInvisible) {
                        this.selectize(false, shape);
                        this.setupPoints(shape as SVG.PolyLine, state);
                    }
                }
            }

            if (state.rotation) {
                // now, when points changed, need to rotate it to new angle
                shape.rotate(state.rotation);
            }

            const stateDescriptions = state.descriptions;
            const drawnStateDescriptions = drawnState.descriptions;

            if (
                drawnState.label.id !== state.label.id ||
                drawnStateDescriptions.length !== stateDescriptions.length ||
                drawnStateDescriptions.some((desc: string, id: number): boolean => desc !== stateDescriptions[id])
            ) {
                // remove created text and create it again
                if (text) {
                    text.remove();
                    this.addText(state);
                }
            } else {
                const attrNames = Object.fromEntries(state.label.attributes.map((attr) => [attr.id, attr.name]));
                // check if there are updates in attributes
                for (const attrID of Object.keys(state.attributes)) {
                    if (state.attributes[attrID] !== drawnState.attributes[+attrID]) {
                        if (text) {
                            const [span] = text.node.querySelectorAll<SVGTSpanElement>(`[attrID="${attrID}"]`);
                            if (span && span.textContent) {
                                span.textContent = `${attrNames[attrID]}: ${state.attributes[attrID]}`;
                            }
                        }
                    }
                }
            }

            if (
                drawnState.label.id !== state.label.id ||
                drawnState.group.id !== state.group.id ||
                drawnState.group.color !== state.group.color ||
                drawnState.color !== state.color
            ) {
                // update shape color if necessary
                if (shape) {
                    if (state.shapeType === 'mask') {
                        // if masks points were updated, draw from scratch
                        this.deleteObjects([this.drawnStates[+clientID]]);
                        this.addObjects([state]);
                        continue;
                    } else if (state.shapeType === 'points') {
                        const colorization = { ...this.getShapeColorization(state) };
                        shape.remember('_selectHandler').nested.attr(colorization);
                        shape.attr(colorization);
                    } else {
                        shape.attr({ ...this.getShapeColorization(state) });
                    }
                }
            }

            this.drawnStates[state.clientID] = this.saveState(state);
        }
    }

    private deleteObjects(states: any[]): void {
        for (const state of states) {
            if (state.clientID in this.svgTexts) {
                this.deleteText(state.clientID);
            }

            if (state.shapeType === 'skeleton') {
                this.deleteObjects(state.elements);
            }

            if (state.clientID in this.svgShapes) {
                this.svgShapes[state.clientID].fire('remove');
                this.svgShapes[state.clientID].off('click');
                this.svgShapes[state.clientID].off('remove');
                this.svgShapes[state.clientID].remove();
                delete this.svgShapes[state.clientID];
            }

            if (state.clientID in this.drawnStates) {
                delete this.drawnStates[state.clientID];
            }
        }
    }

    private addObjects(states: any[]): void {
        const { displayAllText } = this.configuration;
        for (const state of states) {
            const points: number[] = state.points as number[];

            // TODO: Use enums after typification cvat-core
            if (state.shapeType === 'mask') {
                this.svgShapes[state.clientID] = this.addMask(points, state);
            } else if (state.shapeType === 'skeleton') {
                this.svgShapes[state.clientID] = this.addSkeleton(state);
            } else {
                const translatedPoints: number[] = this.translateToCanvas(points);
                if (state.shapeType === 'rectangle') {
                    this.svgShapes[state.clientID] = this.addRect(translatedPoints, state);
                } else {
                    const stringified = stringifyPoints(translatedPoints);

                    if (state.shapeType === 'polygon') {
                        this.svgShapes[state.clientID] = this.addPolygon(stringified, state);
                    } else if (state.shapeType === 'polyline') {
                        this.svgShapes[state.clientID] = this.addPolyline(stringified, state);
                    } else if (state.shapeType === 'points') {
                        this.svgShapes[state.clientID] = this.addPoints(stringified, state);
                    } else if (state.shapeType === 'ellipse') {
                        this.svgShapes[state.clientID] = this.addEllipse(stringified, state);
                    } else if (state.shapeType === 'cuboid') {
                        this.svgShapes[state.clientID] = this.addCuboid(stringified, state);
                    } else {
                        continue;
                    }
                }
            }

            this.svgShapes[state.clientID].on('click.canvas', (): void => {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.clicked', {
                        bubbles: false,
                        cancelable: true,
                        detail: {
                            state,
                        },
                    }),
                );
            });

            if (displayAllText) {
                this.addText(state);
                this.updateTextPosition(this.svgTexts[state.clientID]);
            }

            this.drawnStates[state.clientID] = this.saveState(state);
        }
    }

    private sortObjects(): void {
        // TODO: Can be significantly optimized
        const states = Array.from(this.content.getElementsByClassName('cvat_canvas_shape')).map((state: SVGElement): [
            SVGElement,
            number,
        ] => [state, +state.getAttribute('data-z-order')]);

        const crosshair = Array.from(this.content.getElementsByClassName('cvat_canvas_crosshair'));
        crosshair.forEach((line: SVGLineElement): void => this.content.append(line));
        const interaction = Array.from(this.content.getElementsByClassName('cvat_interaction_point'));
        interaction.forEach((circle: SVGCircleElement): void => this.content.append(circle));

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
                const [span] = (text.node.querySelectorAll(`[attrID="${attributeID}"]`) as any) as SVGTSpanElement[];
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
        if (this.activeElement.clientID) {
            const { displayAllText } = this.configuration;
            const { clientID } = this.activeElement;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[clientID];

            if (drawnState.shapeType === 'points') {
                this.svgShapes[clientID]
                    .remember('_selectHandler').nested
                    .removeClass('cvat_canvas_shape_activated');
            } else {
                shape.removeClass('cvat_canvas_shape_activated');
            }

            if (drawnState.shapeType === 'mask') {
                shape.attr('opacity', `${Math.sqrt(this.configuration.shapeOpacity)}`);
            } else {
                shape.attr('fill-opacity', `${this.configuration.shapeOpacity}`);
            }

            if (!drawnState.pinned) {
                // as resizable for skeletons uses "draggable" inside, it is important first to disable draggable
                this.draggable(null, shape);
            }

            if (drawnState.shapeType !== 'mask') {
                this.resizable(null, shape);
            } else {
                (shape as any).off('dblclick');
            }

            if (drawnState.shapeType !== 'points') {
                this.selectize(false, shape);
            }

            if (drawnState.shapeType === 'cuboid') {
                (shape as any).attr('projections', false);
            }

            // TODO: Hide text only if it is hidden by settings
            const text = this.svgTexts[clientID];
            if (text && !displayAllText) {
                this.deleteText(clientID);
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
            const [span] = (text.node.querySelectorAll(`[attrID="${attributeID}"]`) as any) as SVGTSpanElement[];
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
        const [state] = this.controller.objects.filter((_state: any): boolean => _state.clientID === clientID);
        if (state && state.shapeType === 'points') {
            this.svgShapes[clientID]
                .remember('_selectHandler')
                .nested.style('pointer-events', this.stateIsLocked(state) ? 'none' : '');
        }

        if (!state || state.hidden || state.outside) {
            return;
        }

        const shape = this.svgShapes[clientID];
        if (!this.svgTexts[clientID]) {
            this.addText(state);
        }
        this.updateTextPosition(this.svgTexts[clientID]);

        if (this.stateIsLocked(state)) {
            return;
        }

        if (state.shapeType === 'points') {
            this.svgShapes[clientID]
                .remember('_selectHandler').nested
                .addClass('cvat_canvas_shape_activated');
        } else {
            shape.addClass('cvat_canvas_shape_activated');
        }

        if (state.shapeType === 'mask') {
            shape.attr('opacity', `${Math.sqrt(this.configuration.selectedShapeOpacity)}`);
        } else {
            shape.attr('fill-opacity', `${this.configuration.selectedShapeOpacity}`);
        }

        if (state.shapeType === 'points') {
            this.content.append(this.svgShapes[clientID].remember('_selectHandler').nested.node);
        } else {
            this.content.append(shape.node);
        }

        const { showProjections } = this.configuration;
        if (state.shapeType === 'cuboid' && showProjections) {
            (shape as any).attr('projections', true);
        }

        if (state.shapeType !== 'points') {
            this.selectize(true, shape);
        }

        const textList = [
            state.clientID, ...state.elements.map((element: any): number => element.clientID),
        ].map((id: number) => this.svgTexts[id]).filter((text: SVG.Text | undefined) => (
            typeof text !== 'undefined'
        ));

        const hideText = (): void => {
            textList.forEach((text: SVG.Text) => {
                text.addClass('cvat_canvas_hidden');
            });
        };

        const showText = (): void => {
            textList.forEach((text: SVG.Text) => {
                text.removeClass('cvat_canvas_hidden');
                this.updateTextPosition(text);
            });
        };

        if (state.shapeType !== 'mask') {
            const showDirection = (): void => {
                if (['polygon', 'polyline'].includes(state.shapeType)) {
                    this.showDirection(state, shape as SVG.Polygon | SVG.PolyLine);
                }
            };

            const hideDirection = (): void => {
                if (['polygon', 'polyline'].includes(state.shapeType)) {
                    this.hideDirection(shape as SVG.Polygon | SVG.PolyLine);
                }
            };

            let shapeSizeElement: ShapeSizeElement | null = null;
            this.resizable(state, shape, () => {
                this.mode = Mode.RESIZE;
                hideDirection();
                hideText();
                if (state.shapeType === 'rectangle' || state.shapeType === 'ellipse') {
                    shapeSizeElement = displayShapeSize(this.adoptedContent, this.adoptedText);
                }
            }, () => {
                if (shapeSizeElement) {
                    shapeSizeElement.update(shape);
                }
            }, () => {
                this.mode = Mode.IDLE;
                if (shapeSizeElement) {
                    shapeSizeElement.rm();
                    shapeSizeElement = null;
                }

                showDirection();
                showText();
            });

            showDirection();
        } else {
            (shape as any).on('dblclick', (e: MouseEvent) => {
                if (e.shiftKey) {
                    this.controller.edit({ enabled: true, state });
                    e.stopPropagation();
                }
            });
        }

        if (!state.pinned) {
            this.draggable(state, shape, () => {
                this.mode = Mode.DRAG;
                hideText();
            }, () => {}, () => {
                this.mode = Mode.IDLE;
                showText();
            });
        }

        this.canvas.dispatchEvent(
            new CustomEvent('canvas.activated', {
                bubbles: false,
                cancelable: true,
                detail: {
                    state,
                },
            }),
        );
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
            this.activeElement = {
                ...this.activeElement,
                clientID,
            };
        }

        if (clientID !== null && attributeID !== null && this.activeElement.attributeID !== attributeID) {
            this.activateAttribute(clientID, attributeID);
        }
    }

    private highlight(highlightedElements: HighlightedElements): void {
        this.highlightedElements.elementsIDs.forEach((clientID) => {
            const shapeView = window.document.getElementById(`cvat_canvas_shape_${clientID}`);
            if (shapeView) shapeView.classList.remove(this.getHighlightClassname());
        });
        const redrawMasks = (highlightedElements.elementsIDs.length !== 0 ||
            this.highlightedElements.elementsIDs.length !== 0);

        if (highlightedElements.elementsIDs.length) {
            this.highlightedElements = { ...highlightedElements };
            this.canvas.classList.add('cvat-canvas-highlight-enabled');
            this.highlightedElements.elementsIDs.forEach((clientID) => {
                const shapeView = window.document.getElementById(`cvat_canvas_shape_${clientID}`);
                if (shapeView) shapeView.classList.add(this.getHighlightClassname());
            });
        } else {
            this.highlightedElements = {
                elementsIDs: [],
                severity: null,
            };
            this.canvas.classList.remove('cvat-canvas-highlight-enabled');
        }
        if (redrawMasks) {
            const masks = Object.values(this.drawnStates).filter((state) => state.shapeType === 'mask');
            this.deleteObjects(masks);
            this.addObjects(masks);
        }
        if (this.highlightedElements.elementsIDs.length) {
            this.deactivate();
            const clientID = this.highlightedElements.elementsIDs[0];
            this.activate({ clientID, attributeID: null });
        }
    }

    // Update text position after corresponding box has been moved, resized, etc.
    private updateTextPosition(
        text: SVG.Text,
        options: { rotation?: { angle: number, cx: number, cy: number } } = {},
    ): void {
        const clientID = text.attr('data-client-id');
        if (!Number.isInteger(clientID)) return;
        const shape = this.svgShapes[clientID];
        if (!shape) return;

        if (text.node.style.display === 'none') return; // wrong transformation matrix
        const { textFontSize } = this.configuration;
        let { textPosition } = this.configuration;
        if (shape.type === 'circle') {
            // force auto for skeleton elements
            textPosition = 'auto';
        }

        text.untransform();
        text.style({ 'font-size': `${textFontSize}px` });
        const rotation = options.rotation?.angle || shape.transform().rotation;

        // Find the best place for a text
        let [clientX, clientY, clientCX, clientCY]: number[] = [0, 0, 0, 0];
        if (textPosition === 'center') {
            let cx = 0;
            let cy = 0;
            if (['rect', 'image'].includes(shape.type)) {
                // for rectangle/mask finding a center is simple
                cx = +shape.attr('x') + +shape.attr('width') / 2;
                cy = +shape.attr('y') + +shape.attr('height') / 2;
            } else if (shape.type === 'g') {
                ({ cx, cy } = shape.bbox());
            } else if (shape.type === 'ellipse') {
                // even simpler for ellipses
                cx = +shape.attr('cx');
                cy = +shape.attr('cy');
            } else {
                // for polyshapes we use special algorithm
                const points = parsePoints(pointsToNumberArray(shape.attr('points')));
                [cx, cy] = polylabel([points.map((point) => [point.x, point.y])]);
            }

            [clientX, clientY] = translateFromSVG(this.content, [cx, cy]);
            // center is exactly clientX, clientY
            clientCX = clientX;
            clientCY = clientY;
        } else {
            let box = (shape.node as any).getBBox();

            // Translate the whole box to the client coordinate system
            const [x1, y1, x2, y2]: number[] = translateFromSVG(this.content, [
                box.x,
                box.y,
                box.x + box.width,
                box.y + box.height,
            ]);

            clientCX = x1 + (x2 - x1) / 2;
            clientCY = y1 + (y2 - y1) / 2;

            box = {
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.max(x1, x2) - Math.min(x1, x2),
                height: Math.max(y1, y2) - Math.min(y1, y2),
            };

            // first try to put to the top right corner
            [clientX, clientY] = [box.x + box.width, box.y];
            if (
                clientX + ((text.node as any) as SVGTextElement)
                    .getBBox().width + consts.TEXT_MARGIN > this.canvas.offsetWidth
            ) {
                // if out of visible area, try to put text to top left corner
                [clientX, clientY] = [box.x, box.y];
            }
        }

        // Translate found coordinates to text SVG
        const [x, y, rotX, rotY]: number[] = translateToSVG(this.text, [
            clientX + (textPosition === 'auto' ? consts.TEXT_MARGIN : 0),
            clientY + (textPosition === 'auto' ? consts.TEXT_MARGIN : 0),
            options.rotation?.cx || clientCX,
            options.rotation?.cy || clientCY,
        ]);

        const textBBox = ((text.node as any) as SVGTextElement).getBBox();
        // Finally draw a text
        if (textPosition === 'center') {
            text.move(x - textBBox.width / 2, y - textBBox.height / 2);
        } else {
            text.move(x, y);
        }

        let childOptions = {};
        if (rotation) {
            text.rotate(rotation, rotX, rotY);
            childOptions = {
                rotation: {
                    angle: rotation,
                    cx: clientCX,
                    cy: clientCY,
                },
            };
        }

        if (clientID in this.drawnStates && this.drawnStates[clientID].shapeType === 'skeleton') {
            this.drawnStates[clientID].elements.forEach((element: DrawnState) => {
                if (element.clientID in this.svgTexts) {
                    this.updateTextPosition(this.svgTexts[element.clientID], childOptions);
                }
            });
        }

        function applyParentX(parentText: SVGTSpanElement | SVGTextElement): void {
            for (let i = 0; i < parentText.children.length; i++) {
                if (i === 0) {
                    // do not align the first child
                    continue;
                }

                const tspan = parentText.children[i];
                tspan.setAttribute('x', parentText.getAttribute('x'));
                applyParentX(tspan as SVGTSpanElement);
            }
        }

        applyParentX(text.node as any as SVGTextElement);
    }

    private deleteText(clientID: number): void {
        if (clientID in this.svgTexts) {
            this.svgTexts[clientID].remove();
            delete this.svgTexts[clientID];
        }

        if (clientID in this.drawnStates && this.drawnStates[clientID].shapeType === 'skeleton') {
            this.drawnStates[clientID].elements.forEach((element) => {
                this.deleteText(element.clientID);
            });
        }
    }

    private addText(state: any, options: { textContent?: string } = {}): SVG.Text {
        const { undefinedAttrValue } = this.configuration;
        const content = options.textContent || this.configuration.textContent;
        const withID = content.includes('id');
        const withAttr = content.includes('attributes');
        const withLabel = content.includes('label');
        const withSource = content.includes('source');
        const withDescriptions = content.includes('descriptions');
        const textFontSize = this.configuration.textFontSize || 12;
        const {
            label, clientID, attributes, source, descriptions,
        } = state;

        const attrNames = Object.fromEntries(state.label.attributes.map((attr) => [attr.id, attr.name]));
        if (state.shapeType === 'skeleton') {
            state.elements.forEach((element: any) => {
                if (!(element.clientID in this.svgTexts)) {
                    this.svgTexts[element.clientID] = this.addText(element, {
                        textContent: [
                            ...(withLabel ? ['label'] : []),
                            ...(withAttr ? ['attributes'] : []),
                        ].join(',') || ' ',
                    });
                }
            });
        }

        this.svgTexts[state.clientID] = this.adoptedText
            .text((block): void => {
                block.tspan(`${withLabel ? label.name : ''} ` +
                `${withID ? clientID : ''} ` +
                `${withSource ? `(${source})` : ''}`).style({
                    'text-transform': 'uppercase',
                });
                if (withDescriptions) {
                    for (const desc of descriptions) {
                        block
                            .tspan(`${desc}`)
                            .attr({
                                dy: '1em',
                                x: 0,
                            })
                            .addClass('cvat_canvas_text_description');
                    }
                }
                if (withAttr) {
                    for (const attrID of Object.keys(attributes)) {
                        const values = `${attributes[attrID] === undefinedAttrValue ? '' : attributes[attrID]}`.split('\n');
                        const parent = block.tspan(`${attrNames[attrID]}: `)
                            .attr({ attrID, dy: '1em', x: 0 }).addClass('cvat_canvas_text_attribute');
                        values.forEach((attrLine: string, index: number) => {
                            parent
                                .tspan(attrLine)
                                .attr({
                                    dy: index === 0 ? 0 : '1em',
                                });
                        });
                    }
                }
            })
            .move(0, 0)
            .attr({ 'data-client-id': state.clientID })
            .style({ 'font-size': textFontSize })
            .addClass('cvat_canvas_text');

        return this.svgTexts[state.clientID];
    }

    private addRect(points: number[], state: any): SVG.Rect {
        const [xtl, ytl, xbr, ybr] = points;
        const rect = this.adoptedContent
            .rect()
            .size(xbr - xtl, ybr - ytl)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                ...this.getShapeColorization(state),
            }).move(xtl, ytl).addClass('cvat_canvas_shape');

        if (state.rotation) {
            rect.rotate(state.rotation);
        }

        if (state.occluded) {
            rect.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            rect.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            rect.addClass('cvat_canvas_ground_truth');
        }

        return rect;
    }

    private addPolygon(points: string, state: any): SVG.Polygon {
        const polygon = this.adoptedContent
            .polygon(points)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                ...this.getShapeColorization(state),
            }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polygon.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            polygon.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            polygon.addClass('cvat_canvas_ground_truth');
        }

        return polygon;
    }

    private addPolyline(points: string, state: any): SVG.PolyLine {
        const polyline = this.adoptedContent
            .polyline(points)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                ...this.getShapeColorization(state),
            }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            polyline.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            polyline.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            polyline.addClass('cvat_canvas_ground_truth');
        }

        return polyline;
    }

    private addCuboid(points: string, state: any): any {
        const cube = (this.adoptedContent as any)
            .cube(points)
            .fill(state.color)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                ...this.getShapeColorization(state),
            }).addClass('cvat_canvas_shape');

        if (state.occluded) {
            cube.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            cube.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            cube.addClass('cvat_canvas_ground_truth');
        }

        return cube;
    }

    private addMask(points: number[], state: any): SVG.Image {
        const colorization = this.getShapeColorization(state);
        const color = fabric.Color.fromHex(colorization.fill).getSource();
        const [left, top, right, bottom] = points.slice(-4);
        const imageBitmap = expandChannels(color[0], color[1], color[2], points);

        const image = this.adoptedContent.image().attr({
            clientID: state.clientID,
            'color-rendering': 'optimizeQuality',
            id: `cvat_canvas_shape_${state.clientID}`,
            'shape-rendering': 'geometricprecision',
            'data-z-order': state.zOrder,
            // apply sqrt function to colorization to enhance displaying the mask on the canvas
            opacity: Math.sqrt(colorization['fill-opacity']),
            stroke: colorization.stroke,
        }).addClass('cvat_canvas_shape');
        image.move(this.geometry.offset + left, this.geometry.offset + top);

        imageDataToDataURL(
            imageBitmap,
            right - left + 1,
            bottom - top + 1,
            (dataURL: string) => new Promise((resolve, reject) => {
                image.loaded(() => {
                    resolve();
                });
                image.error(() => {
                    reject();
                });
                image.load(dataURL);
            }),
        );

        if (state.occluded) {
            image.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            image.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            image.addClass('cvat_canvas_ground_truth');
        }

        return image;
    }

    private addSkeleton(state: any): any {
        const skeleton = (this.adoptedContent as any)
            .group()
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                'pointer-events': 'all',
                ...this.getShapeColorization(state),
            }).addClass('cvat_canvas_shape cvat_canvas_shape_skeleton') as SVG.G;

        const SVGElement = makeSVGFromTemplate(state.label.structure.svg);

        let [xtl, ytl, xbr, ybr] = [null, null, null, null];
        const svgElements: Record<number, SVG.Element> = {};
        const templateElements = Array.from(SVGElement.children()).filter((el: SVG.Element) => el.type === 'circle');
        for (let i = 0; i < state.elements.length; i++) {
            const element = state.elements[i];
            if (element.shapeType === 'points') {
                const points: number[] = element.points as number[];
                const [cx, cy] = this.translateToCanvas(points);

                if (!element.outside) {
                    xtl = xtl === null ? cx : Math.min(xtl, cx);
                    ytl = ytl === null ? cy : Math.min(ytl, cy);
                    xbr = xbr === null ? cx : Math.max(xbr, cx);
                    ybr = ybr === null ? cy : Math.max(ybr, cy);
                }

                const templateElement = templateElements.find((el: SVG.Circle) => el.attr('data-label-id') === element.label.id);
                const circle = skeleton.circle()
                    .center(cx, cy)
                    .attr({
                        id: `cvat_canvas_shape_${element.clientID}`,
                        r: this.configuration.controlPointsSize / this.geometry.scale,
                        'color-rendering': 'optimizeQuality',
                        'shape-rendering': 'geometricprecision',
                        'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                        'data-node-id': templateElement.attr('data-node-id'),
                        'data-element-id': templateElement.attr('data-element-id'),
                        'data-label-id': templateElement.attr('data-label-id'),
                        'data-client-id': element.clientID,
                        ...this.getShapeColorization(element, { parentState: state }),
                    }).style({
                        cursor: 'default',
                    });
                this.svgShapes[element.clientID] = circle;
                if (element.occluded) {
                    circle.addClass('cvat_canvas_shape_occluded');
                }

                if (element.hidden || element.outside || this.isInnerHidden(element.clientID)) {
                    circle.addClass('cvat_canvas_hidden');
                }

                const mouseover = (e: MouseEvent): void => {
                    const locked = this.drawnStates[state.clientID].lock;
                    if (!locked && !e.ctrlKey && this.mode === Mode.IDLE) {
                        circle.attr({
                            'stroke-width': consts.POINTS_SELECTED_STROKE_WIDTH / this.geometry.scale,
                        });

                        const [x, y] = translateToSVG(this.content, [e.clientX, e.clientY]);
                        const event: CustomEvent = new CustomEvent('canvas.moved', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                x: x - this.geometry.offset,
                                y: y - this.geometry.offset,
                                activatedElementID: element.clientID,
                                states: this.controller.objects,
                            },
                        });

                        this.canvas.dispatchEvent(event);
                    }
                };

                const mousemove = (e: MouseEvent): void => {
                    if (this.mode === Mode.IDLE) {
                        // stop propagation to canvas where it calls another canvas.moved
                        // and does not allow to activate an element
                        e.stopPropagation();
                    }
                };

                const mouseleave = (): void => {
                    circle.attr({
                        'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                    });
                };

                const click = (e: MouseEvent): void => {
                    e.stopPropagation();
                    this.canvas.dispatchEvent(
                        new CustomEvent('canvas.clicked', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                state: element,
                            },
                        }),
                    );
                };

                circle.on('mouseover', mouseover);
                circle.on('mouseleave', mouseleave);
                circle.on('mousemove', mousemove);
                circle.on('click', click);
                circle.on('remove', () => {
                    circle.off('remove');
                    circle.off('mouseover', mouseover);
                    circle.off('mouseleave', mouseleave);
                    circle.off('mousemove', mousemove);
                    circle.off('click', click);
                });

                svgElements[element.clientID] = circle;
            }
        }

        // if all elements were outside, set coordinates to zeros
        xtl = xtl || 0;
        ytl = ytl || 0;
        xbr = xbr || 0;
        ybr = ybr || 0;

        // apply bounding box margin
        xtl -= consts.SKELETON_RECT_MARGIN;
        ytl -= consts.SKELETON_RECT_MARGIN;
        xbr += consts.SKELETON_RECT_MARGIN;
        ybr += consts.SKELETON_RECT_MARGIN;

        skeleton.on('remove', () => {
            Object.values(svgElements).forEach((element) => element.fire('remove'));
            skeleton.off('remove');
        });

        const wrappingRect = skeleton.rect(xbr - xtl, ybr - ytl).move(xtl, ytl).attr({
            fill: 'inherit',
            'fill-opacity': 0,
            'color-rendering': 'optimizeQuality',
            'shape-rendering': 'geometricprecision',
            stroke: 'inherit',
            'stroke-width': 'inherit',
            'data-xtl': xtl,
            'data-ytl': ytl,
            'data-xbr': xbr,
            'data-ybr': ybr,
        }).addClass('cvat_canvas_skeleton_wrapping_rect');

        skeleton.node.prepend(wrappingRect.node);
        setupSkeletonEdges(skeleton, SVGElement);

        if (state.occluded) {
            skeleton.addClass('cvat_canvas_shape_occluded');
        }

        if (state.isGroundTruth) {
            skeleton.addClass('cvat_canvas_ground_truth');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            skeleton.addClass('cvat_canvas_hidden');
        }

        (skeleton as any).selectize = (enabled: boolean) => {
            this.selectize(enabled, wrappingRect);
            const handler = wrappingRect.remember('_selectHandler');
            if (enabled && handler) {
                this.adoptedContent.node.append(handler.nested.node);
                handler.nested.attr('fill', skeleton.attr('fill'));
            }

            return skeleton;
        };

        return skeleton;
    }

    private setupPoints(basicPolyline: SVG.PolyLine, state: any | DrawnState): any {
        this.selectize(true, basicPolyline);

        const group: SVG.G = basicPolyline
            .remember('_selectHandler')
            .nested.addClass('cvat_canvas_shape')
            .attr({
                clientID: state.clientID,
                id: `cvat_canvas_shape_${state.clientID}`,
                'data-polyline-id': basicPolyline.attr('id'),
                'data-z-order': state.zOrder,
            });

        group.on('click.canvas', (event: MouseEvent): void => {
            // Need to redispatch the event on another element
            basicPolyline.fire(new MouseEvent('click', event));
            // redispatch event to canvas to be able merge points clicking them
            this.content.dispatchEvent(new MouseEvent('click', event));
        });

        group.bbox = basicPolyline.bbox.bind(basicPolyline);
        group.clone = basicPolyline.clone.bind(basicPolyline);

        return group;
    }

    private addEllipse(points: string, state: any): SVG.Rect {
        const [cx, cy, rightX, topY] = points.split(/[/,\s]/g).map((coord) => +coord);
        const [rx, ry] = [rightX - cx, cy - topY];
        const rect = this.adoptedContent
            .ellipse(rx * 2, ry * 2)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                'shape-rendering': 'geometricprecision',
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
                ...this.getShapeColorization(state),
            })
            .center(cx, cy)
            .addClass('cvat_canvas_shape');

        if (state.rotation) {
            rect.rotate(state.rotation);
        }

        if (state.occluded) {
            rect.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            rect.addClass('cvat_canvas_hidden');
        }

        if (state.isGroundTruth) {
            rect.addClass('cvat_canvas_ground_truth');
        }

        return rect;
    }

    private addPoints(points: string, state: any): SVG.PolyLine {
        const shape = this.adoptedContent
            .polyline(points)
            .attr({
                'color-rendering': 'optimizeQuality',
                'pointer-events': 'none',
                'shape-rendering': 'geometricprecision',
                'stroke-width': 0,
                ...this.getShapeColorization(state),
            }).style({
                opacity: 0,
            });

        const group = this.setupPoints(shape, state);

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            group.addClass('cvat_canvas_hidden');
        }

        if (state.occluded) {
            group.addClass('cvat_canvas_shape_occluded');
        }

        if (state.isGroundTruth) {
            group.addClass('cvat_canvas_ground_truth');
        }

        shape.remove = (): SVG.PolyLine => {
            this.selectize(false, shape);
            shape.constructor.prototype.remove.call(shape);
            return shape;
        };

        return shape;
    }
}
