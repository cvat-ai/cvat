// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { numberArrayToPoints, Point } from '../math';

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
    params: IntelligentScissorsParams;
    kind: string;
    run(points: number[]): number[];
    reset(): void;
    setImage(image: ImageData): void;
    switchBlockMode(mode?:boolean):void;
}

export default class IntelligentScissorsImplementation implements IntelligentScissors {
    public kind = 'opencv_intelligent_scissors';

    private cv: any;
    private dsize: any;
    private originalSize: { width: number; height: number };

    // @ts-ignore initialized in this.reset called from constructor
    private scissors: {
        tool: any;
        state: {
            contour: number[];
            prevPoints: Point[];
            contourOffsets: number[];
            image: any | null;
            blocked: boolean;
        };
    };

    public constructor(cv: any) {
        this.cv = cv;
        this.dsize = new cv.Size(1024, 1024);
        this.originalSize = {
            width: this.dsize.width,
            height: this.dsize.height,
        };

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
                contour: [],
                prevPoints: [],
                contourOffsets: [],
                image: null,
                blocked: false,
            },
        };

        this.scissors.tool.setEdgeFeatureCannyParameters(32, 100);
        this.scissors.tool.setGradientMagnitudeMaxLimit(200);
    }

    public setImage(image: ImageData): void {
        const { cv, scissors } = this;
        const { tool } = scissors;

        if (!(image instanceof ImageData)) {
            throw new Error('Image is expected to be an instance of ImageData');
        }

        const matImage = cv.matFromImageData(image);
        const resized = new this.cv.Mat();
        try {
            cv.resize(matImage, resized, this.dsize);
            tool.applyImage(resized);
            this.originalSize = {
                width: image.width,
                height: image.height,
            };
        } finally {
            resized.delete();
            matImage.delete();
        }
    }

    public run(coordinates: number[]): number[] {
        if (!Array.isArray(coordinates)) {
            throw new Error('Coordinates is expected to be an array');
        }

        if (!coordinates.length) {
            throw new Error('At least one point is expected');
        }

        const { cv, scissors } = this;
        const { tool, state } = scissors;

        const xScale = this.dsize.width / this.originalSize.width;
        const yScale = this.dsize.height / this.originalSize.height;
        const points = numberArrayToPoints(coordinates);

        for (const point of points) {
            point.x *= xScale;
            point.y *= yScale;
        }

        if (points.length === 1) {
            state.prevPoints = points;
            state.contourOffsets = [0];
            state.contour = [points[0].x / xScale, points[0].y / yScale];
            return [...state.contour];
        }
        if (points.length < state.prevPoints.length) {
            // last point was removed
            while (points.length < state.prevPoints.length) {
                // need to remove one or two completed points
                state.prevPoints.pop();
                const lastOffset = state.contourOffsets.pop();
                state.contour = state.contour.slice(0, lastOffset);
            }

            const prevPoint = state.prevPoints[state.prevPoints.length - 1];
            tool.buildMap(new cv.Point(prevPoint.x, prevPoint.y));
            return state.contour;
        }

        if (points.length > state.prevPoints.length) {
            const prevPoint = state.prevPoints[state.prevPoints.length - 1];
            tool.buildMap(new cv.Point(prevPoint.x, prevPoint.y));
            state.contourOffsets.push(state.contour.length);
        }

        const lastOffset = state.contourOffsets[state.contourOffsets.length - 1];
        const curPoint = points[points.length - 1];
        const contour = new cv.Mat();

        const curSegment = [];
        if (!state.blocked) {
            try {
                tool.getContour(new cv.Point(curPoint.x, curPoint.y), contour);
                for (let row = 0; row < contour.rows; row++) {
                    curSegment.push(contour.intAt(row, 0) / xScale, contour.intAt(row, 1) / yScale);
                }
            } finally {
                contour.delete();
            }
        } else {
            curSegment.push(curPoint.x / xScale, curPoint.y / yScale);
        }

        state.prevPoints = [...points];
        state.contour = state.contour.slice(0, lastOffset);
        state.contour.push(...curSegment);

        return [...state.contour];
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
