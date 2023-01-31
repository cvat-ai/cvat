// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';

interface Props {
    visible: boolean;
    propagateFrames: number;
    propagateUpToFrame: number;
    stopFrame: number;
    frameNumber: number;
    propagateObject(): void;
    cancel(): void;
    changePropagateFrames(value: number): void;
    changeUpToFrame(value: number): void;
}

export default function PropagateConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        propagateFrames,
        propagateUpToFrame,
        stopFrame,
        frameNumber,
        propagateObject,
        changePropagateFrames,
        changeUpToFrame,
        cancel,
    } = props;

    const minPropagateFrames = 1;

    return (
        <Modal
            okType='primary'
            okText='Yes'
            cancelText='Cancel'
            onOk={propagateObject}
            onCancel={cancel}
            title='Confirm propagation'
            visible={visible}
        >
            <div className='cvat-propagate-confirm'>
                <Text>Do you want to make a copy of the object on</Text>
                <InputNumber
                    className='cvat-propagate-confirm-object-on-frames'
                    size='small'
                    min={minPropagateFrames}
                    value={propagateFrames}
                    onChange={(value: number | undefined | string) => {
                        if (typeof value !== 'undefined') {
                            changePropagateFrames(
                                Math.floor(clamp(+value, minPropagateFrames, Number.MAX_SAFE_INTEGER)),
                            );
                        }
                    }}
                />
                {propagateFrames > 1 ? <Text> frames </Text> : <Text> frame </Text>}
                <Text>up to the </Text>
                <InputNumber
                    className='cvat-propagate-confirm-object-up-to-frame'
                    size='small'
                    value={propagateUpToFrame}
                    min={frameNumber + 1}
                    max={stopFrame}
                    onChange={(value: number | undefined | string) => {
                        if (typeof value !== 'undefined') {
                            changeUpToFrame(Math.floor(clamp(+value, frameNumber + 1, stopFrame)));
                        }
                    }}
                />
                <Text>frame</Text>
            </div>
        </Modal>
    );
}
