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

export interface SimplifyPolyOptions {
    accuracy: number;
    closed: boolean;
}

export interface SimplifyPolyResult {
    points: number[];
    warning?: string;
}

export function simplifyPoly(cv: any): (
    points: number[],
    options: SimplifyPolyOptions,
) => SimplifyPolyResult {
    const approxPolyDPFn = approxPolyDP(cv);

    return (points: number[], options: SimplifyPolyOptions): SimplifyPolyResult => {
        const {
            accuracy,
            closed,
        } = options;

        const minPoints = 3;
        const threshold = thresholdFromAccuracy(accuracy);
        const minValues = minPoints * 2;

        if (points.length < minValues) {
            const pointCount = points.length / 2;
            return {
                points,
                warning: `Shape has ${pointCount} points, minimum is ${minPoints}`,
            };
        }

        let simplified = approxPolyDPFn(points, threshold, closed);
        let warning: string | undefined;

        // Auto-adjust threshold if result has too few points
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
                    warning: `Could not simplify to at least ${minPoints} points even with reduced threshold`,
                };
            }
        }

        return {
            points: simplified,
            warning,
        };
    };
}
