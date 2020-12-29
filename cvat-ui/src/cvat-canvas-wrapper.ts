// Copyright (C) 2020 Intel Corporation
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

export type InteractionData = _InteractionData;
export type InteractionResult = _InteractionResult;

export {
    Canvas, CanvasMode, CanvasVersion, RectDrawingMethod, CuboidDrawingMethod,
};
