// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import consts from './consts';
import { Geometry } from './canvasModel';
import { intersection } from './cuboid';
import {
    Box, Point, clamp,
} from './shared';

export interface FinalCoordinates {
    points: number[];
    box: Box;
}

export function checkPasteConstraint(shapeType: string, points: number[], box: Box | null = null): boolean {
    if (shapeType === 'rectangle') {
        const [xtl, ytl, xbr, ybr] = points;
        const [width, height] = [xbr - xtl, ybr - ytl];
        return width >= consts.SIZE_THRESHOLD && height >= consts.SIZE_THRESHOLD;
    }

    if (shapeType === 'polygon') {
        const [width, height] = [box.xbr - box.xtl, box.ybr - box.ytl];
        return (width >= consts.SIZE_THRESHOLD || height > consts.SIZE_THRESHOLD) && points.length >= 3 * 2;
    }

    if (shapeType === 'polyline') {
        const [width, height] = [box.xbr - box.xtl, box.ybr - box.ytl];
        return (width >= consts.SIZE_THRESHOLD || height >= consts.SIZE_THRESHOLD) && points.length >= 2 * 2;
    }

    if (shapeType === 'points') {
        return points.length > 2 || (points.length === 2 && points[0] !== 0 && points[1] !== 0);
    }

    if (shapeType === 'ellipse') {
        const [width, height] = [(points[2] - points[0]) * 2, (points[1] - points[3]) * 2];
        return width >= consts.SIZE_THRESHOLD && height > consts.SIZE_THRESHOLD;
    }

    if (shapeType === 'cuboid') {
        return points.length === 4 * 2 || points.length === 8 * 2 ||
            (points.length === 2 * 2 &&
                (points[2] - points[0]) >= consts.SIZE_THRESHOLD &&
                (points[3] - points[1]) >= consts.SIZE_THRESHOLD
            );
    }

    if (shapeType === 'skeleton') {
        const [xtl, ytl, xbr, ybr] = points;
        const [width, height] = [xbr - xtl, ybr - ytl];
        return width >= consts.SIZE_THRESHOLD || height >= consts.SIZE_THRESHOLD;
    }

    return false;
}

export function getFinalEllipseCoordinates(
    points: number[],
    fitIntoFrame: boolean,
    geometry: Geometry,
): number[] {
    const { offset } = geometry;
    const [cx, cy, rightX, topY] = points.map((coord: number) => coord - offset);
    const [rx, ry] = [rightX - cx, cy - topY];
    const frameWidth = geometry.image.width;
    const frameHeight = geometry.image.height;
    const [fitCX, fitCY] = fitIntoFrame ?
        [clamp(cx, 0, frameWidth), clamp(cy, 0, frameHeight)] : [cx, cy];
    const [fitRX, fitRY] = fitIntoFrame ?
        [Math.min(rx, frameWidth - cx, cx), Math.min(ry, frameHeight - cy, cy)] : [rx, ry];
    return [fitCX, fitCY, fitCX + fitRX, fitCY - fitRY];
}

export function getFinalRectCoordinates(
    points: number[],
    fitIntoFrame: boolean,
    geometry: Geometry,
): number[] {
    const frameWidth = geometry.image.width;
    const frameHeight = geometry.image.height;
    const { offset } = geometry;

    let [xtl, ytl, xbr, ybr] = points.map((coord: number): number => coord - offset);

    if (fitIntoFrame) {
        xtl = Math.min(Math.max(xtl, 0), frameWidth);
        xbr = Math.min(Math.max(xbr, 0), frameWidth);
        ytl = Math.min(Math.max(ytl, 0), frameHeight);
        ybr = Math.min(Math.max(ybr, 0), frameHeight);
    }

    return [xtl, ytl, xbr, ybr];
}

