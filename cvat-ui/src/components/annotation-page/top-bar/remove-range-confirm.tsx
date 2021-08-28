// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';

interface Props {
    visible: boolean;
    startFrame: number;
    endFrame: number;
    frameNumber: number;
    stopFrame: number;
    removeinRange(): void;
    cancel(): void;
    changeRemoveAnnotationsRange(startFrame: number, endFrame: number): void;
}

export default function RemoveRangeConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        startFrame,
        endFrame,
        frameNumber,
        stopFrame,
        removeinRange,
        changeRemoveAnnotationsRange,
        cancel,
    } = props;

    const minStartFrames = 0;

    const minEndFrames = Math.max(startFrame,0);

    return (
        <Modal
            okType='primary'
            okText='Yes'
            cancelText='Cancel'
            onOk={removeinRange}
            onCancel={cancel}
            title='Confirm to remove annotations in range'
            visible={visible}
        >
            <div className='cvat-propagate-confirm'>
                <Text>Do you want to remove the annotations on</Text>
                <InputNumber
                    className='cvat-propagate-confirm-object-on-frames'
                    size='small'
                    min={minStartFrames}
                    max={stopFrame}
                    value={startFrame}
                    onChange={(value: number | undefined | string) => {
                        if (typeof value !== 'undefined') {
                            value=Math.floor(clamp(+value, 0, stopFrame-1));
                            changeRemoveAnnotationsRange(value,endFrame);
                        }
                    }}
                />
                {startFrame > 1 ? <Text> frames </Text> : <Text> frame </Text>}
                <Text>up to the </Text>
                <InputNumber
                    className='cvat-propagate-confirm-object-up-to-frame'
                    size='small'
                    min={minEndFrames}
                    max={stopFrame}
                    value={endFrame}
                    onChange={(value: number | undefined | string) => {
                        if (typeof value !== 'undefined') {
                            value=Math.floor(clamp(+value, 1, stopFrame));
                            changeRemoveAnnotationsRange(startFrame,value);
                        }
                    }}
                />
                <Text>frame</Text>
            </div>
        </Modal>
    );
}
