// Copyright (C) 2026 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { Job, Task } from '../session';
import { ActionParameterType, ActionParameters } from './base-action';
import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';
import { ShapeType, ObjectType } from '../enums';

export class PolygonSimplifyAction extends BaseShapesAction {
    private threshold: number = 0;

    public async init(
        sessionInstance: Job | Task,
        parameters: Record<string, string | number>,
    ): Promise<void> {
        // Convert accuracy (0-13 scale) to epsilon threshold
        // This matches the thresholdFromAccuracy function from the UI
        const accuracy = parameters.Points as number;
        const approxPolyMaxDistance = 13 - accuracy;

        if (approxPolyMaxDistance > 0) {
            if (approxPolyMaxDistance <= 8) {
                // -2.75x+7y+1=0 linear made from two points (1; 0.25) and (8; 3)
                this.threshold = (2.75 * approxPolyMaxDistance - 1) / 7;
            } else {
                // 4 for 9, 8 for 10, 16 for 11, 32 for 12, 64 for 13
                this.threshold = 2 ** (approxPolyMaxDistance - 7);
            }
        } else {
            this.threshold = 0;
        }
    }

    public async destroy(): Promise<void> {
        // No cleanup needed
    }

    public async run(input: ShapesActionInput): Promise<ShapesActionOutput> {
        const { collection } = input;
        const simplifiedShapes = [];

        // Process all shapes that pass the filter (polygons and polylines)
        for (const shape of collection.shapes || []) {
            if (!shape.points || shape.points.length < 6) {
                // Keep shapes with insufficient points as-is
                simplifiedShapes.push(shape);
                continue;
            }

            try {
                const simplified = await this.simplifyPolygon(
                    shape.points,
                    shape.type === ShapeType.POLYGON,
                );

                // Validate that simplification results in at least 3 points (6 values in flat array)
                // and only update if simplification actually reduced points
                if (simplified.length >= 6 && simplified.length < shape.points.length) {
                    simplifiedShapes.push({
                        ...shape,
                        points: simplified,
                    });
                } else {
                    // Keep original if too few points or no reduction
                    simplifiedShapes.push(shape);
                }
            } catch (error) {
                console.warn(`Failed to simplify shape ${shape.clientID}:`, error);
                // Keep original shape if simplification fails
                simplifiedShapes.push(shape);
            }
        }

        return {
            created: { shapes: simplifiedShapes },
            deleted: { shapes: collection.shapes || [] },
        };
    }

    private async simplifyPolygon(points: number[], closed: boolean): Promise<number[]> {
        // This will use the OpenCV wrapper that's already available
        // We need to ensure OpenCV is loaded before calling this
        const { cv } = (window as any);

        if (!cv) {
            throw new Error('OpenCV is not loaded');
        }

        if (points.length < 6 || points.length % 2 !== 0) {
            return points;
        }

        const rows = points.length / 2;
        const cols = 2;
        const approx = new cv.Mat();
        const contour = cv.matFromArray(rows, cols, cv.CV_32FC1, points);

        try {
            cv.approxPolyDP(contour, approx, this.threshold, closed);

            // Extract points from the Mat structure
            // Use floatAt to access individual matrix elements
            // approx has shape [n, 2] where n is the number of simplified points
            const result: number[] = [];
            for (let row = 0; row < approx.rows; row++) {
                result.push(approx.floatAt(row, 0)); // x coordinate
                result.push(approx.floatAt(row, 1)); // y coordinate
            }
            return result;
        } finally {
            approx.delete();
            contour.delete();
        }
    }

    public applyFilter(input: ShapesActionInput): ShapesActionInput['collection'] {
        const { collection } = input;

        // Only process polygons and polylines
        const filteredShapes = (collection.shapes || []).filter(
            (shape: any) => shape.type === ShapeType.POLYGON || shape.type === ShapeType.POLYLINE,
        );

        return {
            shapes: filteredShapes,
        };
    }

    public isApplicableForObject(objectState: ObjectState): boolean {
        return (
            objectState.objectType === ObjectType.SHAPE &&
            (objectState.shapeType === ShapeType.POLYGON || objectState.shapeType === ShapeType.POLYLINE)
        );
    }

    public get name(): string {
        return 'Simplify polygons';
    }

    public get parameters(): ActionParameters | null {
        return {
            Points: {
                type: ActionParameterType.SLIDER,
                values: ['0', '13', '1'], // min, max, step (matches UI slider)
                defaultValue: '7', // balanced accuracy
            },
        };
    }
}