export function getFinalPolyshapeCoordinates(
    targetPoints: number[],
    fitIntoFrame: boolean,
    shapeType: string,
    geometry: Geometry,
): FinalCoordinates {
    const { offset } = geometry;
    let points = targetPoints.map((coord: number): number => coord - offset);
    const box = {
        xtl: Number.MAX_SAFE_INTEGER,
        ytl: Number.MAX_SAFE_INTEGER,
        xbr: Number.MIN_SAFE_INTEGER,
        ybr: Number.MIN_SAFE_INTEGER,
    };

    const frameWidth = geometry.image.width;
    const frameHeight = geometry.image.height;

    enum Direction {
        Horizontal,
        Vertical,
    }

    function isBetween(x1: number, x2: number, c: number): boolean {
        return c >= Math.min(x1, x2) && c <= Math.max(x1, x2);
    }

    const isInsideFrame = (point: Point, direction: Direction): boolean => {
        if (direction === Direction.Horizontal) {
            return isBetween(0, frameWidth, point.x);
        }
        return isBetween(0, frameHeight, point.y);
    };

    const findIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): number[] => {
        const intersectionPoint = intersection(p1, p2, p3, p4);
        if (
            intersectionPoint &&
            isBetween(p1.x, p2.x, intersectionPoint.x) &&
            isBetween(p1.y, p2.y, intersectionPoint.y)
        ) {
            return [intersectionPoint.x, intersectionPoint.y];
        }
        return [];
    };

    const findIntersectionsWithFrameBorders = (p1: Point, p2: Point, direction: Direction): number[] => {
        const resultPoints = [];
        const leftLine = [
            { x: 0, y: 0 },
            { x: 0, y: frameHeight },
        ];
        const topLine = [
            { x: frameWidth, y: 0 },
            { x: 0, y: 0 },
        ];
        const rightLine = [
            { x: frameWidth, y: frameHeight },
            { x: frameWidth, y: 0 },
        ];
        const bottomLine = [
            { x: 0, y: frameHeight },
            { x: frameWidth, y: frameHeight },
        ];

        if (direction === Direction.Horizontal) {
            resultPoints.push(...findIntersection(p1, p2, leftLine[0], leftLine[1]));
            resultPoints.push(...findIntersection(p1, p2, rightLine[0], rightLine[1]));
        } else {
            resultPoints.push(...findIntersection(p1, p2, bottomLine[0], bottomLine[1]));
            resultPoints.push(...findIntersection(p1, p2, topLine[0], topLine[1]));
        }

        if (resultPoints.length === 4) {
            if (
                (p1.x === p2.x || Math.sign(resultPoints[0] - resultPoints[2]) !== Math.sign(p1.x - p2.x)) &&
                (p1.y === p2.y || Math.sign(resultPoints[1] - resultPoints[3]) !== Math.sign(p1.y - p2.y))
            ) {
                [resultPoints[0], resultPoints[2]] = [resultPoints[2], resultPoints[0]];
                [resultPoints[1], resultPoints[3]] = [resultPoints[3], resultPoints[1]];
            }
        }
        return resultPoints;
    };

    const crop = (shapePoints: number[], direction: Direction): number[] => {
        const resultPoints = [];
        const isPolyline = shapeType === 'polyline';
        const isPolygon = shapeType === 'polygon';

        for (let i = 0; i < shapePoints.length - 1; i += 2) {
            const currentPoint = { x: shapePoints[i], y: shapePoints[i + 1] };
            if (isInsideFrame(currentPoint, direction)) {
                resultPoints.push(shapePoints[i], shapePoints[i + 1]);
            }
            const isLastPoint = i === shapePoints.length - 2;
            if (isLastPoint && (isPolyline || (isPolygon && shapePoints.length === 4))) {
                break;
            }
            const nextPoint = isLastPoint ?
                { x: shapePoints[0], y: shapePoints[1] } :
                { x: shapePoints[i + 2], y: shapePoints[i + 3] };
            const intersectionPoints = findIntersectionsWithFrameBorders(currentPoint, nextPoint, direction);
            if (intersectionPoints.length !== 0) {
                resultPoints.push(...intersectionPoints);
            }
        }
        return resultPoints;
    };

    if (fitIntoFrame) {
        points = crop(points, Direction.Horizontal);
        points = crop(points, Direction.Vertical);
    }

    for (let i = 0; i < points.length - 1; i += 2) {
        box.xtl = Math.min(box.xtl, points[i]);
        box.ytl = Math.min(box.ytl, points[i + 1]);
        box.xbr = Math.max(box.xbr, points[i]);
        box.ybr = Math.max(box.ybr, points[i + 1]);
    }

    return { points, box };
}

