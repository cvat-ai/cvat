// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import {
    stringifyPoints, translateToCanvas, translateFromCanvas, translateToSVG,
    findIntersection, zipChannels, Segment, findClosestPointOnSegment, segmentsFromPoints,
    toReversed,
} from './shared';
import {
    Geometry, SliceData, Configuration, CanvasHint,
} from './canvasModel';
import consts from './consts';
import { ObjectSelector } from './objectSelector';

export interface SliceHandler {
    slice(sliceData: any): void;
    transform(geometry: Geometry): void;
    configurate(config: Configuration): void;
    cancel(): void;
}

type EnhancedSliceData = {
    enabled: boolean;
    contour: number[];
    state: any;
    shapeType: 'mask' | 'polygon';
};

function drawOverOffscreenCanvas(context: OffscreenCanvasRenderingContext2D, image: CanvasImageSource): void {
    context.fillStyle = 'black';
    context.globalCompositeOperation = 'source-over';
    context.drawImage(image, 0, 0);
}

function applyOffscreenCanvasMask(context: OffscreenCanvasRenderingContext2D, polygon: number[]): void {
    const currentCompositeOperation = context.globalCompositeOperation;
    context.globalCompositeOperation = 'destination-in';
    context.beginPath();
    context.moveTo(polygon[0], polygon[1]);
    polygon.forEach((_, idx) => {
        if (idx > 1 && !(idx % 2)) {
            context.lineTo(polygon[idx], polygon[idx + 1]);
        }
    });
    context.closePath();
    context.fill();
    context.globalCompositeOperation = currentCompositeOperation;
}

function indexGenerator(length: number, from: number, to: number, direction: 'forward' | 'backward'): number[] {
    const result = [];
    const value = direction === 'forward' ? 1 : -1;

    if (from < 0 || from >= length || to < 0 || to >= length) {
        throw new Error('Incorrect index generator input');
    }

    let i = from;
    while (i !== to) {
        result.push(i);
        i += value;

        if (i >= length) {
            i = 0;
        }

        if (i < 0) {
            i = length - 1;
        }
    }
    result.push(i);
    return result;
}

function getAllIntersections(segment: Segment, segments: Segment[]): Record<number, [number, number]> {
    const intersections: Record<number, [number, number]> = {};
    for (let i = 0; i < segments.length; i++) {
        const checkedSegment = segments[i];
        const intersection = findIntersection(checkedSegment, segment);
        if (intersection !== null) {
            intersections[i] = intersection;
        }
    }

    return intersections;
}

export class SliceHandlerImpl implements SliceHandler {
    private canvas: SVG.Container;
    private startTimestamp: number;
    private controlPointSize: number;
    private outlinedBorders: string;
    private enabled: boolean;
    private shapeContour: SVG.PolyLine | null;
    private slicingLine: SVG.PolyLine | null;
    private slicingPoints: SVG.Circle[];
    private hideObject: (clientID: number) => void;
    private showObject: (clientID: number) => void;
    private onSliceDone: (state?: any, results?: number[][], duration?: number) => void;
    private onMessage: (messages: CanvasHint[] | null, topic: string) => void;
    private onError: (exception: unknown) => void;
    private getObjects: () => any[];
    private geometry: Geometry;
    private objectSelector: ObjectSelector;
    private hiddenClientIDs: number[];

    public constructor(
        hideObject: SliceHandlerImpl['hideObject'],
        showObject: SliceHandlerImpl['showObject'],
        onSliceDone: SliceHandlerImpl['onSliceDone'],
        onMessage: SliceHandlerImpl['onMessage'],
        onError: SliceHandlerImpl['onError'],
        getObjects: () => any[],
        geometry: Geometry,
        canvas: SVG.Container,
        objectSelector: ObjectSelector,
    ) {
        this.hideObject = hideObject;
        this.showObject = showObject;
        this.onSliceDone = onSliceDone;
        this.onMessage = onMessage;
        this.onError = onError;
        this.getObjects = getObjects;
        this.geometry = geometry;
        this.canvas = canvas;
        this.enabled = false;
        this.startTimestamp = Date.now();
        this.controlPointSize = consts.BASE_POINT_SIZE;
        this.outlinedBorders = 'black';
        this.shapeContour = null;
        this.slicingPoints = [];
        this.slicingLine = null;
        this.objectSelector = objectSelector;
        this.hiddenClientIDs = [];
    }

