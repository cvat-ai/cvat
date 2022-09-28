// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './brush-toolbox-styles.scss';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Icon, {
    CheckOutlined, DragOutlined, PlusOutlined, VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';
import message from 'antd/lib/message';

import { getCore } from 'cvat-core-wrapper';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import {
    BrushIcon, EraserIcon, PolygonMinusIcon, PolygonPlusIcon,
} from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState, ObjectType, ShapeType } from 'reducers';
import LabelSelector from 'components/label-selector/label-selector';
import { rememberObject, updateCanvasBrushTools } from 'actions/annotation-actions';
import useDraggable from './draggable-hoc';

const DraggableArea = (
    <div className='cvat-brush-tools-draggable-area'>
        <DragOutlined />
    </div>
);

const MIN_BRUSH_SIZE = 1;
let polygonFinishingTipShown = false;
function BrushTools(): React.ReactPortal {
    const dispatch = useDispatch();
    const defaultLabelID = useSelector((state: CombinedState) => state.annotation.drawing.activeLabelID);
    const config = useSelector((state: CombinedState) => state.annotation.canvas.brushTools);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const { visible } = config;

    const [activeLabelID, setActiveLabelID] = useState<number | null>(null);
    const [editableState, setEditableState] = useState<any | null>(null);
    const [currentTool, setCurrentTool] = useState<'brush' | 'eraser' | 'polygon-plus' | 'polygon-minus'>('brush');
    const [brushForm, setBrushForm] = useState<'circle' | 'square'>('circle');
    const [[top, left], setTopLeft] = useState([0, 0]);
    const [brushSize, setBrushSize] = useState(10);

    const [removeUnderlyingPixels, setRemoveUnderlyingPixels] = useState(false);
    const dragBar = useDraggable(
        (): number[] => {
            const [element] = window.document.getElementsByClassName('cvat-brush-tools-toolbox');
            if (element) {
                const { offsetTop, offsetLeft } = element as HTMLDivElement;
                return [offsetTop, offsetLeft];
            }

            return [0, 0];
        },
        (newTop, newLeft) => setTopLeft([newTop, newLeft]),
        DraggableArea,
    );

    useEffect(() => {
        setActiveLabelID(defaultLabelID);
    }, [defaultLabelID]);

    useEffect(() => {
        const label = labels.find((_label: any) => _label.id === activeLabelID);
        getCore().config.removeUnderlyingMaskPixels = removeUnderlyingPixels;
        if (visible && label && canvasInstance instanceof Canvas) {
            const onUpdateConfiguration = ({ brushTool }: any): void => {
                if (brushTool?.size) {
                    setBrushSize(Math.max(MIN_BRUSH_SIZE, brushTool.size));
                }
            };

            if (canvasInstance.mode() === CanvasMode.DRAW) {
                canvasInstance.draw({
                    enabled: true,
                    shapeType: ShapeType.MASK,
                    crosshair: false,
                    brushTool: {
                        type: currentTool,
                        size: brushSize,
                        form: brushForm,
                        color: label.color,
                        removeUnderlyingPixels,
                    },
                    onUpdateConfiguration,
                });
            } else if (canvasInstance.mode() === CanvasMode.EDIT && editableState) {
                canvasInstance.edit({
                    enabled: true,
                    state: editableState,
                    brushTool: {
                        type: currentTool,
                        size: brushSize,
                        form: brushForm,
                        color: label.color,
                        removeUnderlyingPixels,
                    },
                    onUpdateConfiguration,
                });
            }
        }

        if (currentTool.startsWith('polygon-') && !polygonFinishingTipShown) {
            message.info('Double click the canvas to finish a polygon', 5, () => {
                polygonFinishingTipShown = true;
            });
        }
    }, [currentTool, brushSize, brushForm, removeUnderlyingPixels, visible, activeLabelID, editableState]);

    useEffect(() => {
        const canvasContainer = window.document.getElementsByClassName('cvat-canvas-container')[0];
        if (canvasContainer) {
            const { offsetTop, offsetLeft } = canvasContainer.parentElement as HTMLElement;
            setTopLeft([offsetTop, offsetLeft]);
        }
    }, []);

    useEffect(() => {
        const hideToolset = (): void => {
            if (visible) {
                dispatch(updateCanvasBrushTools({ visible: false }));
            }
        };

        const showToolset = (e: Event): void => {
            const evt = e as CustomEvent;
            if (evt.detail?.state?.shapeType === ShapeType.MASK ||
                evt.detail.drawData.shapeType === ShapeType.MASK) {
                dispatch(updateCanvasBrushTools({ visible: true }));
            }
        };

        const updateEditableState = (e: Event): void => {
            const evt = e as CustomEvent;
            if (evt.type === 'canvas.editstart' && evt.detail.state) {
                setEditableState(evt.detail.state);
            } else if (editableState) {
                setEditableState(null);
            }
        };

        if (canvasInstance instanceof Canvas) {
            canvasInstance.html().addEventListener('canvas.drawn', hideToolset);
            canvasInstance.html().addEventListener('canvas.canceled', hideToolset);
            canvasInstance.html().addEventListener('canvas.canceled', updateEditableState);
            canvasInstance.html().addEventListener('canvas.drawstart', showToolset);
            canvasInstance.html().addEventListener('canvas.editstart', showToolset);
            canvasInstance.html().addEventListener('canvas.editstart', updateEditableState);
            canvasInstance.html().addEventListener('canvas.editdone', updateEditableState);
        }

        return () => {
            if (canvasInstance instanceof Canvas) {
                canvasInstance.html().removeEventListener('canvas.drawn', hideToolset);
                canvasInstance.html().removeEventListener('canvas.canceled', hideToolset);
                canvasInstance.html().removeEventListener('canvas.canceled', updateEditableState);
                canvasInstance.html().removeEventListener('canvas.drawstart', showToolset);
                canvasInstance.html().removeEventListener('canvas.editstart', showToolset);
                canvasInstance.html().removeEventListener('canvas.editstart', updateEditableState);
                canvasInstance.html().removeEventListener('canvas.editdone', updateEditableState);
            }
        };
    }, [visible]);

    return ReactDOM.createPortal((
        <div className='cvat-brush-tools-toolbox' style={{ top, left, display: visible ? '' : 'none' }}>
            <Button
                type='text'
                className='cvat-brush-tools-finish'
                icon={<CheckOutlined />}
                onClick={() => {
                    if (canvasInstance instanceof Canvas) {
                        if (editableState) {
                            canvasInstance.edit({ enabled: false });
                        } else {
                            canvasInstance.draw({ enabled: false });
                        }
                    }
                }}
            />
            <Button
                type='text'
                disabled={!!editableState}
                className='cvat-brush-tools-continue'
                icon={<PlusOutlined />}
                onClick={() => {
                    if (canvasInstance instanceof Canvas) {
                        canvasInstance.draw({ enabled: false, continue: true });

                        dispatch(
                            rememberObject({
                                activeObjectType: ObjectType.SHAPE,
                                activeShapeType: ShapeType.MASK,
                                activeLabelID: typeof activeLabelID === 'number' ? activeLabelID : undefined,
                            }),
                        );
                    }
                }}
            />
            <hr />
            <Button
                type='text'
                className={['cvat-brush-tools-brush', ...(currentTool === 'brush' ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<Icon component={BrushIcon} />}
                onClick={() => setCurrentTool('brush')}
            />
            <Button
                type='text'
                className={['cvat-brush-tools-eraser', ...(currentTool === 'eraser' ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<Icon component={EraserIcon} />}
                onClick={() => setCurrentTool('eraser')}
            />
            <Button
                type='text'
                className={['cvat-brush-tools-polygon-plus', ...(currentTool === 'polygon-plus' ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<Icon component={PolygonPlusIcon} />}
                onClick={() => setCurrentTool('polygon-plus')}
            />
            <Button
                type='text'
                className={['cvat-brush-tools-polygon-minus', ...(currentTool === 'polygon-minus' ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<Icon component={PolygonMinusIcon} />}
                onClick={() => setCurrentTool('polygon-minus')}
            />
            { ['brush', 'eraser'].includes(currentTool) ? (
                <CVATTooltip title='Brush size [Hold Alt + Right Mouse Click + Drag Left/Right]'>
                    <InputNumber
                        className='cvat-brush-tools-brush-size'
                        value={brushSize}
                        min={MIN_BRUSH_SIZE}
                        formatter={(val: number | undefined) => {
                            if (val) return `${val}px`;
                            return '';
                        }}
                        parser={(val: string | undefined): number => {
                            if (val) return +val.replace('px', '');
                            return 0;
                        }}
                        onChange={(value: number) => {
                            if (Number.isInteger(value) && value >= MIN_BRUSH_SIZE) {
                                setBrushSize(value);
                            }
                        }}
                    />
                </CVATTooltip>
            ) : null}
            <Select value={brushForm} onChange={(value: 'circle' | 'square') => setBrushForm(value)}>
                <Select.Option value='circle'>Circle</Select.Option>
                <Select.Option value='square'>Square</Select.Option>
            </Select>
            <Button
                type='text'
                className={['cvat-brush-tools-underlying-pixels', ...(removeUnderlyingPixels ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<VerticalAlignBottomOutlined />}
                onClick={() => setRemoveUnderlyingPixels(!removeUnderlyingPixels)}
            />
            <LabelSelector
                labels={labels}
                value={activeLabelID}
                onChange={(label: number) => {
                    setActiveLabelID(label);
                }}
            />
            { dragBar }
        </div>
    ), window.document.body);
}

export default React.memo(BrushTools);
