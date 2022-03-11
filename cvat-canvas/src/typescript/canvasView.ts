// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import polylabel from 'polylabel';
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
import { RegionSelector, RegionSelectorImpl } from './regionSelector';
import { ZoomHandler, ZoomHandlerImpl } from './zoomHandler';
import { InteractionHandler, InteractionHandlerImpl } from './interactionHandler';
import { AutoborderHandler, AutoborderHandlerImpl } from './autoborderHandler';
import consts from './consts';
import {
    translateToSVG,
    translateFromSVG,
    translateToCanvas,
    translateFromCanvas,
    pointsToNumberArray,
    parsePoints,
    displayShapeSize,
    scalarProduct,
    vectorLength,
    ShapeSizeElement,
    DrawnState,
    rotate2DPoints,
    readPointsFromShape,
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
    Configuration,
    InteractionResult,
    InteractionData,
} from './canvasModel';

export interface CanvasView {
    html(): HTMLDivElement;
}

export class CanvasViewImpl implements CanvasView, Listener {
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
    private controller: CanvasController;
    private svgShapes: Record<number, SVG.Shape>;
    private svgTexts: Record<number, SVG.Text>;
    private issueRegionPattern_1: SVG.Pattern;
    private issueRegionPattern_2: SVG.Pattern;
    private drawnStates: Record<number, DrawnState>;
    private drawnIssueRegions: Record<number, SVG.Shape>;
    private geometry: Geometry;
    private drawHandler: DrawHandler;
    private editHandler: EditHandler;
    private mergeHandler: MergeHandler;
    private splitHandler: SplitHandler;
    private groupHandler: GroupHandler;
    private regionSelector: RegionSelector;
    private zoomHandler: ZoomHandler;
    private autoborderHandler: AutoborderHandler;
    private interactionHandler: InteractionHandler;
    private activeElement: ActiveElement;
    private configuration: Configuration;
    private snapToAngleResize: number;
    private innerObjectsFlags: {
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

    private translateToCanvas(points: number[]): number[] {
        const { offset } = this.controller.geometry;
        return translateToCanvas(offset, points);
    }

    private translateFromCanvas(points: number[]): number[] {
        const { offset } = this.controller.geometry;
        return translateFromCanvas(offset, points);
    }

    private translatePointsFromRotatedShape(shape: SVG.Shape, points: number[]): number[] {
        const { rotation } = shape.transform();
        // currently shape is rotated and shifted somehow additionally (css transform property)
        // let's remove rotation to get correct transformation matrix (element -> screen)
        // correct means that we do not consider points to be rotated
        // because rotation property is stored separately and already saved
        shape.rotate(0);
        const result = [];

        try {
            // get each point and apply a couple of matrix transformation to it
            const point = this.content.createSVGPoint();
            // matrix to convert from ELEMENT file system to CLIENT coordinate system
            const ctm = ((shape.node as any) as SVGRectElement | SVGPolygonElement | SVGPolylineElement).getScreenCTM();
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
            shape.rotate(rotation);
        }

        return result;
    }

    private stringifyToCanvas(points: number[]): string {
        return points.reduce((acc: string, val: number, idx: number): string => {
            if (idx % 2) {
                return `${acc}${val} `;
            }

            return `${acc}${val},`;
        }, '');
    }

    private isInnerHidden(clientID: number): boolean {
        return this.innerObjectsFlags.drawHidden[clientID] || false;
    }

    private setupInnerFlags(clientID: number, path: 'drawHidden', value: boolean): void {
        this.innerObjectsFlags[path][clientID] = value;
        const shape = this.svgShapes[clientID];
        const text = this.svgTexts[clientID];
        const state = this.drawnStates[clientID];

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
                        this.updateTextPosition(text, shape);
                    }
                }
            }
        }
    }

    private onInteraction(
        shapes: InteractionResult[] | null,
        shapesUpdated = true,
        isDone = false,
        threshold: number | null = null,
    ): void {
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
                    threshold,
                },
            });

            this.canvas.dispatchEvent(event);
        }

        if (shapes === null || isDone) {
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
            this.mode = Mode.IDLE;
            this.controller.interact({
                enabled: false,
            });
        }
    }

    private onDrawDone(data: any | null, duration: number, continueDraw?: boolean): void {
        const hiddenBecauseOfDraw = Object.keys(this.innerObjectsFlags.drawHidden)
            .map((_clientID): number => +_clientID);
        if (hiddenBecauseOfDraw.length) {
            for (const hidden of hiddenBecauseOfDraw) {
                this.setupInnerFlags(hidden, 'drawHidden', false);
            }
        }

        if (data) {
            const { clientID, points } = data as any;
            if (typeof clientID === 'number') {
                const event: CustomEvent = new CustomEvent('canvas.canceled', {
                    bubbles: false,
                    cancelable: true,
                });

                this.canvas.dispatchEvent(event);

                const [state] = this.controller.objects.filter((_state: any): boolean => _state.clientID === clientID);

                this.onEditDone(state, points);
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
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        if (!continueDraw) {
            this.mode = Mode.IDLE;
            this.controller.draw({
                enabled: false,
            });
        }
    }

    private onEditDone(state: any, points: number[], rotation?: number): void {
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
            const event: CustomEvent = new CustomEvent('canvas.canceled', {
                bubbles: false,
                cancelable: true,
            });

            this.canvas.dispatchEvent(event);
        }

        this.mode = Mode.IDLE;
    }

    private onMergeDone(objects: any[] | null, duration?: number): void {
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

    private onRegionSelected(points?: number[]): void {
        if (points) {
            const event: CustomEvent = new CustomEvent('canvas.regionselected', {
                bubbles: false,
                cancelable: true,
                detail: {
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

        this.controller.selectRegion(false);
        this.mode = Mode.IDLE;
    }

    private onFindObject(e: MouseEvent): void {
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
    }

    private onFocusRegion(x: number, y: number, width: number, height: number): void {
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
    }

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
        this.editHandler.transform(this.geometry);
        this.zoomHandler.transform(this.geometry);
        this.autoborderHandler.transform(this.geometry);
        this.interactionHandler.transform(this.geometry);
        this.regionSelector.transform(this.geometry);
    }

    private transformCanvas(): void {
        // Transform canvas
        for (const obj of [this.background, this.grid, this.content, this.bitmap, this.attachmentBoard]) {
            obj.style.transform = `scale(${this.geometry.scale}) rotate(${this.geometry.angle}deg)`;
        }

        // Transform grid
        this.gridPath.setAttribute('stroke-width', `${consts.BASE_GRID_WIDTH / this.geometry.scale}px`);

        // Transform all shape points
        for (const element of [
            ...window.document.getElementsByClassName('svg_select_points'),
            ...window.document.getElementsByClassName('svg_select_points_rot'),
        ]) {
            element.setAttribute('stroke-width', `${consts.POINTS_STROKE_WIDTH / this.geometry.scale}`);
            element.setAttribute('r', `${consts.BASE_POINT_SIZE / this.geometry.scale}`);
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
            if (
                Object.prototype.hasOwnProperty.call(this.svgShapes, key) &&
                    Object.prototype.hasOwnProperty.call(this.svgTexts, key)
            ) {
                this.updateTextPosition(this.svgTexts[key], this.svgShapes[key]);
            }
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
        this.editHandler.transform(this.geometry);
        this.zoomHandler.transform(this.geometry);
        this.autoborderHandler.transform(this.geometry);
        this.interactionHandler.transform(this.geometry);
        this.regionSelector.transform(this.geometry);
    }

    private resizeCanvas(): void {
        for (const obj of [this.background, this.grid, this.bitmap]) {
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
                const stringified = this.stringifyToCanvas([
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
                const stringified = this.stringifyToCanvas(points);
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
            this.updateObjects(updated);
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
                        this.onEditDone(state, points.slice(0, pointID * 2).concat(points.slice(pointID * 2 + 2)));
                    } else if (e.shiftKey) {
                        this.canvas.dispatchEvent(
                            new CustomEvent('canvas.editstart', {
                                bubbles: false,
                                cancelable: true,
                            }),
                        );

                        this.mode = Mode.EDIT;
                        this.deactivate();
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
                pointSize: (2 * consts.BASE_POINT_SIZE) / this.geometry.scale,
                rotationPoint: shape.type === 'rect' || shape.type === 'ellipse',
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
        if (rotationPoint && !rotationPoint.children.length) {
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = 'Hold Shift to snap angle';
            rotationPoint.appendChild(title);
        }
    }

    private onShiftKeyDown = (e: KeyboardEvent): void => {
        if (!e.repeat && e.code.toLowerCase().includes('shift')) {
            this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_SHIFT;
            if (this.activeElement) {
                const shape = this.svgShapes[this.activeElement.clientID];
                if (shape && shape.hasClass('cvat_canvas_shape_activated')) {
                    (shape as any).resize({ snapToAngle: this.snapToAngleResize });
                }
            }
        }
    };

    private onShiftKeyUp = (e: KeyboardEvent): void => {
        if (e.code.toLowerCase().includes('shift') && this.activeElement) {
            this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_DEFAULT;
            if (this.activeElement) {
                const shape = this.svgShapes[this.activeElement.clientID];
                if (shape && shape.hasClass('cvat_canvas_shape_activated')) {
                    (shape as any).resize({ snapToAngle: this.snapToAngleResize });
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
        this.configuration = model.configuration;
        this.mode = Mode.IDLE;
        this.snapToAngleResize = consts.SNAP_TO_ANGLE_RESIZE_DEFAULT;
        this.innerObjectsFlags = {
            drawHidden: {},
        };

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

        // Setup API handlers
        this.autoborderHandler = new AutoborderHandlerImpl(this.content);
        this.drawHandler = new DrawHandlerImpl(
            this.onDrawDone.bind(this),
            this.adoptedContent,
            this.adoptedText,
            this.autoborderHandler,
            this.geometry,
            this.configuration,
        );
        this.editHandler = new EditHandlerImpl(this.onEditDone.bind(this), this.adoptedContent, this.autoborderHandler);
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
        this.regionSelector = new RegionSelectorImpl(
            this.onRegionSelected.bind(this),
            this.adoptedContent,
            this.geometry,
        );
        this.zoomHandler = new ZoomHandlerImpl(this.onFocusRegion.bind(this), this.adoptedContent, this.geometry);
        this.interactionHandler = new InteractionHandlerImpl(
            this.onInteraction.bind(this),
            this.adoptedContent,
            this.geometry,
            this.configuration,
        );

        // Setup event handlers
        this.content.addEventListener('dblclick', (e: MouseEvent): void => {
            this.controller.fit();
            e.preventDefault();
        });

        this.content.addEventListener('mousedown', (event): void => {
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

        this.content.addEventListener('wheel', (event): void => {
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

        this.content.addEventListener('mousemove', (e): void => {
            this.controller.drag(e.clientX, e.clientY);

            if (this.mode !== Mode.IDLE) return;
            if (e.ctrlKey || e.altKey) return;

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
        if (reason === UpdateReasons.CONFIG_UPDATED) {
            const { activeElement } = this;
            this.deactivate();
            const { configuration } = model;

            if (configuration.displayAllText && !this.configuration.displayAllText) {
                for (const i in this.drawnStates) {
                    if (!(i in this.svgTexts)) {
                        this.svgTexts[i] = this.addText(this.drawnStates[i]);
                    }
                }
            } else if (configuration.displayAllText === false && this.configuration.displayAllText) {
                for (const i in this.drawnStates) {
                    if (i in this.svgTexts && Number.parseInt(i, 10) !== activeElement.clientID) {
                        this.svgTexts[i].remove();
                        delete this.svgTexts[i];
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
            if (recreateText) {
                const states = this.controller.objects;
                for (const key of Object.keys(this.drawnStates)) {
                    const clientID = +key;
                    const [state] = states.filter((_state: any) => _state.clientID === clientID);
                    if (clientID in this.svgTexts) {
                        this.svgTexts[clientID].remove();
                        delete this.svgTexts[clientID];
                        if (state) this.svgTexts[clientID] = this.addText(state);
                    }
                }
            }

            if (updateTextPosition) {
                for (const i in this.drawnStates) {
                    if (i in this.svgTexts) {
                        this.updateTextPosition(this.svgTexts[i], this.svgShapes[i]);
                    }
                }
            }

            this.activate(activeElement);
            this.editHandler.configurate(this.configuration);
            this.drawHandler.configurate(this.configuration);
            this.interactionHandler.configurate(this.configuration);

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
            if (!image) {
                this.loadingAnimation.classList.remove('cvat_canvas_hidden');
            } else {
                this.loadingAnimation.classList.add('cvat_canvas_hidden');
                const ctx = this.background.getContext('2d');
                this.background.setAttribute('width', `${image.renderWidth}px`);
                this.background.setAttribute('height', `${image.renderHeight}px`);

                if (ctx) {
                    if (image.imageData instanceof ImageData) {
                        ctx.scale(
                            image.renderWidth / image.imageData.width,
                            image.renderHeight / image.imageData.height,
                        );
                        ctx.putImageData(image.imageData, 0, 0);
                        // Transformation matrix must not affect the putImageData() method.
                        // By this reason need to redraw the image to apply scale.
                        // https://www.w3.org/TR/2dcontext/#dom-context-2d-putimagedata
                        ctx.drawImage(this.background, 0, 0);
                    } else {
                        ctx.drawImage(image.imageData, 0, 0);
                    }
                }
                this.moveCanvas();
                this.resizeCanvas();
                this.transformCanvas();
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
            this.moveCanvas();
            this.transformCanvas();
            if (reason === UpdateReasons.IMAGE_FITTED) {
                this.canvas.dispatchEvent(
                    new CustomEvent('canvas.fit', {
                        bubbles: false,
                        cancelable: true,
                    }),
                );
            }
        } else if (reason === UpdateReasons.IMAGE_MOVED) {
            this.moveCanvas();
        } else if (reason === UpdateReasons.OBJECTS_UPDATED) {
            if (this.mode === Mode.GROUP) {
                this.groupHandler.resetSelectedObjects();
            }
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
            const object = this.svgShapes[clientID];
            if (object) {
                const bbox: SVG.BBox = object.bbox();
                this.onFocusRegion(
                    bbox.x - padding,
                    bbox.y - padding,
                    bbox.width + padding * 2,
                    bbox.height + padding * 2,
                );
            }
        } else if (reason === UpdateReasons.SHAPE_ACTIVATED) {
            this.activate(this.controller.activeElement);
        } else if (reason === UpdateReasons.SELECT_REGION) {
            if (this.mode === Mode.SELECT_REGION) {
                this.regionSelector.select(true);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.regionSelector.select(false);
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
            if (data.enabled && this.mode === Mode.IDLE) {
                this.canvas.style.cursor = 'crosshair';
                this.mode = Mode.DRAW;
                if (typeof data.redraw === 'number') {
                    this.setupInnerFlags(data.redraw, 'drawHidden', true);
                }
                this.drawHandler.draw(data, this.geometry);
            } else {
                this.canvas.style.cursor = '';
                if (this.mode !== Mode.IDLE) {
                    this.drawHandler.draw(data, this.geometry);
                }
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
            } else if (this.mode === Mode.INTERACT) {
                this.interactionHandler.cancel();
            } else if (this.mode === Mode.MERGE) {
                this.mergeHandler.cancel();
            } else if (this.mode === Mode.SPLIT) {
                this.splitHandler.cancel();
            } else if (this.mode === Mode.GROUP) {
                this.groupHandler.cancel();
            } else if (this.mode === Mode.SELECT_REGION) {
                this.regionSelector.cancel();
            } else if (this.mode === Mode.EDIT) {
                this.editHandler.cancel();
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
            this.mode = Mode.IDLE;
            this.canvas.style.cursor = '';
        } else if (reason === UpdateReasons.DATA_FAILED) {
            const event: CustomEvent = new CustomEvent('canvas.error', {
                detail: {
                    exception: model.exception,
                },
            });
            this.canvas.dispatchEvent(event);
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

        if (model.imageBitmap && [UpdateReasons.IMAGE_CHANGED, UpdateReasons.OBJECTS_UPDATED].includes(reason)) {
            this.redrawBitmap();
        }
    }

    public html(): HTMLDivElement {
        return this.canvas;
    }

    private redrawBitmap(): void {
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

    private saveState(state: any): void {
        this.drawnStates[state.clientID] = {
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
        };
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
                        this.updateTextPosition(text, shape);
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
                if (state.occluded) {
                    shape.addClass('cvat_canvas_shape_occluded');
                } else {
                    shape.removeClass('cvat_canvas_shape_occluded');
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
                    const stringified = this.stringifyToCanvas(translatedPoints);
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
                // need to remove created text and create it again
                if (text) {
                    text.remove();
                    this.svgTexts[state.clientID] = this.addText(state);
                }
            } else {
                // check if there are updates in attributes
                for (const attrID of Object.keys(state.attributes)) {
                    if (state.attributes[attrID] !== drawnState.attributes[+attrID]) {
                        if (text) {
                            const [span] = text.node.querySelectorAll<SVGTSpanElement>(`[attrID="${attrID}"]`);
                            if (span && span.textContent) {
                                const prefix = span.textContent.split(':').slice(0, -1).join(':');
                                span.textContent = `${prefix}: ${state.attributes[attrID]}`;
                            }
                        }
                    }
                }
            }

            this.saveState(state);
        }
    }

    private deleteObjects(states: any[]): void {
        for (const state of states) {
            if (state.clientID in this.svgTexts) {
                this.svgTexts[state.clientID].remove();
                delete this.svgTexts[state.clientID];
            }

            this.svgShapes[state.clientID].fire('remove');
            this.svgShapes[state.clientID].off('click');
            this.svgShapes[state.clientID].off('remove');
            this.svgShapes[state.clientID].remove();
            delete this.drawnStates[state.clientID];
            delete this.svgShapes[state.clientID];
        }
    }

    private addObjects(states: any[]): void {
        const { displayAllText } = this.configuration;
        for (const state of states) {
            const points: number[] = state.points as number[];
            const translatedPoints: number[] = this.translateToCanvas(points);

            // TODO: Use enums after typification cvat-core
            if (state.shapeType === 'rectangle') {
                this.svgShapes[state.clientID] = this.addRect(translatedPoints, state);
            } else {
                const stringified = this.stringifyToCanvas(translatedPoints);

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
                this.svgTexts[state.clientID] = this.addText(state);
                this.updateTextPosition(this.svgTexts[state.clientID], this.svgShapes[state.clientID]);
            }

            this.saveState(state);
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
        if (this.activeElement.clientID !== null) {
            const { displayAllText } = this.configuration;
            const { clientID } = this.activeElement;
            const drawnState = this.drawnStates[clientID];
            const shape = this.svgShapes[clientID];

            shape.removeClass('cvat_canvas_shape_activated');
            shape.removeClass('cvat_canvas_shape_draggable');

            if (!drawnState.pinned) {
                (shape as any).off('dragstart');
                (shape as any).off('dragend');
                (shape as any).draggable(false);
            }

            if (drawnState.shapeType !== 'points') {
                this.selectize(false, shape);
            }

            if (drawnState.shapeType === 'cuboid') {
                (shape as any).attr('projections', false);
            }

            (shape as any).off('resizestart');
            (shape as any).off('resizing');
            (shape as any).off('resizedone');
            (shape as any).resize('stop');

            // TODO: Hide text only if it is hidden by settings
            const text = this.svgTexts[clientID];
            if (text && !displayAllText) {
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
        let text = this.svgTexts[clientID];
        if (!text) {
            text = this.addText(state);
            this.svgTexts[state.clientID] = text;
        }
        this.updateTextPosition(text, shape);

        if (this.stateIsLocked(state)) {
            return;
        }

        shape.addClass('cvat_canvas_shape_activated');
        if (state.shapeType === 'points') {
            this.content.append(this.svgShapes[clientID].remember('_selectHandler').nested.node);
        } else {
            this.content.append(shape.node);
        }

        const { showProjections } = this.configuration;
        if (state.shapeType === 'cuboid' && showProjections) {
            (shape as any).attr('projections', true);
        }

        const hideText = (): void => {
            if (text) {
                text.addClass('cvat_canvas_hidden');
            }
        };

        const showText = (): void => {
            if (text) {
                text.removeClass('cvat_canvas_hidden');
                this.updateTextPosition(text, shape);
            }
        };

        if (!state.pinned) {
            shape.addClass('cvat_canvas_shape_draggable');
            (shape as any)
                .draggable()
                .on('dragstart', (): void => {
                    this.mode = Mode.DRAG;
                    hideText();
                    (shape as any).on('remove.drag', (): void => {
                        this.mode = Mode.IDLE;
                        // disable internal drag events of SVG.js
                        window.dispatchEvent(new MouseEvent('mouseup'));
                    });
                })
                .on('dragend', (e: CustomEvent): void => {
                    (shape as any).off('remove.drag');
                    this.mode = Mode.IDLE;
                    showText();
                    const p1 = e.detail.handler.startPoints.point;
                    const p2 = e.detail.p;
                    const delta = 1;
                    const dx2 = (p1.x - p2.x) ** 2;
                    const dy2 = (p1.y - p2.y) ** 2;
                    if (Math.sqrt(dx2 + dy2) >= delta) {
                        // these points does not take into account possible transformations, applied on the element
                        // so, if any (like rotation) we need to map them to canvas coordinate space
                        let points = readPointsFromShape(shape);

                        // let's keep current points, but they could be rewritten in updateObjects
                        this.drawnStates[clientID].points = this.translateFromCanvas(points);

                        const { rotation } = shape.transform();
                        if (rotation) {
                            points = this.translatePointsFromRotatedShape(shape, points);
                        }

                        points = this.translateFromCanvas(points);
                        this.canvas.dispatchEvent(
                            new CustomEvent('canvas.dragshape', {
                                bubbles: false,
                                cancelable: true,
                                detail: {
                                    id: state.clientID,
                                },
                            }),
                        );
                        this.onEditDone(state, points);
                    }
                });
        }

        if (state.shapeType !== 'points') {
            this.selectize(true, shape);
        }

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

        showDirection();

        let shapeSizeElement: ShapeSizeElement | null = null;
        let resized = false;

        const resizeFinally = (): void => {
            if (shapeSizeElement) {
                shapeSizeElement.rm();
                shapeSizeElement = null;
            }
            this.mode = Mode.IDLE;
        };

        (shape as any)
            .resize({
                snapToGrid: 0.1,
                snapToAngle: this.snapToAngleResize,
            })
            .on('resizestart', (): void => {
                this.mode = Mode.RESIZE;
                resized = false;
                hideDirection();
                hideText();
                if (state.shapeType === 'rectangle' || state.shapeType === 'ellipse') {
                    shapeSizeElement = displayShapeSize(this.adoptedContent, this.adoptedText);
                }
                (shape as any).on('remove.resize', () => {
                    // disable internal resize events of SVG.js
                    window.dispatchEvent(new MouseEvent('mouseup'));
                    resizeFinally();
                });
            })
            .on('resizing', (): void => {
                resized = true;
                if (shapeSizeElement) {
                    shapeSizeElement.update(shape);
                }
            })
            .on('resizedone', (): void => {
                (shape as any).off('remove.resize');
                resizeFinally();
                showDirection();
                showText();
                if (resized) {
                    let rotation = shape.transform().rotation || 0;

                    // be sure, that rotation in range [0; 360]
                    while (rotation < 0) rotation += 360;
                    rotation %= 360;

                    // these points does not take into account possible transformations, applied on the element
                    // so, if any (like rotation) we need to map them to canvas coordinate space
                    let points = readPointsFromShape(shape);

                    // let's keep current points, but they could be rewritten in updateObjects
                    this.drawnStates[clientID].points = this.translateFromCanvas(points);
                    this.drawnStates[clientID].rotation = rotation;
                    if (rotation) {
                        points = this.translatePointsFromRotatedShape(shape, points);
                    }

                    // points = this.translateFromCanvas(points);
                    this.canvas.dispatchEvent(
                        new CustomEvent('canvas.resizeshape', {
                            bubbles: false,
                            cancelable: true,
                            detail: {
                                id: state.clientID,
                            },
                        }),
                    );
                    this.onEditDone(state, this.translateFromCanvas(points), rotation);
                }
            });

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

    // Update text position after corresponding box has been moved, resized, etc.
    private updateTextPosition(text: SVG.Text, shape: SVG.Shape): void {
        if (text.node.style.display === 'none') return; // wrong transformation matrix
        const { textFontSize, textPosition } = this.configuration;

        text.untransform();
        text.style({ 'font-size': `${textFontSize}px` });
        const { rotation } = shape.transform();

        // Find the best place for a text
        let [clientX, clientY, clientCX, clientCY]: number[] = [0, 0, 0, 0];
        if (textPosition === 'center') {
            let cx = 0;
            let cy = 0;
            if (shape.type === 'rect') {
                // for rectangle finding a center is simple
                cx = +shape.attr('x') + +shape.attr('width') / 2;
                cy = +shape.attr('y') + +shape.attr('height') / 2;
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
            clientCX,
            clientCY,
        ]);

        const textBBox = ((text.node as any) as SVGTextElement).getBBox();
        // Finally draw a text
        if (textPosition === 'center') {
            text.move(x - textBBox.width / 2, y - textBBox.height / 2);
        } else {
            text.move(x, y);
        }

        if (rotation) {
            text.rotate(rotation, rotX, rotY);
        }

        for (const tspan of (text.lines() as any).members) {
            tspan.attr('x', text.attr('x'));
        }
    }

    private addText(state: any): SVG.Text {
        const { undefinedAttrValue } = this.configuration;
        const content = this.configuration.textContent;
        const withID = content.includes('id');
        const withAttr = content.includes('attributes');
        const withLabel = content.includes('label');
        const withSource = content.includes('source');
        const withDescriptions = content.includes('descriptions');

        const textFontSize = this.configuration.textFontSize || 12;
        const {
            label, clientID, attributes, source, descriptions,
        } = state;
        const attrNames = label.attributes.reduce((acc: any, val: any): void => {
            acc[val.id] = val.name;
            return acc;
        }, {});

        return this.adoptedText
            .text((block): void => {
                block.tspan(`${withLabel ? label.name : ''} ${withID ? clientID : ''} ${withSource ? `(${source})` : ''}`).style({
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
                        const value = attributes[attrID] === undefinedAttrValue ? '' : attributes[attrID];
                        block
                            .tspan(`${attrNames[attrID]}: ${value}`)
                            .attr({
                                attrID,
                                dy: '1em',
                                x: 0,
                            })
                            .addClass('cvat_canvas_text_attribute');
                    }
                }
            })
            .move(0, 0)
            .style({ 'font-size': textFontSize })
            .addClass('cvat_canvas_text');
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
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
            })
            .move(xtl, ytl)
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

        return rect;
    }

    private addPolygon(points: string, state: any): SVG.Polygon {
        const polygon = this.adoptedContent
            .polygon(points)
            .attr({
                clientID: state.clientID,
                'color-rendering': 'optimizeQuality',
                id: `cvat_canvas_shape_${state.clientID}`,
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
            })
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            polygon.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            polygon.addClass('cvat_canvas_hidden');
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
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
            })
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            polyline.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            polyline.addClass('cvat_canvas_hidden');
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
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
            })
            .addClass('cvat_canvas_shape');

        if (state.occluded) {
            cube.addClass('cvat_canvas_shape_occluded');
        }

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            cube.addClass('cvat_canvas_hidden');
        }

        return cube;
    }

    private setupPoints(basicPolyline: SVG.PolyLine, state: any): any {
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
                fill: state.color,
                'shape-rendering': 'geometricprecision',
                stroke: state.color,
                'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale,
                'data-z-order': state.zOrder,
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
                fill: state.color, // to right fill property when call SVG.Shape::clone()
            })
            .style({
                opacity: 0,
            });

        const group = this.setupPoints(shape, state);

        if (state.hidden || state.outside || this.isInnerHidden(state.clientID)) {
            group.addClass('cvat_canvas_hidden');
        }

        shape.remove = (): SVG.PolyLine => {
            this.selectize(false, shape);
            shape.constructor.prototype.remove.call(shape);
            return shape;
        };

        return shape;
    }
}