    private showInitialMessage(): void {
        this.onMessage([{
            type: 'text',
            icon: 'info',
            content: 'Set initial point on the shape contour',
        }, {
            type: 'list',
            content: [
                'Slicing line must not intersect itself',
                'Slicing line must not intersect contour more than twice',
            ],
            className: 'cvat-canvas-notification-list-warning',
        }], 'slice');
    }

    private initialize(sliceData: EnhancedSliceData): void {
        this.showInitialMessage();
        const { clientID } = sliceData.state;
        this.hiddenClientIDs = (this.canvas.select('.cvat_canvas_shape') as any).members
            .map((shape) => +shape.attr('clientID')).filter((_clientID: number) => _clientID !== clientID);
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.hideObject(clientIDs);
        });

        const translatedContour = translateToCanvas(this.geometry.offset, sliceData.contour);
        this.shapeContour = this.canvas.polygon(stringifyPoints(translatedContour));
        this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
        this.shapeContour.attr('stroke', this.outlinedBorders);
        this.shapeContour.addClass('cvat_canvas_sliced_contour');

        const contourSegments = segmentsFromPoints(translatedContour, true);
        let points: [number, number][] = [];
        let firstIntersectedSegmentIdx: number | null = null;

        const filterIntersections = (
            segment: Segment,
            intersections: ReturnType<typeof getAllIntersections>,
        ): ReturnType<typeof getAllIntersections> => {
            for (const key of Object.keys(intersections)) {
                const point = intersections[key];
                const d1 = Math.sqrt((point[0] - segment[0][0]) ** 2 + (point[1] - segment[0][1]) ** 2);
                const d2 = Math.sqrt((point[0] - segment[0][0]) ** 2 + (point[1] - segment[0][1]) ** 2);

                // if intersection is too close to edge points
                // it is an intersection in a point, ignore it
                if (d1 < 2e-3 || d2 < 2e-3) {
                    delete intersections[key];
                }
            }
            return intersections;
        };

        const initialClick = (event: MouseEvent): void => {
            const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
            let shortestDistance = Number.MAX_SAFE_INTEGER;
            let closestPoint: [number, number] = [x, y];
            let segmentIdx = -1;
            contourSegments.forEach((segment, idx) => {
                const point = findClosestPointOnSegment(segment, [x, y]);
                const distance = Math.sqrt((x - point[0]) ** 2 + (y - point[1]) ** 2);
                if (distance < shortestDistance) {
                    closestPoint = point;
                    shortestDistance = distance;
                    segmentIdx = idx;
                }
            });

            const THRESHOLD = 20 / this.geometry.scale;
            if (shortestDistance <= THRESHOLD) {
                points.push([...closestPoint], [...closestPoint]);
                firstIntersectedSegmentIdx = segmentIdx;
                this.slicingLine = this.canvas.polyline(stringifyPoints(points.flat()));
                this.slicingLine.addClass('cvat_canvas_slicing_line');
                this.slicingLine.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
                this.slicingLine.attr('stroke', this.outlinedBorders);
                const circle = this.canvas
                    .circle((this.controlPointSize * 2) / this.geometry.scale)
                    .center(closestPoint[0], closestPoint[1]);
                circle.attr('fill', 'white');
                circle.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
                this.slicingPoints.push(circle);

                this.onMessage([{
                    type: 'text',
                    icon: 'info',
                    content: 'Set more points within the shape contour, if necessary. Intersect contour at another point to slice',
                }, {
                    type: 'list',
                    content: [
                        'Hold <Shift> to enable slip mode',
                        'Do <Right Click> to cancel the latest point',
                    ],
                    className: 'cvat-canvas-notification-list-shortcuts',
                }], 'slice');
            }
        };

        const click = (event: MouseEvent): void => {
            const [prevX, prevY] = points[points.length - 2];
            const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
            points[points.length - 1] = [x, y];

            // check slicing line does not intersect itself
            const segment = [[prevX, prevY], [x, y]] as Segment;
            const slicingLineSegments = segmentsFromPoints(points.slice(0, -1).flat());
            const selfIntersections = filterIntersections(
                segment,
                getAllIntersections(segment, slicingLineSegments),
            );

            if (Object.keys(selfIntersections).length) {
                // not allowed
                return;
            }

            // find all intersections with contour
            const intersections = filterIntersections(
                [[prevX, prevY], [x, y]],
                getAllIntersections([[prevX, prevY], [x, y]], contourSegments),
            );

            const numberOfIntersections = Object.keys(intersections).length;
            if (numberOfIntersections !== 1) {
                // not allowed
                return;
            }

            // found two intersections, finish algorithm
            const intermediatePoints: [number, number][] = points.slice(1, -1);
            const secondIntersectedSegmentIdx = +Object.keys(intersections)[0];
            const firstIntersectionPoint = points[0];
            const secondIntersectionPoint = intersections[secondIntersectedSegmentIdx];

            let contour1 = [];
            let contour2 = [];
            if (firstIntersectedSegmentIdx === secondIntersectedSegmentIdx) {
                // the same segment. Results in this case are:
                contour1 = [
                    ...firstIntersectionPoint, // first intersection
                    ...intermediatePoints.flat(), // intermediate points
                    ...secondIntersectionPoint, // last intersection
                ];

                contour2 = [...contour1];
                const otherPoints = Array(contourSegments.length).fill(0).map((_, idx) => {
                    if (firstIntersectedSegmentIdx + idx < contourSegments.length) {
                        return firstIntersectedSegmentIdx + idx;
                    }

                    return firstIntersectedSegmentIdx + idx - contourSegments.length;
                }).map((idx) => contourSegments[idx][1]);

                const p1 = firstIntersectionPoint;
                const p2 = secondIntersectionPoint;
                const p = otherPoints[0];
                const d1 = Math.sqrt((p1[0] - p[0]) ** 2 + (p1[1] - p[1]) ** 2);
                const d2 = Math.sqrt((p2[0] - p[0]) ** 2 + (p2[1] - p[1]) ** 2);

                if (d2 > d1) {
                    contour2.push(...toReversed<[number, number]>(otherPoints).flat());
                } else {
                    contour2.push(...otherPoints.flat());
                }
            } else {
                const firstSegmentIdx = Math.min(firstIntersectedSegmentIdx, secondIntersectedSegmentIdx);
                const secondSegmentIdx = Math.max(firstIntersectedSegmentIdx, secondIntersectedSegmentIdx);
                const firstSegmentPoint = firstIntersectedSegmentIdx < secondIntersectedSegmentIdx ?
                    firstIntersectionPoint : secondIntersectionPoint;
                const secondSegmentPoint = firstIntersectedSegmentIdx < secondIntersectedSegmentIdx ?
                    secondIntersectionPoint : firstIntersectionPoint;

                // intersected different segments. Results in this case are:
                contour1 = [
                    ...firstSegmentPoint, // first intersection
                    // intermediate points (reversed if intersections order was swopped)
                    ...(firstSegmentIdx === firstIntersectedSegmentIdx ?
                        intermediatePoints : toReversed<[number, number]>(intermediatePoints)
                    ).flat(),
                    // second intersection
                    ...secondSegmentPoint,
                    // all the following contours points N, N+1, .. until (including) the first intersected segment
                    ...indexGenerator(contourSegments.length, secondSegmentIdx, firstSegmentIdx, 'forward')
                        .map((idx) => contourSegments[idx][1]).slice(0, -1).flat(),
                ];

                contour2 = [
                    ...firstSegmentPoint, // first intersection
                    // intermediate points (reversed if intersections order was swopped)
                    ...(firstSegmentIdx === firstIntersectedSegmentIdx ?
                        intermediatePoints : toReversed<[number, number]>(intermediatePoints)
                    ).flat(),
                    ...secondSegmentPoint,
                    // all the previous contours points N, N-1, .. until (including) the first intersected segment
                    ...indexGenerator(contourSegments.length, secondSegmentIdx, firstSegmentIdx, 'backward')
                        .map((idx) => contourSegments[idx][0]).slice(0, -1).flat(),
                ];
            }

            if (sliceData.shapeType === 'mask') {
                const shape = this.canvas
                    .select(`#cvat_canvas_shape_${clientID}`).get(0).node;
                const width = +shape.getAttribute('width');
                const height = +shape.getAttribute('height');
                const left = +shape.getAttribute('x');
                const top = +shape.getAttribute('y');

                const polygon1 = contour1.map((val, idx) => {
                    if (idx % 2) return val - top;
                    return val - left;
                });

                const polygon2 = contour2.map((val, idx) => {
                    if (idx % 2) return val - top;
                    return val - left;
                });

                const offscreenCanvas = new OffscreenCanvas(width, height);
                const context = offscreenCanvas.getContext('2d');
                drawOverOffscreenCanvas(context, shape as any as SVGImageElement);
                applyOffscreenCanvasMask(context, polygon1);
                const firstShape = zipChannels(context.getImageData(0, 0, width, height).data);
                // @ts-ignore error TS2339 https://github.com/microsoft/TypeScript/issues/55162
                context.reset();
                drawOverOffscreenCanvas(context, shape as any as SVGImageElement);
                applyOffscreenCanvasMask(context, polygon2);
                const secondShape = zipChannels(context.getImageData(0, 0, width, height).data);
                this.onSliceDone(sliceData.state, [firstShape, secondShape], Date.now() - this.startTimestamp);
            } else if (sliceData.shapeType === 'polygon') {
                this.onSliceDone(
                    sliceData.state,
                    [
                        translateFromCanvas(this.geometry.offset, contour1),
                        translateFromCanvas(this.geometry.offset, contour2),
                    ], Date.now() - this.startTimestamp,
                );
            } else {
                this.slice({ enabled: false });
            }
        };

        const handleCanvasMousedown = (event: MouseEvent): void => {
            if (event.altKey) {
                return;
            }

            if (event.button === 0 && !points.length) {
                initialClick(event);
            } else if (event.button === 0 && event.target !== this.shapeContour.node) {
                click(event);
            } else if (event.button === 2) {
                if (points.length > 2) {
                    points.splice(-2, 1);
                    this.slicingLine.plot(stringifyPoints(points.flat()));
                } else if (points.length) {
                    this.slicingPoints.forEach((circle) => {
                        circle.remove();
                    });
                    this.showInitialMessage();
                    this.slicingLine.remove();
                    points = [];
                    firstIntersectedSegmentIdx = null;
                    this.slicingPoints = [];
                    this.slicingLine = null;
                }
            }
        };

        const handleShapeMousedown = (event: MouseEvent, slipping = false): void => {
            if (points.length && event.button === 0 && !event.altKey) {
                const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
                points[points.length - 1] = [x, y];
                this.slicingLine.plot(stringifyPoints(points.flat()));

                const [prevX, prevY] = points[points.length - 2];
                const segment = [[prevX, prevY], [x, y]] as Segment;

                const slicingLineSegments = segmentsFromPoints(points.slice(0, -1).flat());
                const selfIntersections = filterIntersections(
                    segment,
                    getAllIntersections(segment, slicingLineSegments),
                );

                if (Object.keys(selfIntersections).length !== 0) {
                    return;
                }

                // find all intersections with contour
                const contourIntersection = filterIntersections(
                    [[prevX, prevY], [x, y]],
                    getAllIntersections([[prevX, prevY], [x, y]], contourSegments),
                );

                const numberOfIntersections = Object.keys(contourIntersection).length;
                if (!slipping && numberOfIntersections !== 0) {
                    // shape was clicked with intersections (via out of contour trajectory)
                    // not allowed
                    return;
                }

                if (numberOfIntersections === 0 && event.target === this.shapeContour.node) {
                    // mousemove over the shape, left new point
                    click(event);
                } else if (numberOfIntersections === 1 && points.length > 2) {
                    // maybe out of contour, maybe within
                    // require at least one more intermediate points in this case
                    click(event);
                } else {
                    return;
                }

                if (this.enabled) {
                    // check if slicing is still enabled
                    // because click() may finish slicing from inside
                    // e.g. when click out of contour with enabled shift
                    points.push([x, y]);
                    this.slicingLine.plot(stringifyPoints(points.flat()));
                }
            }
        };

        const handleCanvasMousemove = (event: MouseEvent): void => {
            if (points.length) {
                const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
                const [prevX, prevY] = points[points.length - 2];
                points[points.length - 1] = [x, y];

                if (event.shiftKey) {
                    const d = Math.sqrt((prevX - x) ** 2 + (prevY - y) ** 2);
                    const threshold = 10 / this.geometry.scale;
                    if (d > threshold) {
                        handleShapeMousedown(event, true);
                    }
                } else {
                    this.slicingLine.plot(stringifyPoints(points.flat()));
                }
            }
        };

        this.shapeContour.on('mousedown.slice', handleShapeMousedown);
        this.canvas.on('mousedown.slice', handleCanvasMousedown);
        this.canvas.on('mousemove.slice', handleCanvasMousemove);
    }

    private release(): void {
        this.objectSelector.disable();
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.showObject(clientIDs);
        });

        if (this.slicingLine) {
            this.slicingLine.remove();
            this.slicingLine = null;
        }

        if (this.shapeContour) {
            this.shapeContour.off('mousedown.slice');
            this.shapeContour.remove();
            this.shapeContour = null;
        }

        this.slicingPoints.forEach((circle) => {
            circle.remove();
        });
        this.slicingPoints = [];

        this.canvas.off('mousedown.slice');
        this.canvas.off('mousemove.slice');
        this.enabled = false;
        this.onSliceDone();
        this.onMessage(null, 'slice');
    }

    public slice(sliceData: SliceData): void {
        const initializeWithContour = (state: any): void => {
            this.startTimestamp = Date.now();
            const { startTimestamp } = this;

            this.onMessage([{
                type: 'text',
                content: 'Getting shape contour',
                icon: 'loading',
            }], 'force');

            sliceData.getContour(state).then((contour) => {
                const { shapeType } = state;
                if (this.startTimestamp === startTimestamp && this.enabled) {
                    // checking if a user does not left mode / reinit it
                    this.initialize({
                        enabled: true,
                        contour,
                        state,
                        shapeType,
                    });
                }
            }).catch((error: unknown) => {
                this.release();
                this.onError(error);
            });
        };

        if (sliceData.enabled && !this.enabled && sliceData.getContour) {
            this.enabled = true;
            if (sliceData.clientID) {
                const state = this.getObjects().find((_state) => _state.clientID === sliceData.clientID);
                if (state && state.objectType === 'shape' &&
                    ['polygon', 'mask'].includes(state.shapeType)) {
                    initializeWithContour(state);
                    return;
                }
            }

            this.onMessage([{
                type: 'text',
                content: 'Click a mask or polygon shape you would like to slice',
                icon: 'info',
            }], 'slice');

            this.objectSelector.enable(([state]) => {
                this.objectSelector.disable();
                initializeWithContour(state);
            }, { maxCount: 1, shapeType: ['polygon', 'mask'], objectType: ['shape'] });
        } else if (this.enabled && !sliceData.enabled) {
            this.release();
        }
    }

    public cancel(): void {
        if (this.enabled) {
            this.release();
        }
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        if (this.slicingLine) {
            this.slicingLine.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale });
        }

        if (this.shapeContour) {
            this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale });
        }

        this.slicingPoints.forEach((point) => {
            point.radius(this.controlPointSize / geometry.scale);
            point.attr('stroke-width', consts.BASE_STROKE_WIDTH / this.geometry.scale);
        });
    }

    public configurate(config: Configuration): void {
        this.controlPointSize = config.controlPointsSize || consts.BASE_POINT_SIZE;
        this.outlinedBorders = config.outlinedBorders || 'black';
        if (this.slicingLine) this.slicingLine.attr('stroke', this.outlinedBorders);
        if (this.shapeContour) this.shapeContour.attr('stroke', this.outlinedBorders);
    }
}
