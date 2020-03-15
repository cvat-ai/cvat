// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Modal,
    InputNumber,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface Props {
    visible: boolean;
    propagateFrames: number;
    propagateUpToFrame: number;
    propagateObject(): void;
    cancel(): void;
    changePropagateFrames(value: number | undefined): void;
    changeUpToFrame(value: number | undefined): void;
}

export default function PropagateConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        propagateFrames,
        propagateUpToFrame,
        propagateObject,
        changePropagateFrames,
        changeUpToFrame,
        cancel,
    } = props;

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
                <InputNumber size='small' min={1} value={propagateFrames} onChange={changePropagateFrames} />
                {
                    propagateFrames > 1
                        ? <Text> frames </Text>
                        : <Text> frame </Text>
                }
                <Text>up to the </Text>
                <InputNumber size='small' value={propagateUpToFrame} onChange={changeUpToFrame} />
                <Text>frame</Text>
            </div>
        </Modal>
    );
}
