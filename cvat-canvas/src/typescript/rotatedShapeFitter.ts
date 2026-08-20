// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RotatedShapeFitter } from './canvasModel';

export interface RotatedShapeFit {
    center: { x: number; y: number };
    size: { width: number; height: number };
    angle: number;
    topEdge?: RotatedShapeTopEdge;
}

export interface RotatedShapeTopEdge {
    point: { x: number; y: number };
    normal: { x: number; y: number };
}

interface FitOptions {
    fitter?: RotatedShapeFitter;
    useEllipseFit: boolean;
    previousTopEdge: RotatedShapeTopEdge | null;
    scale: number;
}

export const MIN_ROTATED_RECTANGLE_POINTS = 3;
export const MIN_FITTED_ELLIPSE_POINTS = 5;

const TOP_EDGE_SWITCH_THRESHOLD = 8;

export function withTopEdge(fitted: RotatedShapeFit): RotatedShapeFit {
    const angleRadians = (fitted.angle * Math.PI) / 180;
    const normal = {
        x: Math.sin(angleRadians),
        y: -Math.cos(angleRadians),
    };

    return {
        ...fitted,
        topEdge: {
            point: {
                x: fitted.center.x + normal.x * (fitted.size.height / 2),
                y: fitted.center.y + normal.y * (fitted.size.height / 2),
            },
            normal,
        },
    };
}

export function fitRotatedShape(points: number[], options: FitOptions): RotatedShapeFit | null {
    const {
        fitter, useEllipseFit, previousTopEdge, scale,
    } = options;
    const minPoints = useEllipseFit ? MIN_FITTED_ELLIPSE_POINTS : MIN_ROTATED_RECTANGLE_POINTS;
    if (points.length < minPoints * 2 || !fitter) {
        return null;
    }

    const contour: [number, number][] = [];
    for (let i = 0; i < points.length; i += 2) {
        contour.push([points[i], points[i + 1]]);
    }

    let fitted: ReturnType<RotatedShapeFitter['minAreaRect']>;
    try {
        fitted = useEllipseFit ? fitter.fitEllipse(contour) : fitter.minAreaRect(contour);
    } catch {
        return null;
    }

    const angle = ((fitted.angle % 180) + 180) % 180;
    const normalizedFit = angle >= 90 ? {
        center: fitted.center,
        size: { width: fitted.size.height, height: fitted.size.width },
        angle: angle - 90,
    } : { ...fitted, angle };

    const [firstX, firstY] = points;
    const equivalentFits: RotatedShapeFit[] = [
        normalizedFit,
        { ...normalizedFit, angle: normalizedFit.angle + 180 },
        {
            ...normalizedFit,
            size: { width: normalizedFit.size.height, height: normalizedFit.size.width },
            angle: normalizedFit.angle + 90,
        },
        {
            ...normalizedFit,
            size: { width: normalizedFit.size.height, height: normalizedFit.size.width },
            angle: normalizedFit.angle + 270,
        },
    ];

    const distanceToTopSide = (fit: RotatedShapeFit): number => {
        const angleRadians = (fit.angle * Math.PI) / 180;
        const relativeX = firstX - fit.center.x;
        const relativeY = firstY - fit.center.y;
        const localY = -relativeX * Math.sin(angleRadians) + relativeY * Math.cos(angleRadians);
        return Math.abs(localY + fit.size.height / 2);
    };

    const closestToFirstPoint = equivalentFits.reduce(
        (closestFit: RotatedShapeFit, fit: RotatedShapeFit): RotatedShapeFit => (
            distanceToTopSide(fit) < distanceToTopSide(closestFit) ? fit : closestFit
        ),
    );
    const fittedCandidates = equivalentFits.map(withTopEdge);
    if (!previousTopEdge) {
        return withTopEdge(closestToFirstPoint);
    }

    const closestToPreviousEdge = fittedCandidates.reduce(
        (closestFit: RotatedShapeFit, fit: RotatedShapeFit): RotatedShapeFit => {
            const similarity = (candidate: RotatedShapeFit): number => (
                candidate.topEdge.normal.x * previousTopEdge.normal.x +
                candidate.topEdge.normal.y * previousTopEdge.normal.y
            );
            return similarity(fit) > similarity(closestFit) ? fit : closestFit;
        },
        fittedCandidates[0],
    );
    const switchThreshold = TOP_EDGE_SWITCH_THRESHOLD / scale;

    // Keep the original first-point rule, but avoid switching between nearly
    // equidistant edges when the fitted shape jitters.
    return distanceToTopSide(closestToFirstPoint) + switchThreshold <
        distanceToTopSide(closestToPreviousEdge) ?
        withTopEdge(closestToFirstPoint) : closestToPreviousEdge;
}

