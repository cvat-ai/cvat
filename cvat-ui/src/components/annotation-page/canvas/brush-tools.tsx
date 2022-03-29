// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './brush-toolbox-styles.scss';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Icon, {
    BgColorsOutlined, CheckOutlined, DragOutlined, PlusOutlined,
} from '@ant-design/icons';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';

import { Canvas } from 'cvat-canvas-wrapper';
import { BrushIcon, EraserIcon } from 'icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState, ObjectType, ShapeType } from 'reducers/interfaces';
import LabelSelector from 'components/label-selector/label-selector';
import { rememberObject, updateCanvasBrushTools } from 'actions/annotation-actions';
import useDraggable from './draggable-hoc';

const DraggableArea = (
    <div className='cvat-brush-tools-draggable-area'>
        <DragOutlined />
    </div>
);

function BrushTools(): React.ReactPortal {
    const dispatch = useDispatch();
    const defaultLabelID = useSelector((state: CombinedState) => state.annotation.drawing.activeLabelID);
    const config = useSelector((state: CombinedState) => state.annotation.canvas.brushTools);
    const canvasInstance = useSelector((state: CombinedState) => state.annotation.canvas.instance);
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const { visible } = config;

    const [activeLabelID, setActiveLabelID] = useState<null | number>(null);
    const [currentTool, setCurrentTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
    const [brushForm, setBrushForm] = useState<'circle' | 'square'>('circle');
    const [[top, left], setTopLeft] = useState([0, 0]);
    const [brushSize, setBrushSize] = useState(10);
    const [fillThreshold, setFillThreshild] = useState(10);

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
        if (visible && label && canvasInstance instanceof Canvas) {
            canvasInstance.draw({
                enabled: true,
                shapeType: ShapeType.MASK,
                crosshair: false,
                brushTool: {
                    type: currentTool,
                    size: brushSize,
                    form: brushForm,
                    color: label.color,
                    fillThreshold,
                    removeUnderlyingPixels,
                },
            });
        }
    }, [currentTool, brushSize, brushForm, removeUnderlyingPixels, visible, activeLabelID]);

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
            if (evt.detail.drawData.shapeType === ShapeType.MASK) {
                dispatch(updateCanvasBrushTools({ visible: true }));
            }
        };

        if (canvasInstance instanceof Canvas) {
            canvasInstance.html().addEventListener('canvas.drawn', hideToolset);
            canvasInstance.html().addEventListener('canvas.canceled', hideToolset);
            canvasInstance.html().addEventListener('canvas.drawstart', showToolset);
        }

        return () => {
            if (canvasInstance instanceof Canvas) {
                canvasInstance.html().removeEventListener('canvas.drawn', hideToolset);
                canvasInstance.html().removeEventListener('canvas.canceled', hideToolset);
                canvasInstance.html().removeEventListener('canvas.drawstart', showToolset);
            }
        };
    }, [visible]);

    const MIN_BRUSH_SIZE = 1;
    const MIN_FILL_THRESHOLD = 1;
    const MAX_FILL_THRESHOLD = 255;
    return ReactDOM.createPortal((
        <div className='cvat-brush-tools-toolbox' style={{ top, left, display: visible ? '' : 'none' }}>
            <Button
                type='text'
                className='cvat-brush-tools-finish'
                icon={<CheckOutlined />}
                onClick={() => {
                    if (canvasInstance) {
                        canvasInstance.draw({ enabled: false });
                    }
                }}
            />
            <Button
                type='text'
                className='cvat-brush-tools-continue'
                icon={<PlusOutlined />}
                onClick={() => {
                    if (canvasInstance) {
                        canvasInstance.draw({ enabled: false, continue: true });

                        dispatch(
                            rememberObject({
                                activeObjectType: ObjectType.SHAPE,
                                activeShapeType: ShapeType.MASK,
                                activeLabelID: Number.isInteger(activeLabelID) ? activeLabelID : undefined,
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
                className={['cvat-brush-tools-fill', ...(currentTool === 'fill' ? ['cvat-brush-tools-active-tool'] : [])].join(' ')}
                icon={<BgColorsOutlined />}
                onClick={() => setCurrentTool('fill')}
            />
            { ['brush', 'eraser'].includes(currentTool) ? (
                <CVATTooltip title='Brush size'>
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
                            if (Number.isInteger(value) && value >= MIN_FILL_THRESHOLD) {
                                setBrushSize(value);
                            }
                        }}
                    />
                </CVATTooltip>
            ) : null}
            { currentTool === 'fill' ? (
                <CVATTooltip title='Tolerance'>
                    <InputNumber
                        className='cvat-brush-tools-fill-tolerance'
                        value={brushSize}
                        min={MIN_FILL_THRESHOLD}
                        max={MAX_FILL_THRESHOLD}
                        formatter={(val: number | undefined) => {
                            if (val) return `${val}px`;
                            return '';
                        }}
                        parser={(val: string | undefined): number => {
                            if (val) return +val.replace('px', '');
                            return 0;
                        }}
                        onChange={(value: number) => {
                            if (Number.isInteger(value) && value >= MIN_FILL_THRESHOLD && value <= MAX_FILL_THRESHOLD) {
                                setFillThreshild(value);
                            }
                        }}
                    />
                </CVATTooltip>
            ) : null}
            <Select value={brushForm} onChange={(value: 'circle' | 'square') => setBrushForm(value)}>
                <Select.Option value='circle'>Circle</Select.Option>
                <Select.Option value='square'>Square</Select.Option>
            </Select>
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

// TODO: do we need top, left here?
