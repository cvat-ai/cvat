// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';

export interface ShapeSizeElement {
    sizeElement: any;
    update(shape: SVG.Shape): void;
    rm(): void;
}

export interface Box {
    xtl: number;
    ytl: number;
    xbr: number;
    ybr: number;
}

export interface BBox {
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface Point {
    x: number;
    y: number;
}

interface Vector2D {
    i: number;
    j: number;
}

export interface DrawnState {
    clientID: number;
    outside?: boolean;
    occluded?: boolean;
    hidden?: boolean;
    lock: boolean;
    source: 'AUTO' | 'SEMI-AUTO' | 'MANUAL' | 'FILE';
    shapeType: string;
    points?: number[];
    rotation: number;
    attributes: Record<number, string>;
    descriptions: string[];
    zOrder?: number;
    pinned?: boolean;
    updated: number;
    frame: number;
    label: any;
    group: any;
    color: string;
    elements: DrawnState[] | null;
}

// Translate point array from the canvas coordinate system
// to the coordinate system of a client
export function translateFromSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = svg.getScreenCTM() as DOMMatrix;
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length - 1; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

// Translate point array from the coordinate system of a client
// to the canvas coordinate system
export function translateToSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = (svg.getScreenCTM() as DOMMatrix).inverse();
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

export function displayShapeSize(shapesContainer: SVG.Container, textContainer: SVG.Container): ShapeSizeElement {
    const shapeSize: ShapeSizeElement = {
        sizeElement: textContainer
            .text('')
            .font({
                weight: 'bolder',
            })
            .fill('white')
            .addClass('cvat_canvas_text'),
        update(shape: SVG.Shape): void {
            let text = `${Math.round(shape.width())}x${Math.round(shape.height())}px`;
            if (shape.type === 'rect' || shape.type === 'ellipse') {
                let rotation = shape.transform().rotation || 0;
                // be sure, that rotation in range [0; 360]
                while (rotation < 0) rotation += 360;
                rotation %= 360;
                if (rotation) {
                    text = `${text} ${rotation.toFixed(1)}\u00B0`;
                }
            }
            const [x, y, cx, cy]: number[] = translateToSVG(
                (textContainer.node as any) as SVGSVGElement,
                translateFromSVG((shapesContainer.node as any) as SVGSVGElement, [
                    shape.x(),
                    shape.y(),
                    shape.cx(),
                    shape.cy(),
                ]),
            ).map((coord: number): number => Math.round(coord));
            this.sizeElement
                .clear()
                .plain(text)
                .move(x + consts.TEXT_MARGIN, y + consts.TEXT_MARGIN)
                .rotate(shape.transform().rotation, cx, cy);
        },
        rm(): void {
            if (this.sizeElement) {
                this.sizeElement.remove();
                this.sizeElement = null;
            }
        },
    };

    return shapeSize;
}

export function rotate2DPoints(cx: number, cy: number, angle: number, points: number[]): number[] {
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const result = [];
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        result.push(
            (x - cx) * cos - (y - cy) * sin + cx,
            (y - cy) * cos + (x - cx) * sin + cy,
        );
    }

    return result;
}

export function pointsToNumberArray(points: string | Point[]): number[] {
    if (Array.isArray(points)) {
        return points.reduce((acc: number[], point: Point): number[] => {
            acc.push(point.x, point.y);
            return acc;
        }, []);
    }

    return points
        .trim()
        .split(/[,\s]+/g)
        .map((coord: string): number => +coord);
}

export function parsePoints(source: string | number[]): Point[] {
    if (Array.isArray(source)) {
        return source.reduce((acc: Point[], _: number, index: number): Point[] => {
            if (index % 2) {
                acc.push({
                    x: source[index - 1],
                    y: source[index],
                });
            }

            return acc;
        }, []);
    }

    return source
        .trim()
        .split(/\s/)
        .map(
            (point: string): Point => {
                const [x, y] = point.split(',').map((coord: string): number => +coord);
                return { x, y };
            },
        );
}

