// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import 'react-grid-layout/css/styles.css';

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import RGL, { WidthProvider } from 'react-grid-layout';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import Layout from 'antd/lib/layout';
import {
    CloseOutlined,
    DragOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    PicCenterOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';

import { DimensionType, CombinedState } from 'reducers';
import CanvasWrapperComponent from 'components/annotation-page/canvas/views/canvas2d/canvas-wrapper';
import CanvasWrapper3DComponent, {
    PerspectiveViewComponent,
    TopViewComponent,
    SideViewComponent,
    FrontViewComponent,
} from 'components/annotation-page/canvas/views/canvas3d/canvas-wrapper3D';
import ContextImage from 'components/annotation-page/canvas/views/context-image/context-image';
import CVATTooltip from 'components/common/cvat-tooltip';
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

const fitLayout = (type: DimensionType, layoutConfig: ItemLayout[], rows: number): ItemLayout[] => {
    const updatedLayout: ItemLayout[] = [];

    const relatedViews = layoutConfig
        .filter((item: ItemLayout) => item.viewType === ViewType.RELATED_IMAGE);
    const cols = relatedViews.length > 6 ? 2 : 1;
    const height = Math.floor(rows / (relatedViews.length / cols));
    relatedViews.forEach((view: ItemLayout, i: number) => {
        updatedLayout.push({
            ...view,
            h: height,
            w: relatedViews.length > 6 ? 2 : 3,
            x: cols === 1 ? 9 : 8 + (i % 2) * 2,
            y: height * i,
        });
    });

    let widthAvail = 12;
    if (relatedViews.length > 6) {
        widthAvail = 8;
    } else if (relatedViews.length > 0) {
        widthAvail = 9;
    }

    if (type === DimensionType.DIM_2D) {
        const canvas = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS) as ItemLayout;
        updatedLayout.push({
            ...canvas,
            x: 0,
            y: 0,
            w: widthAvail,
            h: 12,
        });
    } else {
        const canvas = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS_3D) as ItemLayout;
        const top = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS_3D_TOP) as ItemLayout;
        const side = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS_3D_SIDE) as ItemLayout;
        const front = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS_3D_FRONT) as ItemLayout;
        updatedLayout.push({
            ...canvas,
            x: 0,
            y: 0,
            w: widthAvail,
            h: 9,
        }, {
            ...top, x: 0, y: 9, w: Math.ceil(widthAvail / 3), h: 3,
        },
        {
            ...side, x: 3, y: 9, w: Math.floor(widthAvail / 3), h: 3,
        },
        {
            ...front, x: 6, y: 9, w: Math.floor(widthAvail / 3), h: 3,
        });
    }

    return updatedLayout;
};

