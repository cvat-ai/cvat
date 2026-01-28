// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import config from 'config';

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

const defaultLayout: {
    '2D': {
        [index: string]: ItemLayout[];
    };
    '3D': {
        [index: string]: ItemLayout[];
    };
} = { '2D': {}, '3D': {} };

defaultLayout['2D']['0'] = [{
    viewType: ViewType.CANVAS,
    offset: [0],
    x: 0,
    y: 0,
    w: config.CANVAS_WORKSPACE_COLS,
    h: config.CANVAS_WORKSPACE_ROWS,
}];

defaultLayout['2D']['1'] = [
    { ...defaultLayout['2D']['0'][0], w: 9 }, {
        viewType: ViewType.RELATED_IMAGE,
        offset: [0, 0],
        x: 9,
        y: 0,
        w: 3,
        h: config.CANVAS_WORKSPACE_DEFAULT_CONTEXT_HEIGHT,
        viewIndex: '0',
    },
];

defaultLayout['2D']['2'] = [
    ...defaultLayout['2D']['1'], {
        ...defaultLayout['2D']['1'][1],
        viewType: ViewType.RELATED_IMAGE,
        viewIndex: '1',
        offset: [0, 1],
        y: 4,
    },
];

defaultLayout['2D']['3'] = [
    ...defaultLayout['2D']['2'], {
        ...defaultLayout['2D']['2'][2],
        viewIndex: '2',
        offset: [0, 2],
        y: 8,
    },
];

defaultLayout['3D']['0'] = [{
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

defaultLayout['3D']['1'] = [
    { ...defaultLayout['3D']['0'][0], w: 9 },
    { ...defaultLayout['3D']['0'][1], w: 3 },
    { ...defaultLayout['3D']['0'][2], x: 3, w: 3 },
    { ...defaultLayout['3D']['0'][3], x: 6, w: 3 },
    {
        viewType: ViewType.RELATED_IMAGE,
        offset: [0, 0],
        x: 9,
        y: 0,
        w: 3,
        h: config.CANVAS_WORKSPACE_DEFAULT_CONTEXT_HEIGHT,
        viewIndex: '0',
    },
];

defaultLayout['3D']['2'] = [
    ...defaultLayout['3D']['1'],
    {
        ...defaultLayout['3D']['1'][4],
        viewIndex: '1',
        offset: [0, 1],
        y: 4,
    },
];

defaultLayout['3D']['3'] = [
    ...defaultLayout['3D']['2'],
    {
        ...defaultLayout['3D']['2'][5],
        viewIndex: '2',
        offset: [0, 2],
        y: 8,
    },
];

export default defaultLayout;