export function readPointsFromShape(shape: SVG.Shape): number[] {
    let points = null;
    if (shape.type === 'ellipse') {
        const [rx, ry] = [+shape.attr('rx'), +shape.attr('ry')];
        const [cx, cy] = [shape.cx(), shape.cy()];
        points = `${cx},${cy} ${cx + rx},${cy - ry}`;
    } else if (shape.type === 'rect') {
        points = `${shape.attr('x')},${shape.attr('y')} ` +
            `${shape.attr('x') + shape.attr('width')},${shape.attr('y') + shape.attr('height')}`;
    } else if (shape.type === 'circle') {
        points = `${shape.cx()},${shape.cy()}`;
    } else {
        points = shape.attr('points');
    }

    return pointsToNumberArray(points);
}

export function stringifyPoints(points: number[]): string;
export function stringifyPoints(points: Point[]): string;
export function stringifyPoints(points: (Point | number)[]): string {
    if (typeof points[0] === 'number') {
        return points.reduce((acc: string, val: number, idx: number): string => {
            if (idx % 2) {
                return `${acc},${val}`;
            }

            return `${acc} ${val}`.trim();
        }, '');
    }
    return points.map((point: Point): string => `${point.x},${point.y}`).join(' ');
}

export function clamp(x: number, min: number, max: number): number {
    return Math.min(Math.max(x, min), max);
}

export function scalarProduct(a: Vector2D, b: Vector2D): number {
    return a.i * b.i + a.j * b.j;
}

export function vectorLength(vector: Vector2D): number {
    const sqrI = vector.i ** 2;
    const sqrJ = vector.j ** 2;
    return Math.sqrt(sqrI + sqrJ);
}

export function translateToCanvas(offset: number, points: number[]): number[] {
    return points.map((coord: number): number => coord + offset);
}

export function translateFromCanvas(offset: number, points: number[]): number[] {
    return points.map((coord: number): number => coord - offset);
}

export function computeWrappingBox(points: number[], margin = 0): Box & BBox {
    let xtl = Number.MAX_SAFE_INTEGER;
    let ytl = Number.MAX_SAFE_INTEGER;
    let xbr = Number.MIN_SAFE_INTEGER;
    let ybr = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < points.length; i += 2) {
        const [x, y] = [points[i], points[i + 1]];
        xtl = Math.min(xtl, x);
        ytl = Math.min(ytl, y);
        xbr = Math.max(xbr, x);
        ybr = Math.max(ybr, y);
    }

    const box = {
        xtl: xtl - margin,
        ytl: ytl - margin,
        xbr: xbr + margin,
        ybr: ybr + margin,
    };

    return {
        ...box,
        x: box.xtl,
        y: box.ytl,
        width: box.xbr - box.xtl,
        height: box.ybr - box.ytl,
    };
}

export function getSkeletonEdgeCoordinates(edge: SVG.Line): {
    x1: number, y1: number, x2: number, y2: number
} {
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;

    const parent = edge.parent() as any as SVG.G;
    if (parent.type !== 'g') {
        throw new Error('Edge parent must be a group');
    }

    const dataNodeFrom = edge.attr('data-node-from');
    const dataNodeTo = edge.attr('data-node-to');
    const nodeFrom = parent.children()
        .find((element: SVG.Element): boolean => element.attr('data-node-id') === dataNodeFrom);
    const nodeTo = parent.children()
        .find((element: SVG.Element): boolean => element.attr('data-node-id') === dataNodeTo);

    if (!nodeFrom || !nodeTo) {
        throw new Error(`Edge's nodeFrom ${dataNodeFrom} or nodeTo ${dataNodeTo} do not to refer to any node`);
    }

    x1 = nodeFrom.cx();
    y1 = nodeFrom.cy();
    x2 = nodeTo.cx();
    y2 = nodeTo.cy();

    if (nodeFrom.hasClass('cvat_canvas_hidden') || nodeTo.hasClass('cvat_canvas_hidden')) {
        edge.addClass('cvat_canvas_hidden');
    } else {
        edge.removeClass('cvat_canvas_hidden');
    }

    if (nodeFrom.hasClass('cvat_canvas_shape_occluded') || nodeTo.hasClass('cvat_canvas_shape_occluded')) {
        edge.addClass('cvat_canvas_shape_occluded');
    }

    if ([x1, y1, x2, y2].some((coord: number): boolean => typeof coord !== 'number')) {
        throw new Error(`Edge coordinates must be numbers, got [${x1}, ${y1}, ${x2}, ${y2}]`);
    }

    return {
        x1, y1, x2, y2,
    };
}

