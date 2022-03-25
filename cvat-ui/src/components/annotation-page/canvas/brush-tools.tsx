// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './brush-toolbox-styles.scss';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'antd/lib/button';
import Icon, { BgColorsOutlined, CheckOutlined, DragOutlined, PlusOutlined } from '@ant-design/icons';
import InputNumber from 'antd/lib/input-number';
import Select from 'antd/lib/select';

import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';
import { updateCanvasBrushTools } from 'actions/annotation-actions';
import LabelSelector from 'components/label-selector/label-selector';
import useDraggable from './draggable-hoc';
import { BrushIcon, EraserIcon } from 'icons';

function BrushTools(): React.ReactPortal | null {
    const defaultLabelID = useSelector((state: CombinedState) => state.annotation.drawing.activeLabelID);
    const config = useSelector((state: CombinedState) => state.annotation.canvas.brushTools);
    const { visible } = config;
    const labels = useSelector((state: CombinedState) => state.annotation.job.labels);
    const [activeLabelID, setActiveLabelID] = useState<null | number>(null);
    const [currentTool, setCurrentTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
    const [[top, left], setTopLeft] = useState([0, 0]);
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
        (
            <div className='cvat-brush-tools-draggable-area'>
                <DragOutlined />
            </div>
        ),
    );

    useEffect(() => {
        setActiveLabelID(defaultLabelID);
    }, [defaultLabelID]);

    useEffect(() => {
        const canvasContainer = window.document.getElementsByClassName('cvat-canvas-container')[0];
        if (canvasContainer) {
            const { offsetTop, offsetLeft } = canvasContainer.parentElement as HTMLElement;
            setTopLeft([offsetTop, offsetLeft]);
        }
    }, []);

    if (!visible) {
        return null;
    }

    return ReactDOM.createPortal((
        <div className='cvat-brush-tools-toolbox' style={{ top, left }}>
            <Button type='text' className='cvat-brush-tools-finish' icon={<CheckOutlined />} />
            <Button type='text' className='cvat-brush-tools-continue' icon={<PlusOutlined />} />
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
            <CVATTooltip title='Brush size'>
                <InputNumber
                    value={10}
                    min={1}
                    formatter={(val: number | undefined) => {
                        if (val) return `${val}px`;
                        return '';
                    }}
                    parser={(val: string | undefined): number => {
                        if (val) return +val.replace('px', '');
                        return 0;
                    }}
                />
            </CVATTooltip>
            <Select value='circle'>
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
