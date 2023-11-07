// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import {
    stringifyPoints, translateToCanvas, translateFromCanvas, translateToSVG,
    findIntersection, zipChannels, Segment, findClosestPointOnSegment, segmentsFromPoints,
} from './shared';
import { Geometry, SliceData, Configuration } from './canvasModel';
import consts from './consts';
import { ObjectSelector } from './objectSelector';

export interface SliceHandler {
    slice(sliceData: any): void;
    transform(geometry: Geometry): void;
    configurate(config: Configuration): void;
    cancel(): void;
}

type EnhancedSliceData = Omit<Required<SliceData> & {
    contour: number[];
    shapeType: 'mask' | 'polygon';
}, 'getContour'>;

// function triangleArea([x0, y0]: number[], [x1, y1]: number[], [x2, y2]: number[]): number {
//     return (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
// }

// function checkPointsIntersection(x0: number, x1: number, x2: number, x3: number): boolean {
//     if (x0 > x1) {
//         [x0, x1] = [x1, x0];
//     }

//     if (x2 > x3) {
//         [x2, x3] = [x3, x2];
//     }

//     // <= if consider intersection in one point, false in our case since we have polyline
//     return Math.max(x0, x2) < Math.min(x1, x3);
// }

// function intersect([x0, y0]: number[], [x1, y1]: number[], [x2, y2]: number[], [x3, y3]: number[]): boolean {
//     // <= if consider intersection in one point, false in our case since we have polyline
//     return checkPointsIntersection(x0, x1, x2, x3) &&
//         checkPointsIntersection(y0, y1, y2, y3) &&
//         triangleArea([x0, y0], [x1, y1], [x2, y2]) * triangleArea([x0, y0], [x1, y1], [x3, y3]) < 0 &&
//         triangleArea([x2, y2], [x3, y3], [x0, y0]) * triangleArea([x2, y2], [x3, y3], [x1, y1]) < 0;
// }

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
    private start: number;
    private controlPointSize: number;
    private outlinedBorders: string;
    private enabled: boolean;
    private shapeContour: SVG.PolyLine | null;
    private slicingLine: SVG.PolyLine | null;
    private slicingPoints: SVG.Circle[];
    private hideObject: (clientID: number) => void;
    private showObject: (clientID: number) => void;
    private onSliceDone: (clientID?: number, fragments?: number[][], duration?: number) => void;
    private onMessage: ({ lines, type }: {
        lines?: { text: string, type?: string, style?: CSSStyleDeclaration }[],
        type?: 'info' | 'loading'
    }) => void;
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
        this.start = Date.now();
        this.controlPointSize = consts.BASE_POINT_SIZE;
        this.outlinedBorders = 'black';
        this.shapeContour = null;
        this.slicingPoints = [];
        this.slicingLine = null;
        this.objectSelector = objectSelector;
        this.hiddenClientIDs = [];
    }

    private initialize(sliceData: EnhancedSliceData): void {
        this.onMessage({
            lines: [{ text: 'Set initial point on the shape contour' }],
            type: 'info',
        });
        this.hiddenClientIDs = (this.canvas.select('.cvat_canvas_shape') as any).members
            .map((shape) => +shape.attr('clientID')).filter((clientID: number) => clientID !== sliceData.clientID);
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.hideObject(clientIDs);
        });

        const translatedContour = translateToCanvas(this.geometry.offset, sliceData.contour);
        this.shapeContour = this.canvas.polygon(stringifyPoints(translatedContour));
        this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
        this.shapeContour.attr('stroke', this.outlinedBorders);
        this.shapeContour.addClass('cvat_canvas_sliced_contour');

        // todo: check the contour to be correct (number of points and not to have dublicate points)
        const contourSegments = segmentsFromPoints(translatedContour, true);
        let points: [number, number][] = [];
        let contoursIntersections: Record<string, [number, number]> = {};

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

            const THRESHOLD = 10 / this.geometry.scale;
            if (shortestDistance <= THRESHOLD) {
                points.push([...closestPoint], [...closestPoint]);
                contoursIntersections[`0.${segmentIdx}`] = closestPoint;
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
                this.onMessage({
                    lines: [
                        { text: 'Set more points within the shape contour, if necessary. Intersect contour at another point to slice' },
                        { text: ' • Line must not intersect itself', type: 'warning' },
                        { text: ' • Line must not intersect contour more than twice', type: 'warning' },
                    ],
                    type: 'info',
                });
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

            points.push([x, y]);
            this.slicingLine.plot(stringifyPoints(points.flat()));

            if (numberOfIntersections === 1) {
                const [segmentIdx] = Object.keys(intersections);
                contoursIntersections[`1.${segmentIdx}`] = intersections[segmentIdx];
                points.pop();
                const intermediatePoints: [number, number][] = points.slice(1, -1);
                const intersectedSegments = Object.keys(contoursIntersections).sort((a, b) => +a.split('.')[1] - +b.split('.')[1]);
                const [firstSegmentKey, secondSegmentKey] = intersectedSegments;
                const firstSegmentIdx = +firstSegmentKey.split('.')[1];
                const secondSegmentIdx = +secondSegmentKey.split('.')[1];
                if (firstSegmentIdx === secondSegmentIdx) {
                    // the same segment. Results in this case are:
                    const contour1 = [
                        ...contoursIntersections[firstSegmentKey], // first intersection
                        ...(`${firstSegmentIdx}` === Object.keys(contoursIntersections).find(
                            (key) => key.startsWith('0.'),
                        ).split('.')[1] ?
                            intermediatePoints : intermediatePoints.toReversed()
                        ).flat(),
                        ...contoursIntersections[secondSegmentKey], // last intersection
                    ];

                    const contour2 = [
                        ...contoursIntersections[firstSegmentKey], // first intersection
                        ...(`${firstSegmentIdx}` === Object.keys(contoursIntersections).find(
                            (key) => key.startsWith('0.'),
                        ).split('.')[1] ?
                            intermediatePoints : intermediatePoints.toReversed()
                        ).flat(),
                        ...contoursIntersections[secondSegmentKey], // last intersection
                    ];

                    const otherPoints = Array(contourSegments.length).fill(0).map((_, idx) => {
                        if (firstSegmentIdx + idx < contourSegments.length) {
                            return firstSegmentIdx + idx;
                        }

                        return firstSegmentIdx + idx - contourSegments.length;
                    }).map((idx) => contourSegments[idx][1]);

                    const p1 = contoursIntersections[firstSegmentKey];
                    const p2 = contoursIntersections[secondSegmentKey];
                    const p = otherPoints[0];
                    const d1 = Math.sqrt((p1[0] - p[0]) ** 2 + (p1[1] - p[1]) ** 2);
                    const d2 = Math.sqrt((p2[0] - p[0]) ** 2 + (p2[1] - p[1]) ** 2);

                    if (d2 > d1) {
                        otherPoints.reverse();
                    }

                    contour2.push(...otherPoints.flat());

                    // contour1 = [1,2,3,4,5,6];

                    this.onSliceDone(
                        sliceData.clientID,
                        [
                            translateFromCanvas(this.geometry.offset, contour1),
                            translateFromCanvas(this.geometry.offset, contour2),
                        ], Date.now() - this.start,
                    );
                } else {
                    // intersected different segments. Results in this case are:
                    const contour1 = [
                        // first intersection
                        ...contoursIntersections[firstSegmentKey],
                        // intermediate points (reversed if intersections order was swopped)
                        ...(`${firstSegmentIdx}` === Object.keys(contoursIntersections).find(
                            (key) => key.startsWith('0.'),
                        ).split('.')[1] ?
                            intermediatePoints : intermediatePoints.toReversed()
                        ).flat(),
                        // all the following contours points until the second intersected segment  including
                        //                                 // second intersection
                        ...contoursIntersections[secondSegmentKey],
                        ...indexGenerator(contourSegments.length, secondSegmentIdx, firstSegmentIdx, 'forward')
                            .map((idx) => contourSegments[idx][1]).slice(0, -1).flat(),

                    ];

                    const contour2 = [
                        // first intersection
                        ...contoursIntersections[firstSegmentKey],
                        ...(`${firstSegmentIdx}` === Object.keys(contoursIntersections).find(
                            (key) => key.startsWith('0.'),
                        ).split('.')[1] ?
                            intermediatePoints : intermediatePoints.toReversed()
                        ).flat(),
                        ...contoursIntersections[secondSegmentKey],
                        ...indexGenerator(contourSegments.length, secondSegmentIdx, firstSegmentIdx, 'backward')
                            .map((idx) => contourSegments[idx][0]).slice(0, -1).flat(),

                        // all the contours points in reversed direction
                        // until the second intersected segment including

                        // intermediate points (reversed if intersections order was swopped)
                        // second intersection
                    ];

                    if (sliceData.shapeType === 'mask') {
                        const shape = window.document
                            .getElementById(`cvat_canvas_shape_${sliceData.clientID}`) as SVGImageElement;
                        const width = +shape.getAttribute('width');
                        const height = +shape.getAttribute('height');
                        const left = +shape.getAttribute('x');
                        const top = +shape.getAttribute('y');

                        const offscreenCanvas = new OffscreenCanvas(width, height);
                        const context = offscreenCanvas.getContext('2d');
                        context.fillStyle = 'black';
                        context.globalCompositeOperation = 'source-over';
                        context.drawImage(shape, 0, 0);
                        context.globalCompositeOperation = 'destination-in';
                        context.beginPath();
                        context.moveTo(contour1[0] - left, contour1[1] - top);
                        contour1.forEach((_, idx) => {
                            if (idx > 1 && !(idx % 2)) {
                                context.lineTo(contour1[idx] - left, contour1[idx + 1] - top);
                            }
                        });
                        context.closePath();
                        context.fill();

                        const result1 = zipChannels(context.getImageData(0, 0, width, height).data);
                        context.reset();

                        context.fillStyle = 'black';
                        context.globalCompositeOperation = 'source-over';
                        context.drawImage(shape, 0, 0);
                        context.globalCompositeOperation = 'destination-in';
                        context.beginPath();
                        context.moveTo(contour2[0] - left, contour2[1] - top);
                        contour2.forEach((_, idx) => {
                            if (idx > 1 && !(idx % 2)) {
                                context.lineTo(contour2[idx] - left, contour2[idx + 1] - top);
                            }
                        });
                        context.closePath();
                        context.fill();

                        const result2 = zipChannels(context.getImageData(0, 0, width, height).data);

                        this.onSliceDone(
                            sliceData.clientID, [result1, result2], Date.now() - this.start,
                        );
                        return;
                    }

                    this.onSliceDone(
                        sliceData.clientID,
                        [
                            translateFromCanvas(this.geometry.offset, contour1),
                            translateFromCanvas(this.geometry.offset, contour2),
                        ], Date.now() - this.start,
                    );
                }
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
                    this.slicingLine.remove();
                    points = [];
                    contoursIntersections = {};
                    this.slicingPoints = [];
                    this.slicingLine = null;
                }
            }
        };

        const handleShapeMousedown = (event: MouseEvent): void => {
            if (points.length && event.button === 0 && !event.altKey) {
                const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
                points[points.length - 1] = [x, y];

                const [prevX, prevY] = points[points.length - 2];
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
                const contourIntersection = filterIntersections(
                    [[prevX, prevY], [x, y]],
                    getAllIntersections([[prevX, prevY], [x, y]], contourSegments),
                );

                if (Object.keys(contourIntersection).length) {
                    // not allowed
                    return;
                }

                points.push([x, y]);
                this.slicingLine.plot(stringifyPoints(points.flat()));
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
                        handleShapeMousedown(event);
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
        this.onMessage({});
    }

    public slice(sliceData: SliceData): void {
        const initializeWithContour = (state: any): void => {
            this.start = Date.now();
            const { start } = this;
            this.onMessage({ lines: [{ text: 'Getting shape contour' }], type: 'loading' });
            sliceData.getContour(state).then((contour) => {
                const { clientID, shapeType } = state;
                if (this.start === start && this.enabled) {
                    // check if user does not left mode / reinit it
                    this.initialize({
                        enabled: true,
                        contour,
                        clientID,
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
                if (state) {
                    initializeWithContour(state);
                    return;
                }
            }

            this.onMessage({
                lines: [{ text: 'Click a mask/polygon shape you would like to slice' }],
                type: 'info',
            });
            this.objectSelector.enable(([state]) => {
                this.objectSelector.disable();
                initializeWithContour(state);
            }, { maxCount: 1, shapeType: ['polygon', 'mask'] });
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