export function makeSVGFromTemplate(template: string): SVG.G {
    const SVGElement = new SVG.G();
    /* eslint-disable-next-line no-unsanitized/property */
    SVGElement.node.innerHTML = template;
    return SVGElement;
}

export function setupSkeletonEdges(skeleton: SVG.G, referenceSVG: SVG.G): void {
    for (const child of referenceSVG.children()) {
        // search for all edges on template
        const dataType = child.attr('data-type');
        if (child.type === 'line' && dataType === 'edge') {
            const dataNodeFrom = child.attr('data-node-from');
            const dataNodeTo = child.attr('data-node-to');
            if (!Number.isInteger(dataNodeFrom) || !Number.isInteger(dataNodeTo)) {
                throw new Error(`Edge nodeFrom and nodeTo must be numbers, got ${dataNodeFrom}, ${dataNodeTo}`);
            }

            // try to find the same edge on the skeleton
            let edge = skeleton.children().find((_child: SVG.Element) => (
                _child.attr('data-node-from') === dataNodeFrom && _child.attr('data-node-to') === dataNodeTo
            )) as SVG.Line;

            // if not found, lets create it
            if (!edge) {
                edge = skeleton.line(0, 0, 0, 0).attr({
                    'data-node-from': dataNodeFrom,
                    'data-node-to': dataNodeTo,
                    'stroke-width': 'inherit',
                }).addClass('cvat_canvas_skeleton_edge') as SVG.Line;
            }

            skeleton.node.prepend(edge.node);
            const points = getSkeletonEdgeCoordinates(edge);
            edge.attr({ ...points, 'stroke-width': 'inherit' });
        }
    }
}

export function imageDataToDataURL(
    imageBitmap: Uint8ClampedArray,
    width: number,
    height: number,
    handleResult: (dataURL: string) => Promise<void>,
): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    canvas.getContext('2d').putImageData(
        new ImageData(imageBitmap, width, height), 0, 0,
    );

    canvas.toBlob((blob) => {
        const dataURL = URL.createObjectURL(blob);
        handleResult(dataURL).finally(() => {
            URL.revokeObjectURL(dataURL);
        });
    }, 'image/png');
}

export function zipChannels(imageData: Uint8ClampedArray): number[] {
    const rle = [];

    let prev = 0;
    let summ = 0;
    for (let i = 3; i < imageData.length; i += 4) {
        const alpha = imageData[i] > 0 ? 1 : 0;
        if (prev !== alpha) {
            rle.push(summ);
            prev = alpha;
            summ = 1;
        } else {
            summ++;
        }
    }

    rle.push(summ);
    return rle;
}

export function expandChannels(r: number, g: number, b: number, encoded: number[]): Uint8ClampedArray {
    function rle2Mask(rle: number[], width: number, height: number): Uint8ClampedArray {
        const decoded = new Uint8ClampedArray(width * height * 4).fill(0);
        const { length } = rle;
        let decodedIdx = 0;
        let value = 0;
        let i = 0;

        while (i < length - 4) {
            let count = rle[i];
            while (count > 0) {
                decoded[decodedIdx + 0] = r;
                decoded[decodedIdx + 1] = g;
                decoded[decodedIdx + 2] = b;
                decoded[decodedIdx + 3] = value * 255;
                decodedIdx += 4;
                count--;
            }
            i++;
            value = Math.abs(value - 1);
        }

        return decoded;
    }

    const [left, top, right, bottom] = encoded.slice(-4);
    return rle2Mask(encoded, right - left + 1, bottom - top + 1);
}

