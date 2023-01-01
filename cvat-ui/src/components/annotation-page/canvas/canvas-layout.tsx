// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './grid-layout-styles.scss';
import 'react-grid-layout/css/styles.css';

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import RGL, { WidthProvider } from 'react-grid-layout';
import PropTypes from 'prop-types';
import Layout from 'antd/lib/layout';
import { DragOutlined } from '@ant-design/icons';

import { DimensionType, CombinedState } from 'reducers';
import CanvasWrapperComponent from 'containers/annotation-page/canvas/canvas-wrapper';
import CanvasWrapper3DContainer from 'containers/annotation-page/canvas/canvas-wrapper3D';
import {
    PerspectiveViewComponent,
    TopViewComponent,
    SideViewComponent,
    FrontViewComponent,
} from 'components/annotation-page/canvas/canvas-wrapper3D';
import ContextImage from './context-image';

const ReactGridLayout = WidthProvider(RGL);

enum ViewType {
    CANVAS = 'canvas',
    CANVAS_3D = 'canvas3D',
    CANVAS_3D_TOP = 'canvas3DTop',
    CANVAS_3D_SIDE = 'canvas3DSide',
    CANVAS_3D_FRONT = 'canvas3DFront',
    RELATED_IMAGE = 'relatedImage',
}

interface ItemLayout {
    viewType: ViewType;
    offset: number[];
    x: number;
    y: number;
    w: number;
    h: number;
    viewIndex?: string;
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
        offset: [0],
        x: 9,
        y: 0,
        w: 3,
        h: 4,
        viewIndex: '1',
    },
];

defaultLayout.CANVAS_TWO_RELATED = [
    ...defaultLayout.CANVAS_ONE_RELATED,
    { ...defaultLayout.CANVAS_ONE_RELATED[1], y: 3, viewIndex: '2' },
];

defaultLayout.CANVAS_THREE_PLUS_RELATED = [
    ...defaultLayout.CANVAS_TWO_RELATED,
    { ...defaultLayout.CANVAS_TWO_RELATED[1], y: 6, viewIndex: '3' },
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
        offset: [0],
        x: 9,
        y: 0,
        w: 3,
        h: 4,
        viewIndex: '1',
    },
];

defaultLayout.CANVAS_3D_TWO_RELATED = [
    ...defaultLayout.CANVAS_3D_ONE_RELATED,
    { ...defaultLayout.CANVAS_3D_ONE_RELATED[4], y: 4, viewIndex: '2' },
];

defaultLayout.CANVAS_3D_THREE_PLUS_RELATED = [
    ...defaultLayout.CANVAS_3D_TWO_RELATED,
    { ...defaultLayout.CANVAS_3D_TWO_RELATED[5], y: 8, viewIndex: '3' },
];

const ViewFabric = (itemLayout: ItemLayout): JSX.Element => {
    const { viewType: type, offset, viewIndex } = itemLayout;
    const key = typeof viewIndex !== 'undefined' ? `${type}_${viewIndex}` : `${type}`;

    let component = null;
    switch (type) {
        case ViewType.CANVAS:
            component = <CanvasWrapperComponent />;
            break;
        case ViewType.CANVAS_3D:
            component = <PerspectiveViewComponent />;
            break;
        case ViewType.RELATED_IMAGE:
            component = <ContextImage offset={offset} />;
            break;
        case ViewType.CANVAS_3D_FRONT:
            component = <FrontViewComponent />;
            break;
        case ViewType.CANVAS_3D_SIDE:
            component = <SideViewComponent />;
            break;
        case ViewType.CANVAS_3D_TOP:
            component = <TopViewComponent />;
            break;
        default:
            component = <div> Undefined view </div>;
    }

    return (
        <div className='cvat-canvas-grid-item' key={key}>
            <DragOutlined className='cvat-grid-item-drag-handler' />
            { component }
        </div>
    );
};

function CanvasLayout({ type }: { type?: DimensionType }): JSX.Element {
    const NUM_OF_ROWS = 12;
    const MARGIN = 8;
    const [rowHeight, setRowHeight] = useState<number>(Math.floor(window.screen.availHeight / NUM_OF_ROWS));
    const relatedFiles = useSelector((state: CombinedState) => state.annotation.player.frame.relatedFiles);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasBackgroundColor = useSelector((state: CombinedState) => state.settings.player.canvasBackgroundColor);
    const getLayout = useCallback(() => {
        if (type === DimensionType.DIM_2D) {
            if (!relatedFiles) return defaultLayout.CANVAS_NO_RELATED;
            if (relatedFiles === 1) return defaultLayout.CANVAS_ONE_RELATED;
            if (relatedFiles === 2) return defaultLayout.CANVAS_TWO_RELATED;
            return defaultLayout.CANVAS_THREE_PLUS_RELATED;
        }

        if (!relatedFiles) return defaultLayout.CANVAS_3D_NO_RELATED;
        if (relatedFiles === 1) return defaultLayout.CANVAS_3D_ONE_RELATED;
        if (relatedFiles === 2) return defaultLayout.CANVAS_3D_TWO_RELATED;
        return defaultLayout.CANVAS_3D_THREE_PLUS_RELATED;
    }, [type, relatedFiles]);

    const onLayoutChange = useCallback(() => {
        if (canvasInstance) {
            canvasInstance.fitCanvas();
            canvasInstance.fit();
        }
    }, [canvasInstance]);

    useEffect(() => {
        const container = window.document.getElementsByClassName('cvat-annotation-layout-content')[0];
        if (container) {
            const { height } = container.getBoundingClientRect();
            // https://github.com/react-grid-layout/react-grid-layout/issues/628#issuecomment-1228453084
            setRowHeight(Math.floor((height - MARGIN * (NUM_OF_ROWS + 4)) / NUM_OF_ROWS));
        }

        setTimeout(() => {
            if (canvasInstance) {
                canvasInstance.fitCanvas();
                canvasInstance.fit();
            }
        });
    }, []);

    const children = getLayout().map((value: ItemLayout) => ViewFabric((value)));
    const layout = getLayout().map((value: ItemLayout) => ({
        x: value.x,
        y: value.y,
        w: value.w,
        h: value.h,
        i: typeof (value.viewIndex) !== 'undefined' ? `${value.viewType}_${value.viewIndex}` : `${value.viewType}`,
    }));

    return (
        <Layout.Content>
            <ReactGridLayout
                style={{ background: canvasBackgroundColor }}
                className='cvat-canvas-grid-root'
                rowHeight={rowHeight}
                layout={layout}
                onLayoutChange={onLayoutChange}
                onResize={onLayoutChange}
                resizeHandle={(_: any, ref: React.MutableRefObject<HTMLDivElement>) => (
                    <div ref={ref} className='cvat-grid-item-resize-handler react-resizable-handle' />
                )}
                draggableHandle='.cvat-grid-item-drag-handler'
            >
                { children }
            </ReactGridLayout>
            { type === DimensionType.DIM_3D && <CanvasWrapper3DContainer /> }
        </Layout.Content>
    );
}

CanvasLayout.defaultProps = {
    type: DimensionType.DIM_2D,
};

CanvasLayout.PropType = {
    type: PropTypes.oneOf(Object.values(DimensionType)),
};

export default React.memo(CanvasLayout);
