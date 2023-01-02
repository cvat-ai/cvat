// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export interface ItemLayout {
    viewType: ViewType;
    offset: number[];
    x: number;
    y: number;
    w: number;
    h: number;
    viewIndex?: string;
}

export enum ViewType {
    CANVAS = 'canvas',
    CANVAS_3D = 'canvas3D',
    CANVAS_3D_TOP = 'canvas3DTop',
    CANVAS_3D_SIDE = 'canvas3DSide',
    CANVAS_3D_FRONT = 'canvas3DFront',
    RELATED_IMAGE = 'relatedImage',
}

const defaultLayout: { [index: string]: ItemLayout[] } = {};
defaultLayout.CANVAS_NO_RELATED = [{
    viewType: ViewType.CANVAS,
    offset: [0],
    x: 0,
    y: 0,
    w: 12,
    h: 12,
}];

defaultLayout.CANVAS_ONE_RELATED = [
    { ...defaultLayout.CANVAS_NO_RELATED[0], w: 9 }, {
        viewType: ViewType.RELATED_IMAGE,
        offset: [0, 0],
        x: 9,
        y: 0,
        w: 3,
        h: 4,
        viewIndex: '1',
    },
];

defaultLayout.CANVAS_TWO_RELATED = [
    ...defaultLayout.CANVAS_ONE_RELATED,
    {
        ...defaultLayout.CANVAS_ONE_RELATED[1],
        viewIndex: '2',
        offset: [0, 1],
        y: 3,
    },
];

defaultLayout.CANVAS_THREE_PLUS_RELATED = [
    ...defaultLayout.CANVAS_TWO_RELATED,
    {
        ...defaultLayout.CANVAS_TWO_RELATED[1],
        viewIndex: '3',
        offset: [0, 2],
        y: 6,
    },
];

defaultLayout.CANVAS_3D_NO_RELATED = [{
    viewType: ViewType.CANVAS_3D,
    offset: [0],
    x: 0,
    y: 0,
    w: 12,
    h: 9,
}, {
    viewType: ViewType.CANVAS_3D_TOP,
    offset: [0],
    x: 0,
    y: 9,
    w: 4,
    h: 3,
}, {
    viewType: ViewType.CANVAS_3D_SIDE,
    offset: [0],
    x: 4,
    y: 9,
    w: 4,
    h: 3,
}, {
    viewType: ViewType.CANVAS_3D_FRONT,
    offset: [0],
    x: 8,
    y: 9,
    w: 4,
    h: 3,
}];

defaultLayout.CANVAS_3D_ONE_RELATED = [
    { ...defaultLayout.CANVAS_3D_NO_RELATED[0], w: 9 },
    { ...defaultLayout.CANVAS_3D_NO_RELATED[1], w: 3 },
    { ...defaultLayout.CANVAS_3D_NO_RELATED[2], x: 3, w: 3 },
    { ...defaultLayout.CANVAS_3D_NO_RELATED[3], x: 6, w: 3 },
    {
        viewType: ViewType.RELATED_IMAGE,
        offset: [0, 0],
        x: 9,
        y: 0,
        w: 3,
        h: 4,
        viewIndex: '1',
    },
];

defaultLayout.CANVAS_3D_TWO_RELATED = [
    ...defaultLayout.CANVAS_3D_ONE_RELATED,
    {
        ...defaultLayout.CANVAS_3D_ONE_RELATED[4],
        viewIndex: '2',
        offset: [0, 1],
        y: 4,
    },
];

defaultLayout.CANVAS_3D_THREE_PLUS_RELATED = [
    ...defaultLayout.CANVAS_3D_TWO_RELATED,
    {
        ...defaultLayout.CANVAS_3D_TWO_RELATED[5],
        viewIndex: '3',
        offset: [0, 2],
        y: 8,
    },
];

export default defaultLayout;