export function findIntersection(seg1: Segment, seg2: Segment): [number, number] | null {
    const determinant2D = (a: number, b: number, c: number, d: number): number => a * d - b * c;
    const numberIsBetween = (a: number, b: number, c: number): boolean => Math.min(a, b) <= c && c <= Math.max(a, b);
    const projectionIntersected = (a: number, b: number, c: number, d: number): boolean => {
        let [p1, p2] = [a, b];
        let [p3, p4] = [c, d];

        if (p1 > p2) {
            [p1, p2] = [p2, p1];
        }

        if (p3 > p4) {
            [p3, p4] = [p4, p3];
        }

        return Math.max(p1, p3) <= Math.min(p2, p4);
    };

    const [[x1, y1], [x2, y2]] = seg1;
    const [[x3, y3], [x4, y4]] = seg2;
    const A1 = y1 - y2;
    const A2 = y3 - y4;
    const B1 = x2 - x1;
    const B2 = x4 - x3;
    const C1 = -A1 * x1 - B1 * y1;
    const C2 = -A2 * x3 - B2 * y3;
    const determinant = determinant2D(A1, B1, A2, B2);
    if (determinant === 0) {
        if (
            determinant2D(A1, C1, A2, C2) === 0 &&
            determinant2D(B1, C1, B2, C2) === 0 &&
            projectionIntersected(x1, x2, x3, x4) &&
            projectionIntersected(y1, y2, y3, y4)
        ) {
            // lines match
            return [NaN, NaN];
        }

        // lines are parallel
        return null;
    }

    const x = -determinant2D(C1, B1, C2, B2) / determinant;
    const y = -determinant2D(A1, C1, A2, C2) / determinant;
    if (numberIsBetween(x1, x2, x) &&
        numberIsBetween(y1, y2, y) &&
        numberIsBetween(x3, x4, x) &&
        numberIsBetween(y3, y4, y)
    ) {
        return [x, y];
    }

    return null;
}

export function findClosestPointOnSegment(
    segment: [[number, number], [number, number]],
    point: [number, number],
): [number, number] {
    const numberIsBetween = (a: number, b: number, c: number): boolean => Math.min(a, b) <= c && c <= Math.max(a, b);
    const [[x1, y1], [x2, y2]] = segment;
    const [x3, y3] = point;

    const x = (x1 * x1 * x3 - 2 * x1 * x2 * x3 + x2 * x2 * x3 + x2 *
        (y1 - y2) * (y1 - y3) - x1 * (y1 - y2) * (y2 - y3)) /
        ((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    const y = (x2 * x2 * y1 + x1 * x1 * y2 + x2 * x3 * (y2 - y1) - x1 *
        (x3 * (y2 - y1) + x2 * (y1 + y2)) + (y1 - y2) * (y1 - y2) * y3) /
        ((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

    if (numberIsBetween(x1, x2, x) && numberIsBetween(y1, y2, y)) {
        return [x, y];
    }

    // perpendicular point is not on the segment
    // shortest distance is distance to one of edge points
    const d1 = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    const d2 = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);

    if (d1 < d2) {
        return [x1, y1];
    }

    return [x2, y2];
}

export function segmentsFromPoints(points: number[], circuit = false): Segment[] {
    return points.reduce<Segment[]>((acc, val, idx, arr) => {
        if (idx % 2 !== 0) {
            if (idx === arr.length - 1) {
                if (circuit) {
                    acc.push([[arr[idx - 1], val], [arr[0], arr[1]]]);
                }
            } else {
                acc.push([[arr[idx - 1], val], [arr[idx + 1], arr[idx + 2]]]);
            }
        }
        return acc;
    }, []);
}

export function toReversed<T>(array: Array<T>): Array<T> {
    // actually toReversed already exists in ESMA specification
    // but not all CVAT customers uses a browser fresh enough to use it
    // instead of using a library with polyfills I will prefer just to rewrite it with reduceRight
    return array.reduceRight<Array<T>>((acc, val: T) => {
        acc.push(val);
        return acc;
    }, []);
}

export type Segment = [[number, number], [number, number]];
export type PropType<T, Prop extends keyof T> = T[Prop];
