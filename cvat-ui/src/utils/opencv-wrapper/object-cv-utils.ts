// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function thresholdFromAccuracy(accuracy: number): number {
    // Convert accuracy (0-13 scale) to epsilon threshold
    // This matches the approximation accuracy slider
    const approxPolyMaxDistance = 13 - accuracy;

    if (approxPolyMaxDistance > 0) {
        if (approxPolyMaxDistance <= 8) {
            // Linear interpolation from (1, 0.25) to (8, 3)
            return (2.75 * approxPolyMaxDistance - 1) / 7;
        }
        // Exponential: 4 for 9, 8 for 10, 16 for 11, 32 for 12, 64 for 13
        return 2 ** (approxPolyMaxDistance - 7);
    }
    return 0;
}

export function approxPolyDP(cv: any): (points: number[], threshold: number, closed?: boolean) => number[] {
    return (points: number[], threshold: number, closed = true): number[] => {
        if (points.length < 3 || points.length % 2) {
            return points;
        }

        const rows = points.length / 2;
        const cols = 2;
        const approx = new cv.Mat();
        const contour = cv.matFromArray(rows, cols, cv.CV_32FC1, points);

        try {
            cv.approxPolyDP(contour, approx, threshold, closed);
            return Array.from(approx.data32F);
        } finally {
            approx.delete();
            contour.delete();
        }
    };
}

export interface SimplifyPolygonOptions {
    accuracy: number;
    closed: boolean;
}

export interface SimplifyPolygonResult {
    points: number[];
    simplified: boolean;
    originalPointCount: number;
    simplifiedPointCount: number;
    thresholdUsed: number;
    warning?: string;
}

export function simplifyPolygon(cv: any): (
    points: number[],
    options: SimplifyPolygonOptions,
) => SimplifyPolygonResult {
    const approxPolyDPFn = approxPolyDP(cv);

    return (points: number[], options: SimplifyPolygonOptions): SimplifyPolygonResult => {
        const {
            accuracy,
            closed,
        } = options;

        const minPoints = 3;

        const threshold = thresholdFromAccuracy(accuracy);

        const originalPointCount = points.length / 2;
        const minValues = minPoints * 2;

        if (points.length < minValues) {
            return {
                points,
                simplified: false,
                originalPointCount,
                simplifiedPointCount: originalPointCount,
                thresholdUsed: threshold,
                warning: `Shape has ${originalPointCount} points, minimum is ${minPoints}`,
            };
        }

        let simplified = approxPolyDPFn(points, threshold, closed);
        let thresholdUsed = threshold;
        let warning: string | undefined;

        if (simplified.length < minValues) {
            let adjustedThreshold = threshold * 0.5;
            let attempts = 0;
            const maxAttempts = 5;

            while (simplified.length < minValues && attempts < maxAttempts && adjustedThreshold > 0.01) {
                simplified = approxPolyDPFn(points, adjustedThreshold, closed);
                adjustedThreshold *= 0.5;
                attempts++;
            }

            if (simplified.length < minValues) {
                return {
                    points,
                    simplified: false,
                    originalPointCount,
                    simplifiedPointCount: originalPointCount,
                    thresholdUsed: threshold,
                    warning: `Could not simplify to at least ${minPoints} points even with reduced threshold`,
                };
            }

            thresholdUsed = adjustedThreshold * 2;
            warning = `Used reduced threshold (${thresholdUsed.toFixed(4)}) to maintain at least ${minPoints} points`;
        }

        const simplifiedPointCount = simplified.length / 2;

        if (simplified.length >= points.length) {
            return {
                points,
                simplified: false,
                originalPointCount,
                simplifiedPointCount: originalPointCount,
                thresholdUsed,
                warning: 'Threshold did not reduce point count',
            };
        }

        return {
            points: simplified,
            simplified: true,
            originalPointCount,
            simplifiedPointCount,
            thresholdUsed,
            warning,
        };
    };
}
