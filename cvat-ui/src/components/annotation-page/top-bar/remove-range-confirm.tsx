// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useState } from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';
import Checkbox from 'antd/lib/checkbox';

interface Props {
    visible: boolean;
    stopFrame: number;
    removeinRange(startnumber:number, endnumber:number, deltrack_keyframes_only:boolean): void;
    cancel(): void;
}

export default function RemoveRangeConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        stopFrame,
        removeinRange,
        cancel,
    } = props;

    const minStartFrames = 0;

    const [startFrame, managestart] = useState<number>(0);
    const [endFrame, manageend] = useState<number>(1);
    const [deltrack_keyframes_only, managedeltrack_keyframes_only] = useState<Boolean>(false);

    const minEndFrames = Math.max(startFrame,1);

    return (
        <Modal
            okType='primary'
            okText='Yes'
            cancelText='Cancel'
            onOk={()=>{
                removeinRange(startFrame,endFrame,deltrack_keyframes_only);
                cancel();
            }}
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
                            managestart(value);
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
                            value= Math.floor(clamp(+value, 1, stopFrame));
                            manageend(value);
                        }
                    }}
                />
                <Text>frame</Text>,<br></br><br></br>
                <Checkbox onChange={()=>{ managedeltrack_keyframes_only(!deltrack_keyframes_only);}}>Delete only track keyframes</Checkbox>
            </div>
        </Modal>
    );
}
