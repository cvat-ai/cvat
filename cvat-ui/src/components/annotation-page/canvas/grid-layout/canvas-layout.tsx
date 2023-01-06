// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import 'react-grid-layout/css/styles.css';

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import RGL, { WidthProvider } from 'react-grid-layout';
import PropTypes from 'prop-types';
import Layout from 'antd/lib/layout';
import { DragOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';

import { DimensionType, CombinedState } from 'reducers';
import CanvasWrapperComponent from 'components/annotation-page/canvas/views/canvas2d/canvas-wrapper';
import CanvasWrapper3DComponent, {
    PerspectiveViewComponent,
    TopViewComponent,
    SideViewComponent,
    FrontViewComponent,
} from 'components/annotation-page/canvas/views/canvas3d/canvas-wrapper3D';
import ContextImage from 'components/annotation-page/canvas/views/context-image/context-image';
import defaultLayout, { ItemLayout, ViewType } from './canvas-layout.conf';

const ReactGridLayout = WidthProvider(RGL);

const ViewFabric = (itemLayout: ItemLayout): JSX.Element => {
    const { viewType: type, offset } = itemLayout;

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

    return component;
};

function CanvasLayout({ type }: { type?: DimensionType }): JSX.Element {
    const NUM_OF_ROWS = 12;
    const MARGIN = 8;
    const PADDING = MARGIN / 2;
    const computeRowHeight = (): number => {
        const container = window.document.getElementsByClassName('cvat-annotation-header')[0];
        if (container) {
            const height = window.innerHeight - container.getBoundingClientRect().bottom;
            // https://github.com/react-grid-layout/react-grid-layout/issues/628#issuecomment-1228453084
            return Math.floor((height - MARGIN * (NUM_OF_ROWS)) / NUM_OF_ROWS);
        }

        return window.innerHeight;
    };

    const [rowHeight, setRowHeight] = useState<number>(Math.floor(window.screen.availHeight / NUM_OF_ROWS));
    const [fullscreenKey, setFullscreenKey] = useState<string>('');
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

    const fitCanvas = useCallback(() => {
        if (canvasInstance) {
            canvasInstance.fitCanvas();
            canvasInstance.fit();
        }
    }, [canvasInstance]);

    useEffect(() => {
        const onResize = (): void => {
            setRowHeight(computeRowHeight());
            const [el] = window.document.getElementsByClassName('cvat-canvas-grid-root');
            if (el) {
                el.addEventListener('transitionend', () => {
                    fitCanvas();
                }, { once: true });
            }
        };

        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, [fitCanvas]);

    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, []);

    const layoutConfig = getLayout();
    const children = layoutConfig.map((value: ItemLayout) => ViewFabric(value));
    const layout = layoutConfig.map((value: ItemLayout) => ({
        x: value.x,
        y: value.y,
        w: value.w,
        h: value.h,
        i: typeof (value.viewIndex) !== 'undefined' ? `${value.viewType}_${value.viewIndex}` : `${value.viewType}`,
    }));

    return (
        <Layout.Content>
            <ReactGridLayout
                maxRows={12}
                style={{ background: canvasBackgroundColor }}
                containerPadding={[PADDING, PADDING]}
                margin={[MARGIN, MARGIN]}
                className='cvat-canvas-grid-root'
                rowHeight={rowHeight}
                layout={layout}
                onLayoutChange={fitCanvas}
                onResize={fitCanvas}
                resizeHandle={(_: any, ref: React.MutableRefObject<HTMLDivElement>) => (
                    <div ref={ref} className='cvat-grid-item-resize-handler react-resizable-handle' />
                )}
                draggableHandle='.cvat-grid-item-drag-handler'
            >
                { children.map((child: JSX.Element, idx: number): JSX.Element => {
                    const { viewType, viewIndex } = layoutConfig[idx];
                    const key = typeof viewIndex !== 'undefined' ? `${viewType}_${viewIndex}` : `${viewType}`;
                    return (
                        <div
                            style={fullscreenKey === key ? { backgroundColor: canvasBackgroundColor } : {}}
                            className={fullscreenKey === key ?
                                'cvat-canvas-grid-item cvat-canvas-grid-fullscreen-item' :
                                'cvat-canvas-grid-item'}
                            key={key}
                        >
                            <DragOutlined className='cvat-grid-item-drag-handler' />
                            {fullscreenKey === key ? (
                                <FullscreenExitOutlined
                                    className='cvat-grid-item-fullscreen-handler'
                                    onClick={() => {
                                        window.dispatchEvent(new Event('resize'));
                                        setFullscreenKey('');
                                    }}
                                />
                            ) : (
                                <FullscreenOutlined
                                    className='cvat-grid-item-fullscreen-handler'
                                    onClick={() => {
                                        window.dispatchEvent(new Event('resize'));
                                        setFullscreenKey(key);
                                    }}
                                />
                            )}

                            { child }
                        </div>
                    );
                }) }
            </ReactGridLayout>
            { type === DimensionType.DIM_3D && <CanvasWrapper3DComponent /> }
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
