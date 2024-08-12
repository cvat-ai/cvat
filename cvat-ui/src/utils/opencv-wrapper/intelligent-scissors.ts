// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { numberArrayToPoints, pointsToNumberArray, Point } from '../math';

export interface IntelligentScissorsParams {
    shape: {
        shapeType: 'polygon' | 'polyline';
    };
    canvas: {
        shapeType: 'points';
        enableSliding: boolean;
        allowRemoveOnlyLast: boolean;
        minPosVertices: number;
    };
}

export interface IntelligentScissors {
    kind: string;
    reset(): void;
    run(points: number[], image: ImageData, offsetX: number, offsetY: number): number[];
    params: IntelligentScissorsParams;
    switchBlockMode(mode?:boolean):void;
}

export default class IntelligentScissorsImplementation implements IntelligentScissors {
    public kind = 'opencv_intelligent_scissors';
    private cv: any;
    private scissors: {
        tool: any;
        state: {
            prevPoints: Point[];
            curPoints: Point[];

            points: Point[];

            slicingPoint: Point | null;
            predictedPoints: Point[];
            lastAnchor: number;

            anchors: Record<
            number,
            {
                point: Point;
                start: number;
            }
            >; // point index : start index in path
            image: any | null;
            blocked: boolean;
        };
    };

    public constructor(cv: any) {
        this.cv = cv;
        this.reset();
    }

    public switchBlockMode(mode:boolean): void {
        this.scissors.state.blocked = mode;
    }

    public reset(): void {
        if (this.scissors && this.scissors.tool) {
            this.scissors.tool.delete();
        }

        this.scissors = {
            // eslint-disable-next-line new-cap
            tool: new this.cv.segmentation_IntelligentScissorsMB(),
            state: {
                prevPoints: [],
                curPoints: [],

                points: [],
                slicingPoint: null,
                predictedPoints: [],
                lastAnchor: -1,

                path: [],
                anchors: {},
                image: null,
                blocked: false,
            },
        };

        this.scissors.tool.setEdgeFeatureCannyParameters(32, 100);
        this.scissors.tool.setGradientMagnitudeMaxLimit(200);
    }

    public run(coordinates: number[], image: ImageData): number[] {
        if (!Array.isArray(coordinates)) {
            throw new Error('Coordinates is expected to be an array');
        }
        if (!coordinates.length) {
            throw new Error('At least one point is expected');
        }
        if (!(image instanceof ImageData)) {
            throw new Error('Image is expected to be an instance of ImageData');
        }

        const { cv, scissors } = this;
        const { tool, state } = scissors;

        const points = numberArrayToPoints(coordinates);
        if (points.length === 1) {
            const matImage = cv.matFromImageData(image);

            try {
                state.prevPoints = points;
                state.curPoints = points;
                tool.applyImage(matImage);
                tool.buildMap(new cv.Point(points[0].x, points[0].y));
                return coordinates;
            } finally {
                if (matImage) {
                    matImage.delete();
                }
            }
        } else {
            let contour = new cv.Mat();

            const path = [];
            for (let i = 1; i < points.length; i++) {
                const prevPoint = points[i - 1];
                const curPoint = points[i];

                // tool.buildMap(new cv.Point(prevPoint.x, prevPoint.y));
                tool.getContour(new cv.Point(curPoint.x, curPoint.y), contour);

                for (let row = 0; row < contour.rows; row++) {
                    path.push(contour.intAt(row, 0), contour.intAt(row, 1));
                }

                contour.delete();
                contour = new cv.Mat();
            }

            contour.delete();

            return path;
        }

        return [...state.path];
    }

    // eslint-disable-next-line class-methods-use-this
    public get type(): string {
        return 'opencv_intelligent_scissors';
    }

    // eslint-disable-next-line class-methods-use-this
    public get params(): IntelligentScissorsParams {
        return {
            shape: {
                shapeType: 'polygon',
            },
            canvas: {
                shapeType: 'points',
                enableSliding: true,
                allowRemoveOnlyLast: true,
                minPosVertices: 1,
            },
        };
    }
}
