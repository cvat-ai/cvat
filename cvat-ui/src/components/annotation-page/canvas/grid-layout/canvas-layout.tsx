// Copyright (C) CVAT.ai Corporation
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

import config from 'config';
import { DimensionType } from 'cvat-core-wrapper';
import { CombinedState } from 'reducers';
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

const fitLayout = (type: DimensionType, layoutConfig: ItemLayout[]): ItemLayout[] => {
    const updatedLayout: ItemLayout[] = [];

    const relatedViews = layoutConfig
        .filter((item: ItemLayout) => item.viewType === ViewType.RELATED_IMAGE);
    const relatedViewsCols = relatedViews.length > 6 ? 2 : 1;
    let height = Math.floor(config.CANVAS_WORKSPACE_ROWS / (relatedViews.length / relatedViewsCols));
    height = Math.min(height, config.CANVAS_WORKSPACE_DEFAULT_CONTEXT_HEIGHT);
    relatedViews.forEach((view: ItemLayout, i: number) => {
        updatedLayout.push({
            ...view,
            h: height,
            w: relatedViews.length > 6 ? 2 : 3,
            x: relatedViewsCols === 1 ? 9 : 8 + (i % 2) * 2,
            y: height * i,
        });
    });

    let widthAvail = config.CANVAS_WORKSPACE_COLS;
    if (updatedLayout.length > 0) {
        widthAvail -= updatedLayout[0].w * relatedViewsCols;
    }

    if (type === DimensionType.DIMENSION_2D) {
        const canvas = layoutConfig
            .find((item: ItemLayout) => item.viewType === ViewType.CANVAS) as ItemLayout;
        updatedLayout.push({
            ...canvas,
            x: 0,
            y: 0,
            w: widthAvail,
            h: config.CANVAS_WORKSPACE_ROWS,
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
        const helpfulCanvasViewHeight = 3;
        updatedLayout.push({
            ...canvas,
            x: 0,
            y: 0,
            w: widthAvail,
            h: config.CANVAS_WORKSPACE_ROWS - helpfulCanvasViewHeight,
        }, {
            ...top,
            x: 0,
            y: config.CANVAS_WORKSPACE_ROWS,
            w: Math.ceil(widthAvail / 3),
            h: helpfulCanvasViewHeight,
        }, {
            ...side,
            x: Math.ceil(widthAvail / 3),
            y: config.CANVAS_WORKSPACE_ROWS,
            w: Math.ceil(widthAvail / 3),
            h: helpfulCanvasViewHeight,
        }, {
            ...front,
            x: Math.ceil(widthAvail / 3) * 2,
            y: config.CANVAS_WORKSPACE_ROWS,
            w: Math.floor(widthAvail / 3),
            h: helpfulCanvasViewHeight,
        });
    }

    return updatedLayout;
};

function CanvasLayout({ type }: { type?: DimensionType }): JSX.Element {
    const relatedFiles = useSelector((state: CombinedState) => state.annotation.player.frame.relatedFiles);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const canvasBackgroundColor = useSelector((state: CombinedState) => state.settings.player.canvasBackgroundColor);

    const computeRowHeight = (): number => {
        const container = window.document.getElementsByClassName('cvat-annotation-header')[0];
        let containerHeight = window.innerHeight;
        if (container) {
            containerHeight = window.innerHeight - container.getBoundingClientRect().bottom;
            // https://github.com/react-grid-layout/react-grid-layout/issues/628#issuecomment-1228453084
            return Math.floor(
                (containerHeight - config.CANVAS_WORKSPACE_MARGIN * (config.CANVAS_WORKSPACE_ROWS)) /
                config.CANVAS_WORKSPACE_ROWS,
            );
        }

        return 0;
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
            fitCanvas();
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
    }, []);

    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [layoutConfig]);

    const children = layoutConfig.map((value: ItemLayout) => ViewFabric(value));
    const layout = layoutConfig.map((value: ItemLayout) => ({
        x: value.x,
        y: value.y,
        w: value.w,
        h: value.h,
        i: typeof (value.viewIndex) !== 'undefined' ? `${value.viewType}_${value.viewIndex}` : `${value.viewType}`,
    }));

    const singleClassName = 'cvat-canvas-grid-root-single';
    const className = !relatedFiles && children.length <= 1 ?
        `cvat-canvas-grid-root ${singleClassName}` : 'cvat-canvas-grid-root';

    return (
        <Layout.Content>
            { !!rowHeight && (
                <ReactGridLayout
                    cols={config.CANVAS_WORKSPACE_COLS}
                    maxRows={config.CANVAS_WORKSPACE_ROWS}
                    style={{ background: canvasBackgroundColor }}
                    containerPadding={[config.CANVAS_WORKSPACE_PADDING, config.CANVAS_WORKSPACE_PADDING]}
                    margin={[config.CANVAS_WORKSPACE_MARGIN, config.CANVAS_WORKSPACE_MARGIN]}
                    className={className}
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
                        }
                    }}
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
            )}
            { type === DimensionType.DIMENSION_3D && <CanvasWrapper3DComponent /> }
            <div className='cvat-grid-layout-common-setups'>
                <CVATTooltip title='Fit views'>
                    <PicCenterOutlined
                        onClick={() => {
                            setLayoutConfig(fitLayout(type as DimensionType, layoutConfig));
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
                            setLayoutConfig(fitLayout(type as DimensionType, [...layoutConfig, copy]));
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
    type: DimensionType.DIMENSION_2D,
};

CanvasLayout.PropType = {
    type: PropTypes.oneOf(Object.values(DimensionType)),
};

export default React.memo(CanvasLayout);
