// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

interface Props {
    labelName: string;
    labelColor: string;
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    hideStates(): void;
    showStates(): void;
    lockStates(): void;
    unlockStates(): void;
}

function LabelItemComponent(props: Props): JSX.Element {
    const {
        labelName,
        labelColor,
        visible,
        statesHidden,
        statesLocked,
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

    return (
        <Row
            type='flex'
            align='middle'
            justify='space-around'
            className='cvat-objects-sidebar-label-item'
            style={{ display: visible ? 'flex' : 'none' }}
        >
            <Col span={4}>
                <Button style={{ background: labelColor }} className='cvat-label-item-color-button' />
            </Col>
            <Col span={14}>
                <Text strong className='cvat-text'>
                    {labelName}
                </Text>
            </Col>
            <Col span={3}>
                {statesLocked ? (
                    <Icon {...classes.lock.enabled} type='lock' onClick={unlockStates} />
                ) : (
                    <Icon {...classes.lock.disabled} type='unlock' onClick={lockStates} />
                )}
            </Col>
            <Col span={3}>
                {statesHidden ? (
                    <Icon {...classes.hidden.enabled} type='eye-invisible' onClick={showStates} />
                ) : (
                    <Icon {...classes.hidden.disabled} type='eye' onClick={hideStates} />
                )}
            </Col>
        </Row>
    );
}

export default React.memo(LabelItemComponent);
