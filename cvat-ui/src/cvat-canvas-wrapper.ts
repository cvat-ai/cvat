// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    Canvas,
    CanvasMode,
    CanvasVersion,
    RectDrawingMethod,
    CuboidDrawingMethod,
    InteractionData as _InteractionData,
    InteractionResult as _InteractionResult,
} from 'cvat-canvas/src/typescript/canvas';

export function convertShapesForInteractor(shapes: InteractionResult[], button: number): number[][] {
    const reducer = (acc: number[][], _: number, index: number, array: number[]): number[][] => {
        if (!(index % 2)) {
            // 0, 2, 4
            acc.push([array[index], array[index + 1]]);
        }
        return acc;
    };

    return shapes
        .filter((shape: InteractionResult): boolean => shape.button === button)
        .map((shape: InteractionResult): number[] => shape.points)
        .flat()
        .reduce(reducer, []);
}

export type InteractionData = _InteractionData;
export type InteractionResult = _InteractionResult;

export {
    Canvas, CanvasMode, CanvasVersion, RectDrawingMethod, CuboidDrawingMethod,
};
