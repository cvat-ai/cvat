// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import ObjectState from '../object-state';
import { ShapeType, ObjectType } from '../enums';
import { simplifyPoly, SimplifyPolyResult } from '../object-utils';

import { ActionParameterType, ActionParameters } from './base-action';
import { BaseShapesAction, ShapesActionInput, ShapesActionOutput } from './base-shapes-action';

export class PolygonSimplify extends BaseShapesAction {
    #accuracy = 0;
    #cv: any = null;

    public async init(_instance: any, parameters: Record<string, any>): Promise<void> {
        this.#accuracy = parameters.Points as number;
        this.#cv = parameters.OpenCV;
    }

    public async destroy(): Promise<void> {
        // nothing to destroy
    }

    public async run(input: ShapesActionInput): Promise<ShapesActionOutput> {
        const { onProgress, cancelled } = input;

        if (!this.#cv) {
            throw new Error('OpenCV is not loaded. The action modal should have initialized it.');
        }

        onProgress('Simplifying polygons', 0);

        const simplifyFn = simplifyPoly(this.#cv);
        const totalShapes = input.collection.shapes.length;

        const simplifiedShapes = input.collection.shapes.map((shape, index) => {
            if (cancelled()) {
                return shape;
            }

            if (!shape.points || shape.points.length < 6) {
                return shape;
            }

            const closed = shape.type === ShapeType.POLYGON;
            const result: SimplifyPolyResult = simplifyFn(shape.points, {
                accuracy: this.#accuracy,
                closed,
            });

            // Report progress
            if (totalShapes > 1) {
                const progress = Math.round(((index + 1) / totalShapes) * 100);
                onProgress('Simplifying polygons', progress);
            }

            // Return updated shape with new points
            return {
                ...shape,
                points: result.points,
            };
        });

        if (cancelled()) {
            return {
                created: { shapes: [] },
                deleted: { shapes: [] },
            };
        }

        return {
            created: { shapes: simplifiedShapes },
            deleted: { shapes: input.collection.shapes },
        };
    }

    public applyFilter(input: ShapesActionInput): ShapesActionInput['collection'] {
        return {
            shapes: input.collection.shapes.filter(
                (shape) => shape.type === ShapeType.POLYGON || shape.type === ShapeType.POLYLINE,
            ),
        };
    }

    public isApplicableForObject(objectState: ObjectState): boolean {
        return (
            objectState.objectType === ObjectType.SHAPE &&
            (objectState.shapeType === ShapeType.POLYGON || objectState.shapeType === ShapeType.POLYLINE)
        );
    }

    public get name(): string {
        return 'Simplify polygons and polylines';
    }

    public get parameters(): ActionParameters | null {
        return {
            OpenCV: {
                type: ActionParameterType.OPENCV_DEPENDENCY,
                values: [],
                defaultValue: '',
            },
            Points: {
                type: ActionParameterType.SLIDER,
                values: ['0', '13', '1'], // min, max, step
                defaultValue: '7',
            },
        };
    }
}