export function fitRotatedPreviewFromGuide(points: number[]): RotatedShapeFit | null {
    if (points.length < 4) {
        return null;
    }

    const [firstX, firstY, secondX, secondY] = points;
    const angleRadians = Math.atan2(secondY - firstY, secondX - firstX);
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let index = 0; index < points.length; index += 2) {
        const x = points[index];
        const y = points[index + 1];
        const projectedX = x * cos + y * sin;
        const projectedY = -x * sin + y * cos;
        minX = Math.min(minX, projectedX);
        minY = Math.min(minY, projectedY);
        maxX = Math.max(maxX, projectedX);
        maxY = Math.max(maxY, projectedY);
    }

    const projectedCenterX = (minX + maxX) / 2;
    const projectedCenterY = (minY + maxY) / 2;
    return withTopEdge({
        center: {
            x: projectedCenterX * cos - projectedCenterY * sin,
            y: projectedCenterX * sin + projectedCenterY * cos,
        },
        // The two-point guide is not rendered, but gives the first fitted rectangle
        // a stable animation origin. Three points keep the same axis to avoid the
        // ambiguous minimum-area fit changing while the cursor crosses its boundary.
        size: {
            width: maxX - minX,
            height: maxY - minY,
        },
        angle: (angleRadians * 180) / Math.PI,
    });
}

export function getClosestEquivalentFit(fitted: RotatedShapeFit, reference: RotatedShapeFit): RotatedShapeFit {
    const normalizeAngle = (angle: number): number => {
        const difference = ((((angle - reference.angle + 90) % 180) + 180) % 180) - 90;
        return reference.angle + difference;
    };

    const direct = { ...fitted, angle: normalizeAngle(fitted.angle) };
    const swapped = {
        ...fitted,
        size: { width: fitted.size.height, height: fitted.size.width },
        angle: normalizeAngle(fitted.angle + 90),
    };

    return Math.abs(direct.angle - reference.angle) <= Math.abs(swapped.angle - reference.angle) ?
        direct : swapped;
}

export function interpolateNormal(
    previous: RotatedShapeTopEdge['normal'],
    target: RotatedShapeTopEdge['normal'],
    factor: number,
): RotatedShapeTopEdge['normal'] {
    const previousAngle = Math.atan2(previous.y, previous.x);
    const targetAngle = Math.atan2(target.y, target.x);
    let difference = targetAngle - previousAngle;
    if (difference > Math.PI) {
        difference -= 2 * Math.PI;
    } else if (difference <= -Math.PI) {
        difference += 2 * Math.PI;
    }

    const angle = previousAngle + difference * factor;
    return {
        x: Math.cos(angle),
        y: Math.sin(angle),
    };
}

function interpolateValue(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
}

export function interpolateRotatedShapeFit(
    current: RotatedShapeFit,
    target: RotatedShapeFit,
    fitFactor: number,
    topEdgeFactor: number,
): RotatedShapeFit {
    return {
        center: {
            x: interpolateValue(current.center.x, target.center.x, fitFactor),
            y: interpolateValue(current.center.y, target.center.y, fitFactor),
        },
        size: {
            width: interpolateValue(current.size.width, target.size.width, fitFactor),
            height: interpolateValue(current.size.height, target.size.height, fitFactor),
        },
        angle: interpolateValue(current.angle, target.angle, fitFactor),
        topEdge: current.topEdge && target.topEdge ? {
            point: {
                x: interpolateValue(current.topEdge.point.x, target.topEdge.point.x, topEdgeFactor),
                y: interpolateValue(current.topEdge.point.y, target.topEdge.point.y, topEdgeFactor),
            },
            normal: interpolateNormal(current.topEdge.normal, target.topEdge.normal, topEdgeFactor),
        } : target.topEdge,
    };
}

function hasDifference(values: [number, number][], tolerance: number): boolean {
    return values.some(([target, current]: [number, number]): boolean => (
        Math.abs(target - current) > tolerance
    ));
}

export function needsAnotherFitAnimationFrame(target: RotatedShapeFit, current: RotatedShapeFit): boolean {
    const topEdgeNeedsAnotherFrame = target.topEdge && current.topEdge && (
        hasDifference([
            [target.topEdge.point.x, current.topEdge.point.x],
            [target.topEdge.point.y, current.topEdge.point.y],
        ], 0.1) || hasDifference([
            [target.topEdge.normal.x, current.topEdge.normal.x],
            [target.topEdge.normal.y, current.topEdge.normal.y],
        ], 0.01)
    );

    return hasDifference([
        [target.center.x, current.center.x],
        [target.center.y, current.center.y],
        [target.size.width, current.size.width],
        [target.size.height, current.size.height],
        [target.angle, current.angle],
    ], 0.1) || Boolean(topEdgeNeedsAnotherFrame);
}
