// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { DataError, ArgumentError } from './exceptions';
import { Attribute } from './labels';
import { ShapeType, AttributeType } from './enums';

export function checkNumberOfPoints(shapeType: ShapeType, points: number[]): void {
    if (shapeType === ShapeType.RECTANGLE) {
        if (points.length / 2 !== 2) {
            throw new DataError(`Rectangle must have 2 points, but got ${points.length / 2}`);
        }
    } else if (shapeType === ShapeType.POLYGON) {
        if (points.length / 2 < 3) {
            throw new DataError(`Polygon must have at least 3 points, but got ${points.length / 2}`);
        }
    } else if (shapeType === ShapeType.POLYLINE) {
        if (points.length / 2 < 2) {
            throw new DataError(`Polyline must have at least 2 points, but got ${points.length / 2}`);
        }
    } else if (shapeType === ShapeType.POINTS) {
        if (points.length / 2 < 1) {
            throw new DataError(`Points must have at least 1 points, but got ${points.length / 2}`);
        }
    } else if (shapeType === ShapeType.CUBOID) {
        if (points.length / 2 !== 8) {
            throw new DataError(`Cuboid must have 8 points, but got ${points.length / 2}`);
        }
    } else if (shapeType === ShapeType.ELLIPSE) {
        if (points.length / 2 !== 2) {
            throw new DataError(`Ellipse must have 1 point, rx and ry but got ${points.toString()}`);
        }
    } else if (shapeType === ShapeType.MASK) {
        const [left, top, right, bottom] = points.slice(-4);
        const [width, height] = [right - left, bottom - top];
        if (width < 0 || !Number.isInteger(width) || height < 0 || !Number.isInteger(height)) {
            throw new DataError(`Mask width, height must be positive integers, but got ${width}x${height}`);
        }

        if (points.length !== width * height + 4) {
            throw new DataError(`Points array must have length ${width}x${height} + 4, got ${points.length}`);
        }
    } else {
        throw new ArgumentError(`Unknown value of shapeType has been received ${shapeType}`);
    }
}

export function attrsAsAnObject(attributes: Attribute[]): Record<number, Attribute> {
    return attributes.reduce((accumulator, value) => {
        accumulator[value.id] = value;
        return accumulator;
    }, {});
}

export function findAngleDiff(rightAngle: number, leftAngle: number): number {
    let angleDiff = rightAngle - leftAngle;
    angleDiff = ((angleDiff + 180) % 360) - 180;
    if (Math.abs(angleDiff) >= 180) {
        // if the main arc is bigger than 180, go another arc
        // to find it, just substract absolute value from 360 and inverse sign
        angleDiff = 360 - Math.abs(angleDiff) * Math.sign(angleDiff) * -1;
    }
    return angleDiff;
}

export function checkShapeArea(shapeType: ShapeType, points: number[]): boolean {
    const MIN_SHAPE_LENGTH = 3;
    const MIN_SHAPE_AREA = 9;
    const MIN_MASK_SHAPE_AREA = 1;

    if (shapeType === ShapeType.POINTS) {
        return true;
    }

    if (shapeType === ShapeType.MASK) {
        const [left, top, right, bottom] = points.slice(-4);
        const area = (right - left + 1) * (bottom - top + 1);
        return area >= MIN_MASK_SHAPE_AREA;
    }

    if (shapeType === ShapeType.ELLIPSE) {
        const [cx, cy, rightX, topY] = points;
        const [rx, ry] = [rightX - cx, cy - topY];
        return rx * ry * Math.PI > MIN_SHAPE_AREA;
    }

    let xmin = Number.MAX_SAFE_INTEGER;
    let xmax = Number.MIN_SAFE_INTEGER;
    let ymin = Number.MAX_SAFE_INTEGER;
    let ymax = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < points.length - 1; i += 2) {
        xmin = Math.min(xmin, points[i]);
        xmax = Math.max(xmax, points[i]);
        ymin = Math.min(ymin, points[i + 1]);
        ymax = Math.max(ymax, points[i + 1]);
    }

    if (shapeType === ShapeType.POLYLINE) {
        const length = Math.max(xmax - xmin, ymax - ymin);
        return length >= MIN_SHAPE_LENGTH;
    }

    const area = (xmax - xmin) * (ymax - ymin);
    return area >= MIN_SHAPE_AREA;
}

