// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import {
    LockFilled, UnlockOutlined, EyeInvisibleFilled, EyeOutlined,
} from '@ant-design/icons';

import LabelKeySelectorPopover from './label-key-selector-popover';

interface Props {
    labelName: string;
    labelColor: string;
    labelId: number;
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    label2KeyMap: {
        [key: number]: string;
    };
    hideStates(): void;
    showStates(): void;
    lockStates(): void;
    unlockStates(): void;
}

function LabelItemComponent(props: Props): JSX.Element {
    const {
        labelName,
        labelColor,
        labelId,
        visible,
        statesHidden,
        statesLocked,
        label2KeyMap,
        hideStates,
        showStates,
        lockStates,
        unlockStates,
    } = props;

    const classes = {
        lock: {
            enabled: { className: 'cvat-label-item-button-lock cvat-label-item-button-lock-enabled' },
            disabled: { className: 'cvat-label-item-button-lock' },
        },
        hidden: {
            enabled: { className: 'cvat-label-item-button-hidden cvat-label-item-button-hidden-enabled' },
            disabled: { className: 'cvat-label-item-button-hidden' },
        },
    };

    const labelNumberPair = Object.entries(label2KeyMap).filter((pair) => pair[0] === labelId.toString());

    return (
        <Row
            align='middle'
            justify='space-around'
            className={`cvat-objects-sidebar-label-item${visible ? '' : ' cvat-objects-sidebar-label-item-disabled'}`}
        >
            <Col span={4} style={{ display: 'flex' }}>
                <Button style={{ background: labelColor }} className='cvat-label-item-color-button'>
                    {' '}
                </Button>
            </Col>
            <Col span={11}>
                <Text strong className='cvat-text'>
                    {labelName}
                </Text>
            </Col>
            <Col span={3}>
                <LabelKeySelectorPopover labelId={+labelNumberPair[0][0]}>
                    <Button size='small' ghost type='dashed'>
                        {labelNumberPair.length ? labelNumberPair[0][1] : '\u00A0'}
                    </Button>
                </LabelKeySelectorPopover>
            </Col>
            <Col span={3}>
                {statesLocked ? (
                    <LockFilled {...classes.lock.enabled} onClick={unlockStates} />
                ) : (
                    <UnlockOutlined {...classes.lock.disabled} onClick={lockStates} />
                )}
            </Col>
            <Col span={3}>
                {statesHidden ? (
                    <EyeInvisibleFilled {...classes.hidden.enabled} onClick={showStates} />
                ) : (
                    <EyeOutlined {...classes.hidden.disabled} onClick={hideStates} />
                )}
            </Col>
        </Row>
    );
}

export default React.memo(LabelItemComponent);
