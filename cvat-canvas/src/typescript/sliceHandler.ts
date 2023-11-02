// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import {
    stringifyPoints, translateToCanvas, translateFromCanvas, translateToSVG, findIntersection,
} from './shared';
import { Geometry, SliceData, Configuration } from './canvasModel';
import consts from './consts';

export interface SliceHandler {
    slice(sliceData: any): void;
    transform(geometry: Geometry): void;
    configurate(config: Configuration): void;
    cancel(): void;
}

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

export class SliceHandlerImpl implements SliceHandler {
    private canvas: SVG.Container;
    private start: number;
    private outlinedBorders: string;
    private shapeBodyOpacity: number;
    private sliceData: Required<SliceData> | null;
    private shapeBody: SVG.Polygon | null;
    private shapeContour: SVG.PolyLine | null;
    private slicingLine: SVG.PolyLine | null;
    private hideObject: (clientID: number) => void;
    private showObject: (clientID: number) => void;
    private onSliceDone: (clientID: number, fragments: number[][], duration: number) => void;
    private geometry: Geometry;
    private hiddenClientIDs: number[];

    public constructor(
        hideObject: SliceHandlerImpl['hideObject'],
        showObject: SliceHandlerImpl['showObject'],
        onSliceDone: SliceHandlerImpl['onSliceDone'],
        geometry: Geometry,
        canvas: SVG.Container,
    ) {
        this.hideObject = hideObject;
        this.showObject = showObject;
        this.onSliceDone = onSliceDone;
        this.geometry = geometry;
        this.canvas = canvas;
        this.sliceData = null;
        this.start = Date.now();
        this.outlinedBorders = 'black';
        this.shapeBodyOpacity = 0.5;
        this.shapeContour = null;
        this.shapeBody = null;
        this.slicingLine = null;
        this.hiddenClientIDs = [];
    }