function CanvasLayout({ type }: { type?: DimensionType }): JSX.Element {
    const NUM_OF_ROWS = 12;
    const MARGIN = 8;
    const PADDING = MARGIN / 2;

    const relatedFiles = useSelector((state: CombinedState) => state.annotation.player.frame.relatedFiles);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasBackgroundColor = useSelector((state: CombinedState) => state.settings.player.canvasBackgroundColor);

    const computeRowHeight = (): number => {
        const container = window.document.getElementsByClassName('cvat-annotation-header')[0];
        let containerHeight = window.innerHeight;
        if (container) {
            containerHeight = window.innerHeight - container.getBoundingClientRect().bottom;
        }

        // https://github.com/react-grid-layout/react-grid-layout/issues/628#issuecomment-1228453084
        return Math.floor((containerHeight - MARGIN * (NUM_OF_ROWS)) / NUM_OF_ROWS);
    };

    const getLayout = useCallback(() => (
        defaultLayout[(type as DimensionType).toUpperCase() as '2D' | '3D'][Math.min(relatedFiles, 3)]
    ), [type, relatedFiles]);

    const [layoutConfig, setLayoutConfig] = useState<ItemLayout[]>(getLayout());
    const [rowHeight, setRowHeight] = useState<number>(Math.floor(computeRowHeight()));
    const [fullscreenKey, setFullscreenKey] = useState<string>('');

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
        setRowHeight(computeRowHeight());
        // window.dispatchEvent(new Event('resize'));
    }, []);

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
                maxRows={NUM_OF_ROWS}
                style={{ background: canvasBackgroundColor }}
                containerPadding={[PADDING, PADDING]}
                margin={[MARGIN, MARGIN]}
                className='cvat-canvas-grid-root'
                rowHeight={rowHeight}
                layout={layout}
                onLayoutChange={(updatedLayout: RGL.Layout[]) => {
                    const transformedLayout = layoutConfig.map((itemLayout: ItemLayout, i: number): ItemLayout => ({
                        ...itemLayout,
                        x: updatedLayout[i].x,
                        y: updatedLayout[i].y,
                        w: updatedLayout[i].w,
                        h: updatedLayout[i].h,
                    }));

                    if (!isEqual(layoutConfig, transformedLayout)) {
                        setLayoutConfig(transformedLayout);
                        fitCanvas();
                    }
                }}
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
                            <CloseOutlined
                                className='cvat-grid-item-close-button'
                                style={{
                                    pointerEvents: viewType !== ViewType.RELATED_IMAGE ? 'none' : undefined,
                                    opacity: viewType !== ViewType.RELATED_IMAGE ? 0.2 : undefined,
                                }}
                                onClick={() => {
                                    if (viewType === ViewType.RELATED_IMAGE) {
                                        setLayoutConfig(
                                            layoutConfig
                                                .filter((item: ItemLayout) => !(
                                                    item.viewType === viewType && item.viewIndex === viewIndex
                                                )),
                                        );
                                    }
                                }}
                            />
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
            <div className='cvat-grid-layout-common-setups'>
                <CVATTooltip title='Fit views'>
                    <PicCenterOutlined
                        onClick={() => {
                            setLayoutConfig(fitLayout(type as DimensionType, layoutConfig, NUM_OF_ROWS));
                            window.dispatchEvent(new Event('resize'));
                        }}
                    />
                </CVATTooltip>
                <CVATTooltip title='Add context image'>
                    <PlusOutlined
                        style={{
                            pointerEvents: !relatedFiles ? 'none' : undefined,
                            opacity: !relatedFiles ? 0.2 : undefined,
                        }}
                        disabled={!!relatedFiles}
                        onClick={() => {
                            const MAXIMUM_RELATED = 12;
                            const existingRelated = layoutConfig
                                .filter((configItem: ItemLayout) => configItem.viewType === ViewType.RELATED_IMAGE);

                            if (existingRelated.length >= MAXIMUM_RELATED) {
                                return;
                            }

                            if (existingRelated.length === 0) {
                                setLayoutConfig(defaultLayout[type?.toUpperCase() as '2D' | '3D']['1']);
                                return;
                            }

                            const viewIndexes = existingRelated
                                .map((item: ItemLayout) => +(item.viewIndex as string)).sort();
                            const max = Math.max(...viewIndexes);
                            let viewIndex = max + 1;
                            for (let i = 0; i < max + 1; i++) {
                                if (!viewIndexes.includes(i)) {
                                    viewIndex = i;
                                    break;
                                }
                            }

                            const latest = existingRelated[existingRelated.length - 1];
                            const copy = { ...latest, offset: [0, viewIndex], viewIndex: `${viewIndex}` };
                            setLayoutConfig(fitLayout(type as DimensionType, [...layoutConfig, copy], NUM_OF_ROWS));
                            window.dispatchEvent(new Event('resize'));
                        }}
                    />
                </CVATTooltip>
                <CVATTooltip title='Reload layout'>
                    <ReloadOutlined onClick={() => {
                        setLayoutConfig([...getLayout()]);
                        window.dispatchEvent(new Event('resize'));
                    }}
                    />
                </CVATTooltip>
            </div>
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
