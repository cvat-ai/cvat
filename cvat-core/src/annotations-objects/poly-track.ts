// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import type { SerializedTrack } from '../server-response-types';
import { Track } from './track';
import type { AnnotationInjection, InterpolatedPosition, Point2D } from './types';

export class PolyTrack extends Track {
    constructor(
        data: SerializedTrack | SerializedTrack['elements'][0],
        clientID: number,
        color: string,
        injection: AnnotationInjection,
    ) {
        super(data, clientID, color, injection);
        for (const shape of Object.values(this.shapes)) {
            shape.rotation = 0; // is not supported
        }
    }

    protected interpolatePosition(leftPosition, rightPosition, offset): InterpolatedPosition {
        if (offset === 0) {
            return {
                points: [...leftPosition.points],
                rotation: leftPosition.rotation,
                occluded: leftPosition.occluded,
                outside: leftPosition.outside,
                zOrder: leftPosition.zOrder,
            };
        }

        function toArray(points: { x: number; y: number; }[]): number[] {
            return points.reduce((acc, val) => {
                acc.push(val.x, val.y);
                return acc;
            }, []);
        }

        function toPoints(array: number[]): { x: number; y: number; }[] {
            return array.reduce((acc, _, index) => {
                if (index % 2) {
                    acc.push({
                        x: array[index - 1],
                        y: array[index],
                    });
                }

                return acc;
            }, []);
        }

        function curveLength(points: { x: number; y: number; }[]): number {
            return points.slice(1).reduce((acc, _, index) => {
                const dx = points[index + 1].x - points[index].x;
                const dy = points[index + 1].y - points[index].y;
                return acc + Math.sqrt(dx ** 2 + dy ** 2);
            }, 0);
        }

        function curveToOffsetVec(points: { x: number; y: number; }[], length: number): number[] {
            const offsetVector = [0]; // with initial value
            let accumulatedLength = 0;

            points.slice(1).forEach((_, index) => {
                const dx = points[index + 1].x - points[index].x;
                const dy = points[index + 1].y - points[index].y;
                accumulatedLength += Math.sqrt(dx ** 2 + dy ** 2);
                offsetVector.push(accumulatedLength / length);
            });

            return offsetVector;
        }

        function findNearestPair(value: number, curve: number[]): number {
            let minimum = [0, Math.abs(value - curve[0])];
            for (let i = 1; i < curve.length; i++) {
                const distance = Math.abs(value - curve[i]);
                if (distance < minimum[1]) {
                    minimum = [i, distance];
                }
            }

            return minimum[0];
        }

        function matchLeftRight(leftCurve: number[], rightCurve: number[]): Record<number, number[]> {
            const matching: Record<number, number[]> = {};
            for (let i = 0; i < leftCurve.length; i++) {
                matching[i] = [findNearestPair(leftCurve[i], rightCurve)];
            }

            return matching;
        }

        function matchRightLeft(
            leftCurve: number[],
            rightCurve: number[],
            leftRightMatching: Record<number, number[]>,
        ): Record<number, number[]> {
            const matchedRightPoints = Object.values(leftRightMatching).flat();
            const unmatchedRightPoints = rightCurve
                .map((_, index) => index)
                .filter((index) => !matchedRightPoints.includes(index));
            const updatedMatching = { ...leftRightMatching };

            for (const rightPoint of unmatchedRightPoints) {
                const leftPoint = findNearestPair(rightCurve[rightPoint], leftCurve);
                updatedMatching[leftPoint].push(rightPoint);
            }

            for (const key of Object.keys(updatedMatching)) {
                const sortedRightIndexes = updatedMatching[key].sort((a, b) => a - b);
                updatedMatching[key] = sortedRightIndexes;
            }

            return updatedMatching;
        }

        function reduceInterpolation(
            interpolatedPoints: Point2D[],
            matching: Record<number, number[]>,
            leftPoints: Point2D[],
            rightPoints: Point2D[],
        ): Point2D[] {
            function averagePoint(points: Point2D[]): Point2D {
                let sumX = 0;
                let sumY = 0;
                for (const point of points) {
                    sumX += point.x;
                    sumY += point.y;
                }

                return {
                    x: sumX / points.length,
                    y: sumY / points.length,
                };
            }

            function computeDistance(point1: Point2D, point2: Point2D): number {
                return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
            }

            function minimizeSegment(baseLength: number, N: number, startInterpolated, stopInterpolated): Point2D[] {
                const threshold = baseLength / (2 * N);
                const minimized = [interpolatedPoints[startInterpolated]];
                let latestPushed = startInterpolated;
                for (let i = startInterpolated + 1; i < stopInterpolated; i++) {
                    const distance = computeDistance(interpolatedPoints[latestPushed], interpolatedPoints[i]);

                    if (distance >= threshold) {
                        minimized.push(interpolatedPoints[i]);
                        latestPushed = i;
                    }
                }

                minimized.push(interpolatedPoints[stopInterpolated]);

                if (minimized.length === 2) {
                    const distance = computeDistance(
                        interpolatedPoints[startInterpolated],
                        interpolatedPoints[stopInterpolated],
                    );

                    if (distance < threshold) {
                        return [averagePoint(minimized)];
                    }
                }

                return minimized;
            }

            const reduced: Point2D[] = [];
            const interpolatedIndexes: Record<number, number[]> = {};
            let accumulated = 0;
            for (let i = 0; i < leftPoints.length; i++) {
                // eslint-disable-next-line
                interpolatedIndexes[i] = matching[i].map(() => accumulated++);
            }

            function leftSegment(start, stop): void {
                const startInterpolated = interpolatedIndexes[start][0];
                const stopInterpolated = interpolatedIndexes[stop][0];

                if (startInterpolated === stopInterpolated) {
                    reduced.push(interpolatedPoints[startInterpolated]);
                    return;
                }

                const baseLength = curveLength(leftPoints.slice(start, stop + 1));
                const N = stop - start + 1;

                reduced.push(...minimizeSegment(baseLength, N, startInterpolated, stopInterpolated));
            }

            function rightSegment(leftPoint): void {
                const start = matching[leftPoint][0];
                const [stop] = matching[leftPoint].slice(-1);
                const startInterpolated = interpolatedIndexes[leftPoint][0];
                const [stopInterpolated] = interpolatedIndexes[leftPoint].slice(-1);
                const baseLength = curveLength(rightPoints.slice(start, stop + 1));
                const N = stop - start + 1;

                reduced.push(...minimizeSegment(baseLength, N, startInterpolated, stopInterpolated));
            }

            let previousOpened: number | null = null;
            for (let i = 0; i < leftPoints.length; i++) {
                if (matching[i].length === 1) {
                    // check if left segment is opened
                    if (previousOpened !== null) {
                        // check if we should continue the left segment
                        if (matching[i][0] === matching[previousOpened][0]) {
                            continue;
                        } else {
                            // left segment found
                            const start = previousOpened;
                            const stop = i - 1;
                            leftSegment(start, stop);

                            // start next left segment
                            previousOpened = i;
                        }
                    } else {
                        // start next left segment
                        previousOpened = i;
                    }
                } else {
                    // check if left segment is opened
                    if (previousOpened !== null) {
                        // left segment found
                        const start = previousOpened;
                        const stop = i - 1;
                        leftSegment(start, stop);

                        previousOpened = null;
                    }

                    // right segment found
                    rightSegment(i);
                }
            }

            // check if there is an opened segment
            if (previousOpened !== null) {
                leftSegment(previousOpened, leftPoints.length - 1);
            }

            return reduced;
        }

        // the algorithm below is based on fact that both left and right
        // polyshapes have the same start point and the same draw direction
        const leftPoints = toPoints(leftPosition.points);
        const rightPoints = toPoints(rightPosition.points);
        const leftOffsetVec = curveToOffsetVec(leftPoints, curveLength(leftPoints));
        const rightOffsetVec = curveToOffsetVec(rightPoints, curveLength(rightPoints));

        const matching = matchLeftRight(leftOffsetVec, rightOffsetVec);
        const completedMatching = matchRightLeft(leftOffsetVec, rightOffsetVec, matching);

        const interpolatedPoints = Object.keys(completedMatching)
            .map((leftPointIdx) => +leftPointIdx)
            .sort((a, b) => a - b)
            .reduce((acc, leftPointIdx) => {
                const leftPoint = leftPoints[leftPointIdx];
                for (const rightPointIdx of completedMatching[leftPointIdx]) {
                    const rightPoint = rightPoints[rightPointIdx];
                    acc.push({
                        x: leftPoint.x + (rightPoint.x - leftPoint.x) * offset,
                        y: leftPoint.y + (rightPoint.y - leftPoint.y) * offset,
                    });
                }

                return acc;
            }, []);

        const reducedPoints = reduceInterpolation(interpolatedPoints, completedMatching, leftPoints, rightPoints);

        return {
            points: toArray(reducedPoints),
            rotation: leftPosition.rotation,
            occluded: leftPosition.occluded,
            outside: leftPosition.outside,
            zOrder: leftPosition.zOrder,
        };
    }
}
