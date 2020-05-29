// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    Canvas,
    CanvasMode,
    CanvasVersion,
    RectDrawingMethod,
    CuboidDrawingMethod,
} from 'cvat-canvas/src/typescript/canvas';

function isAbleToChangeFrame(canvas: Canvas): boolean {
    return ![CanvasMode.DRAG, CanvasMode.EDIT, CanvasMode.RESIZE]
        .includes(canvas.mode());
}

export {
    Canvas,
    CanvasMode,
    CanvasVersion,
    RectDrawingMethod,
    CuboidDrawingMethod,
    isAbleToChangeFrame,
};