export function rotatePoint(x: number, y: number, angle: number, cx = 0, cy = 0): number[] {
    const sin = Math.sin((angle * Math.PI) / 180);
    const cos = Math.cos((angle * Math.PI) / 180);
    const rotX = (x - cx) * cos - (y - cy) * sin + cx;
    const rotY = (y - cy) * cos + (x - cx) * sin + cy;
    return [rotX, rotY];
}

export function computeWrappingBox(points: number[], margin = 0): {
    xtl: number;
    ytl: number;
    xbr: number;
    ybr: number;
    x: number;
    y: number;
    width: number;
    height: number;
} {
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

export function validateAttributeValue(value: string, attr: Attribute): boolean {
    const { values } = attr;
    const type = attr.inputType;

    if (typeof value !== 'string') {
        throw new ArgumentError(`Attribute value is expected to be string, but got ${typeof value}`);
    }

    if (type === AttributeType.NUMBER) {
        return +value >= +values[0] && +value <= +values[1];
    }

    if (type === AttributeType.CHECKBOX) {
        return ['true', 'false'].includes(value.toLowerCase());
    }

    if (type === AttributeType.TEXT) {
        return true;
    }

    return values.includes(value);
}

export function truncateMask(points: number[], _: number, width: number, height: number): number[] {
    const [currentLeft, currentTop, currentRight, currentBottom] = points.slice(-4);
    const [currentWidth, currentHeight] = [currentRight - currentLeft + 1, currentBottom - currentTop + 1];

    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;
    let atLeastOnePixel = false;
    const truncatedPoints = [];

    for (let y = 0; y < currentHeight; y++) {
        const absY = y + currentTop;

        for (let x = 0; x < currentWidth; x++) {
            const absX = x + currentLeft;
            const offset = y * currentWidth + x;

            if (absX >= width || absY >= height || absX < 0 || absY < 0) {
                points[offset] = 0;
            }

            if (points[offset]) {
                atLeastOnePixel = true;
                left = Math.min(left, absX);
                top = Math.min(top, absY);
                right = Math.max(right, absX);
                bottom = Math.max(bottom, absY);
            }
        }
    }

    if (!atLeastOnePixel) {
        // if mask is empty, set its size as 0
        left = 0;
        top = 0;
    }

    // TODO: check corner case when right = left = 0
    const [newWidth, newHeight] = [right - left + 1, bottom - top + 1];
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const leftDiff = left - currentLeft;
            const topDiff = top - currentTop;
            const offset = (y + topDiff) * currentWidth + (x + leftDiff);
            truncatedPoints.push(points[offset]);
        }
    }

    truncatedPoints.push(left, top, right, bottom);
    if (!checkShapeArea(ShapeType.MASK, truncatedPoints)) {
        return [];
    }

    return truncatedPoints;
}

export function mask2Rle(mask: number[]): number[] {
    return mask.reduce((acc, val, idx, arr) => {
        if (idx > 0) {
            if (arr[idx - 1] === val) {
                acc[acc.length - 1] += 1;
            } else {
                acc.push(1);
            }

            return acc;
        }

        if (val > 0) {
            // 0, 0, 0, 1 => [3, 1]
            // 1, 1, 0, 0 => [0, 2, 2]
            acc.push(0, 1);
        } else {
            acc.push(1);
        }

        return acc;
    }, []);
}

export function rle2Mask(rle: number[], width: number, height: number): number[] {
    const decoded = Array(width * height).fill(0);
    const { length } = rle;
    let decodedIdx = 0;
    let value = 0;
    let i = 0;

    while (i < length) {
        let count = rle[i];
        while (count > 0) {
            decoded[decodedIdx] = value;
            decodedIdx++;
            count--;
        }
        i++;
        value = Math.abs(value - 1);
    }

    return decoded;
}
