// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import IntelligentScissorsImplementation, {
    type IntelligentScissorsInterface,
} from './intelligent-scissors';
import HistogramEqualizationImplementation from './histogram-equalization';
import TrackerMILImplementation, {
    type TrackerMILInterface,
} from './tracker-mil';
import type { ImageProcessing } from './image-processing';

enum MatType {
    CV_8UC1,
    CV_8UC3,
    CV_8UC4,
}

export interface OpenCVInterface {
    mat: {
        fromData: (width: number, height: number, type: MatType, data: ArrayLike<number>) => any;
    };
    matVector: {
        empty: () => any;
    };
    contours: {
        convexHull: (src: [number, number][][]) => [number, number][];
        findContours: (src: any) => [number, number][][];
        approxPoly: (points: [number, number][], threshold: number, closed?: boolean) => [number, number][];
        simplifyPolygon: (points: number[], threshold: number, closed: boolean) => number[];
    };
    segmentation: {
        intelligentScissorsFactory: () => IntelligentScissorsInterface;
    };
    imgproc: {
        hist: () => ImageProcessing;
    };
    tracking: {
        trackerMIL: {
            model: () => TrackerMILInterface;
        };
    };
    utils: {
        thresholdFromAccuracy: (accuracy: number) => number;
    };
    enums: {
        MatType: typeof MatType;
    }
}

export function createOpenCVInterface(cv: any): OpenCVInterface {
    return {
        mat: {
            fromData: (width: number, height: number, type: MatType, data: ArrayLike<number>) => {
                const typeToCVType = {
                    [MatType.CV_8UC1]: cv.CV_8UC1,
                    [MatType.CV_8UC3]: cv.CV_8UC3,
                    [MatType.CV_8UC4]: cv.CV_8UC4,
                };

                const mat = cv.matFromArray(height, width, typeToCVType[type], data);
                return mat;
            },
        },

        matVector: {
            empty: () => new cv.MatVector(),
        },

        contours: {
            convexHull: (contours: [number, number][][]): [number, number][] => {
                const points = contours.flat(2) as number[];
                const input = cv.matFromArray(points.length / 2, 1, cv.CV_32SC2, points);
                const output = new cv.Mat();
                try {
                    cv.convexHull(input, output, false, true);
                    const result = Array.from(output.data32S as number[]);
                    const converted: [number, number][] = [];
                    for (let i = 0; i < result.length; i += 2) {
                        converted.push([result[i], result[i + 1]]);
                    }
                    return converted;
                } finally {
                    output.delete();
                    input.delete();
                }
            },

            findContours: (src: any): [number, number][][] => {
                type ArrayWithPixelLength = Array<Array<[number, number]> & { pixelLength?: number }>;

                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                const expanded = new cv.Mat();
                const kernel = cv.Mat.ones(2, 2, cv.CV_8U);
                const anchor = new cv.Point(-1, -1);
                const jsContours: ArrayWithPixelLength = [];
                try {
                    cv.copyMakeBorder(src, expanded, 1, 1, 1, 1, cv.BORDER_CONSTANT);
                    // morph transform to get better contour including all the pixels
                    cv.dilate(
                        expanded,
                        expanded,
                        kernel,
                        anchor,
                        1,
                        cv.BORDER_CONSTANT,
                        cv.morphologyDefaultBorderValue(),
                    );

                    cv.findContours(expanded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
                    for (let i = 0; i < contours.size(); i++) {
                        const contour = contours.get(i);
                        const converted: [number, number][] = [];

                        let prevX = contour.data32S[0] - 1;
                        let prevY = contour.data32S[1] - 1;
                        let contourLength = 0;
                        for (let j = 0; j < contour.data32S.length; j += 2) {
                            // subtract offset we created when copied source image
                            const x = contour.data32S[j] - 1;
                            const y = contour.data32S[j + 1] - 1;
                            converted.push([x, y]);
                            contourLength += Math.hypot(x - prevX, y - prevY);
                            prevX = x;
                            prevY = y;
                        }

                        Object.defineProperty(converted, 'pixelLength', {
                            value: contourLength,
                            writable: false,
                        });

                        jsContours.push(converted);
                        contour.delete();
                    }
                } finally {
                    kernel.delete();
                    expanded.delete();
                    hierarchy.delete();
                    contours.delete();
                }

                return jsContours.sort((arr1, arr2) => (arr2.pixelLength || 0) - (arr1.pixelLength || 0));
            },

            approxPoly: (points: [number, number][], threshold: number, closed = true): [number, number][] => {
                if (points.length < 3) {
                    // nothing to approximate
                    return points;
                }

                const rows = points.length;
                const cols = 2;
                const approx = new cv.Mat();
                const contour = cv.matFromArray(rows, cols, cv.CV_32FC1, points.flat());
                try {
                    cv.approxPolyDP(contour, approx, threshold, closed); // approx output type is CV_32F
                    const result: [number, number][] = [];
                    for (let row = 0; row < approx.rows; row++) {
                        result.push([approx.floatAt(row, 0), approx.floatAt(row, 1)]);
                    }
                    return result;
                } finally {
                    approx.delete();
                    contour.delete();
                }
            },

            simplifyPolygon: function simplifyPolygon(
                points: number[],
                threshold: number,
                closed: boolean,
            ): number[] {
                const minPoints = closed ? 3 : 2;
                const minValues = minPoints * 2;

                if (points.length < minValues) {
                    return points;
                }

                const pointsTuples: [number, number][] = [];
                for (let i = 0; i < points.length; i += 2) {
                    pointsTuples.push([points[i], points[i + 1]]);
                }

                const simplifiedTuples = this.approxPoly(pointsTuples, threshold, closed);

                if (simplifiedTuples.length < minPoints) {
                    return points;
                }

                return simplifiedTuples.flat();
            },
        },

        segmentation: {
            intelligentScissorsFactory: () => new IntelligentScissorsImplementation(cv),
        },

        imgproc: {
            hist: () => new HistogramEqualizationImplementation(cv),
        },

        tracking: {
            trackerMIL: {
                model: () => new TrackerMILImplementation(cv),
            },
        },

        utils: {
            thresholdFromAccuracy: (accuracy: number): number => {
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
            },
        },

        enums: {
            MatType,
        },
    };
}
