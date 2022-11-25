// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import { Row, Col } from 'antd/lib/grid';
import Slider from 'antd/lib/slider';
import { clamp } from 'utils/math';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { propagateObjectAsync, switchPropagateVisibility } from 'actions/annotation-actions';
import { CombinedState } from 'reducers';

export enum PropagateDirection {
    FORWARD = 'forward',
    BACKWARD = 'backward',
}

function PropagateConfirmComponent(): JSX.Element {
    const dispatch = useDispatch();
    const visible = useSelector((state: CombinedState) => state.annotation.propagate.visible);
    const frameNumber = useSelector((state: CombinedState) => state.annotation.player.frame.number);
    const startFrame = useSelector((state: CombinedState) => state.annotation.job.instance.startFrame);
    const stopFrame = useSelector((state: CombinedState) => state.annotation.job.instance.stopFrame);
    const [targetFrame, setTargetFrame] = useState<number>(frameNumber);

    const propagateFrames = Math.abs(targetFrame - frameNumber);
    const propagateDirection = targetFrame >= frameNumber ? PropagateDirection.FORWARD : PropagateDirection.BACKWARD;

    useEffect(() => {
        const propagateForwardAvailable = stopFrame - frameNumber >= 1;
        const propagateBackwardAvailable = frameNumber - startFrame >= 1;
        if (propagateForwardAvailable) {
            setTargetFrame(stopFrame);
        } else if (propagateBackwardAvailable) {
            setTargetFrame(startFrame);
        }
    }, [visible]);

    return (
        <Modal
            okType='primary'
            okText='Yes'
            cancelText='Cancel'
            onOk={() => {
                dispatch(propagateObjectAsync(frameNumber, targetFrame))
                    .then(() => dispatch(switchPropagateVisibility(false)));
            }}
            onCancel={() => dispatch(switchPropagateVisibility(false))}
            title='Confirm propagation'
            visible={visible}
            destroyOnClose
            okButtonProps={{ disabled: !propagateFrames }}
        >
            <div className='cvat-propagate-confirm'>
                <Row>
                    <Col>
                        <Text>Please, specify a direction</Text>
                    </Col>
                    <Col offset={1}>
                        <Radio.Group
                            value={propagateDirection}
                            onChange={(e: RadioChangeEvent) => {
                                if (e.target.value === PropagateDirection.FORWARD) {
                                    setTargetFrame(clamp(frameNumber + propagateFrames, startFrame, stopFrame));
                                } else {
                                    setTargetFrame(clamp(frameNumber - propagateFrames, startFrame, stopFrame));
                                }
                            }}
                        >
                            <Radio.Button disabled={frameNumber === startFrame} value={PropagateDirection.BACKWARD}>
                                <ArrowLeftOutlined />
                            </Radio.Button>
                            <Radio.Button disabled={frameNumber === stopFrame} value={PropagateDirection.FORWARD}>
                                <ArrowRightOutlined />
                            </Radio.Button>
                        </Radio.Group>
                    </Col>
                </Row>
                <Row>
                    <Col>How many copies do you want to create?</Col>
                    <Col offset={1}>
                        <InputNumber
                            className='cvat-propagate-confirm-object-on-frames'
                            size='small'
                            min={0}
                            value={propagateFrames}
                            onChange={(value: number) => {
                                if (typeof value !== 'undefined') {
                                    if (propagateDirection === PropagateDirection.FORWARD) {
                                        setTargetFrame(clamp(frameNumber + +value, startFrame, stopFrame));
                                    } else {
                                        setTargetFrame(clamp(frameNumber - +value, startFrame, stopFrame));
                                    }
                                }
                            }}
                        />
                    </Col>
                </Row>
                <hr />
                <Row>
                    <Col span={24}>
                        <Text>Or specify a range where copies will be created </Text>
                    </Col>
                    <Col span={4}>
                        <InputNumber
                            className='cvat-propagate-confirm-up-to-backward'
                            min={startFrame}
                            max={frameNumber}
                            value={targetFrame > frameNumber ? undefined : targetFrame}
                            onChange={(value: number) => {
                                if (typeof value !== 'undefined') {
                                    setTargetFrame(Math.floor(clamp(+value, startFrame, frameNumber)));
                                }
                            }}
                        />
                    </Col>
                    <Col span={12} offset={1}>
                        <Slider
                            range
                            min={startFrame}
                            max={stopFrame}
                            marks={frameNumber !== targetFrame ? {
                                [frameNumber]: 'FROM',
                                [targetFrame]: 'TO',
                            } : undefined}
                            onChange={([value1, value2]: [number, number]) => {
                                const value = value1 === frameNumber || value1 === targetFrame ? value2 : value1;
                                if (value < frameNumber) {
                                    setTargetFrame(Math.floor(clamp(value, startFrame, frameNumber)));
                                } else {
                                    setTargetFrame(Math.floor(clamp(value, frameNumber, stopFrame)));
                                }
                            }}
                            value={[frameNumber, targetFrame] as [number, number]}
                        />
                    </Col>
                    <Col span={4}>
                        <InputNumber
                            className='cvat-propagate-confirm-up-to-forward'
                            min={frameNumber}
                            max={stopFrame}
                            value={targetFrame < frameNumber ? undefined : targetFrame}
                            onChange={(value: number) => {
                                if (typeof value !== 'undefined') {
                                    setTargetFrame(Math.floor(clamp(+value, frameNumber, stopFrame)));
                                }
                            }}
                        />
                    </Col>
                </Row>
            </div>
        </Modal>
    );
}

export default React.memo(PropagateConfirmComponent);