    private initialize(sliceData: Required<SliceData>): void {
        this.sliceData = { ...sliceData, contour: [...sliceData.contour] };
        this.hiddenClientIDs = (this.canvas.select('.cvat_canvas_shape') as any).members
            .map((shape) => +shape.attr('clientID'));
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.hideObject(clientIDs);
        });

        this.start = Date.now();

        const translatedContour = translateToCanvas(this.geometry.offset, sliceData.contour);
        this.shapeBody = this.canvas.polygon(stringifyPoints(translatedContour));
        this.shapeBody.addClass('cvat_canvas_sliced_body');
        this.shapeBody.attr({ 'stroke-width': 0 });
        this.shapeBody.attr({ 'fill-opacity': this.shapeBodyOpacity });

        this.shapeContour = this.canvas.polyline(
            stringifyPoints([...translatedContour, ...translatedContour.slice(-2)]),
        );
        this.shapeContour.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
        this.shapeContour.attr('stroke', this.outlinedBorders);
        this.shapeContour.addClass('cvat_canvas_sliced_contour');

        const points: [number, number][] = [];
        const intermediatePoints: [number, number][] = []; // points between first and last intersection

        // todo: check the contour to be correct (number of poits and not to have dublicate points)
        const contourSegments = translatedContour.reduce<Segment[]>((acc, val, idx, arr) => {
            if (idx % 2 !== 0) {
                if (idx === arr.length - 1) {
                    acc.push([[arr[idx - 1], val], [arr[0], arr[1]]]);
                } else {
                    acc.push([[arr[idx - 1], val], [arr[idx + 1], arr[idx + 2]]]);
                }
            }
            return acc;
        }, []);

        // contour index, intersection point. Order is important
        const contoursIntersections: Record<string, [number, number]> = {};
        this.canvas.on('mousedown.slice', (event: MouseEvent) => {
            if (event.button !== 0) return;

            const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);

            if (!this.slicingLine) {
                points.push([x, y], [x, y]);
                this.slicingLine = this.canvas.polyline(stringifyPoints(points.flat()));
                this.slicingLine.addClass('cvat_canvas_slicing_line');
                this.slicingLine.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
                this.slicingLine.attr('stroke', this.outlinedBorders);
            } else {
                points[points.length - 1] = [x, y];
                const [lastX, lastY] = points[points.length - 2];

                // check self intersection first
                let isSelfIntersection = false;
                if (points.length > 2) {
                    // if there are less then three points, self-intersection is not possible
                    const lines = points.slice(0, -2).reduce<Segment[]>((acc, [px, py], idx) => {
                        if (idx >= points.length - 1) {
                            acc.push([[px, py], [lastX, lastY]]);
                        } else {
                            acc.push([[px, py], [...points[idx + 1]]]);
                        }
                        return acc;
                    }, []);

                    lines.forEach((line, i) => {
                        const intersection = findIntersection(line, [[lastX, lastY], [x, y]]);
                        if (i === lines.length - 1) {
                            // latest line always have intersection
                            // in at least one point, so we only check match here
                            if (intersection && Number.isNaN(intersection[0]) && Number.isNaN(intersection[1])) {
                                isSelfIntersection = true;
                                console.log(`found match with line ${i}`);
                            }
                        } else if (intersection !== null) {
                            console.log(`found intersection with line ${i}`);
                            isSelfIntersection = true;
                        }
                    });
                }

                // now compute intersections with segments
                let errored = false;

                // order is not important here, because generally it is important only for intermediate points
                // but if we intersect contour twice at once, it means there was not intermediate points at all
                const newContourIntersections: Record<number, [number, number]> = {};
                contourSegments.forEach((segment, i) => {
                    const intersection = findIntersection(segment, [[lastX, lastY], [x, y]]);
                    if (intersection && Number.isNaN(intersection[0]) && Number.isNaN(intersection[1])) {
                        // match a contour segment
                        // it also means that intersect more then one contour segment
                        // so, potentially this point is not allowed
                        errored = true;
                    } else if (intersection !== null) {
                        newContourIntersections[i] = [intersection[0], intersection[1]];
                    }
                });

                const doneIntersections = Object.keys(contoursIntersections).length;
                const newIntersections = Object.keys(newContourIntersections).length;
                const totalIntersections = doneIntersections + newIntersections;

                if (!isSelfIntersection && !errored && totalIntersections <= 2) {
                    points.push([x, y]);
                    if (doneIntersections === 1) {
                        intermediatePoints.push([x, y]);
                    }

                    const intersectedSegments = Object.keys(newContourIntersections);
                    for (let i = 0; i < intersectedSegments.length; i++) {
                        // todo: check if do not intersect the same point twice
                        const intersectedSegment = intersectedSegments[i];
                        contoursIntersections[
                            `${doneIntersections + i}.${intersectedSegment}`
                        ] = newContourIntersections[intersectedSegment];
                    }
                }

                if (totalIntersections === 2) {
                    // algorithm DONE
                    const intersectedSegments = Object.keys(contoursIntersections).sort((a, b) => +a.split('.')[1] - +b.split('.')[1]);
                    const [firstSegmentKey, secondSegmentKey] = intersectedSegments;
                    const firstSegmentIdx = +firstSegmentKey.split('.')[1];
                    const secondSegmentIdx = +secondSegmentKey.split('.')[1];
                    if (firstSegmentKey === secondSegmentKey) {
                        // the same segment. Results in this case are:
                        const contour1 = [
                            ...contoursIntersections[firstSegmentKey], // first intersection
                            ...intermediatePoints.flat(), // intermediate points
                            ...contoursIntersections[secondSegmentKey], // last intersection
                        ];

                        const contour2 = [
                            ...contoursIntersections[secondSegmentKey], // last intersection
                            ...Array(contourSegments.length).map((_, idx) => {
                                if (firstSegmentIdx + idx + 1 < contourSegments.length) {
                                    return firstSegmentKey + idx + 1;
                                }

                                return firstSegmentIdx + idx + 1 - contourSegments.length;
                            }).map((idx) => contourSegments[idx][0]).flat(),
                            ...contoursIntersections[firstSegmentKey], // first intersection
                        ];

                        const p1 = contoursIntersections[secondSegmentKey];
                        const p2 = contoursIntersections[firstSegmentKey];
                        const p = [contour2[2], contour2[3]];
                        const d1 = Math.sqrt((p1[0] - p[0]) ** 2 + (p1[1] - p[1]) ** 2);
                        const d2 = Math.sqrt((p2[0] - p[0]) ** 2 + (p2[1] - p[1]) ** 2);

                        if (d2 < d1) {
                            // first intersection is closer to the first point of the following segment
                            [contour2[0]] = p2;
                            [, contour2[1]] = p2;
                            [contour2[contour2.length - 1]] = p1;
                            [, contour2[contour2.length - 2]] = p1;
                            contour2.push(...intermediatePoints.toReversed().flat());
                        } else {
                            contour2.push(...intermediatePoints.flat());
                        }

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
                            // all the following contours points until the second intersected segment  including
                            ...Array(secondSegmentIdx - firstSegmentIdx)
                                .fill(0).map((_, idx) => idx + 1 + firstSegmentIdx)
                                .map((idx) => contourSegments[idx][0]).flat(),
                            // second intersection
                            ...contoursIntersections[secondSegmentKey],
                            // intermediate points (reversed if intersections order was swopped)
                            ...(`${firstSegmentKey}` === Object.keys(contoursIntersections).find(
                                (key) => key.startsWith('0.'),
                            ).split('.')[1] ?
                                intermediatePoints : intermediatePoints.toReversed()
                            ).flat(),
                        ];

                        const contour2 = [
                            // first intersection
                            ...contoursIntersections[firstSegmentKey],
                            // all the contours points in reversed direction
                            // until the second intersected segment including
                            ...Array(contourSegments.length - (secondSegmentIdx - firstSegmentIdx))
                                .map((_, idx) => {
                                    // do not try to understand ;)
                                    // actually here we generate indexes to go the array in back way
                                    // like 3, 2, 1, 0, length - 1, length - 2, ...
                                    if (firstSegmentIdx - (idx + 1) >= 0) {
                                        return firstSegmentIdx - (idx + 1);
                                    }

                                    return contourSegments.length + firstSegmentIdx - (idx + 1);
                                })
                                .map((idx) => contourSegments[idx][1]).flat(),
                            // second intersection
                            ...contoursIntersections[secondSegmentKey],
                            // intermediate points (reversed if intersections order was swopped)
                            ...(`${firstSegmentKey}` === Object.keys(contoursIntersections).find(
                                (key) => key.startsWith('0.'),
                            ).split('.')[1] ?
                                intermediatePoints : intermediatePoints.toReversed()
                            ).flat(),
                        ];

                        this.onSliceDone(
                            sliceData.clientID,
                            [
                                translateFromCanvas(this.geometry.offset, contour1),
                                translateFromCanvas(this.geometry.offset, contour2),
                            ], Date.now() - this.start,
                        );
                    }
                }

                this.slicingLine.plot(stringifyPoints(points.flat()));
            }
        });

        this.canvas.on('mousemove.slice', (event: MouseEvent) => {
            if (this.slicingLine) {
                const [x, y] = translateToSVG(this.canvas.node as any as SVGSVGElement, [event.clientX, event.clientY]);
                points[points.length - 1] = [x, y];
                this.slicingLine.plot(stringifyPoints(points.flat()));
            }

            // todo: implement shift handle
        });
    }

    private release(): void {
        this.hiddenClientIDs.forEach((clientIDs) => {
            this.showObject(clientIDs);
        });

        if (this.slicingLine) {
            this.slicingLine.remove();
            this.slicingLine = null;
        }

        if (this.shapeContour) {
            this.shapeContour.off('mousemove');
            this.shapeContour.remove();
            this.shapeContour = null;
        }

        if (this.shapeBody) {
            this.shapeBody.remove();
            this.shapeBody = null;
        }

        this.sliceData = null;
    }

    public slice(sliceData: SliceData): void {
        if (sliceData.enabled &&
            sliceData.clientID &&
            sliceData.contour &&
            sliceData.shapeType &&
            !this.sliceData?.enabled
        ) {
            this.initialize(sliceData as Required<SliceData>);
        } else if (this.sliceData?.enabled && !sliceData.enabled) {
            this.release();
        }
    }

    public cancel(): void {
        if (this.sliceData?.enabled) {
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
    }

    public configurate(config: Configuration): void {
        this.outlinedBorders = config.outlinedBorders || 'black';
        this.shapeBodyOpacity = config.selectedShapeOpacity || this.shapeBodyOpacity;
        if (this.shapeBody) this.shapeBody.attr('fill-opacity', this.shapeBodyOpacity)
        if (this.slicingLine) this.slicingLine.attr('stroke', this.outlinedBorders);
        if (this.shapeContour) this.shapeContour.attr('stroke', this.outlinedBorders);
    }
}