export function getFinalCuboidCoordinates(targetPoints: number[], geometry: Geometry): FinalCoordinates {
    const { offset } = geometry;
    let points = targetPoints;
    const box = {
        xtl: Number.MAX_SAFE_INTEGER,
        ytl: Number.MAX_SAFE_INTEGER,
        xbr: Number.MIN_SAFE_INTEGER,
        ybr: Number.MIN_SAFE_INTEGER,
    };
    const frameWidth = geometry.image.width;
    const frameHeight = geometry.image.height;
    const cuboidOffsets = [];
    const minCuboidOffset = {
        d: Number.MAX_SAFE_INTEGER,
        dx: 0,
        dy: 0,
    };

    for (let i = 0; i < points.length - 1; i += 2) {
        const [x, y] = points.slice(i);
        if (x >= offset && x <= offset + frameWidth && y >= offset && y <= offset + frameHeight) continue;

        let xOffset = 0;
        let yOffset = 0;
        if (x < offset) {
            xOffset = offset - x;
        } else if (x > offset + frameWidth) {
            xOffset = offset + frameWidth - x;
        }
        if (y < offset) {
            yOffset = offset - y;
        } else if (y > offset + frameHeight) {
            yOffset = offset + frameHeight - y;
        }
        cuboidOffsets.push([xOffset, yOffset]);
    }

    if (cuboidOffsets.length === points.length / 2) {
        cuboidOffsets.forEach((offsetCoords: number[]): void => {
            const dx = offsetCoords[0] ** 2;
            const dy = offsetCoords[1] ** 2;
            if (Math.sqrt(dx + dy) < minCuboidOffset.d) {
                minCuboidOffset.d = Math.sqrt(dx + dy);
                [minCuboidOffset.dx, minCuboidOffset.dy] = offsetCoords;
            }
        });

        points = points.map((coord: number, index: number): number => (
            index % 2 ? coord + minCuboidOffset.dy : coord + minCuboidOffset.dx
        ));
    }

    points.forEach((coord: number, index: number): void => {
        if (index % 2 === 0) {
            box.xtl = Math.min(box.xtl, coord);
            box.xbr = Math.max(box.xbr, coord);
        } else {
            box.ytl = Math.min(box.ytl, coord);
            box.ybr = Math.max(box.ybr, coord);
        }
    });

    return {
        points: points.map((coord: number): number => coord - offset),
        box,
    };
}

export function finalizePastedShapePoints(
    shapeType: string,
    targetPoints: number[],
    rotation: number,
    geometry: Geometry,
): number[] | null {
    if (shapeType === 'rectangle') {
        const points = getFinalRectCoordinates(targetPoints, !rotation, geometry);
        return checkPasteConstraint(shapeType, points) ? points : null;
    }
    if (shapeType === 'ellipse') {
        const points = getFinalEllipseCoordinates(targetPoints, false, geometry);
        return checkPasteConstraint(shapeType, points) ? points : null;
    }
    if (shapeType === 'cuboid') {
        const { points, box } = getFinalCuboidCoordinates(targetPoints, geometry);
        return checkPasteConstraint(shapeType, points, box) ? points : null;
    }
    if (['polygon', 'polyline', 'points'].includes(shapeType)) {
        const { points, box } = getFinalPolyshapeCoordinates(targetPoints, true, shapeType, geometry);
        return checkPasteConstraint(shapeType, points, box) ? points : null;
    }
    return null;
}
