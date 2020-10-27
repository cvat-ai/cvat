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
                    <Icon type='lock' onClick={unlockStates} />
                ) : (
                    <Icon type='unlock' onClick={lockStates} />
                )}
            </Col>
            <Col span={3}>
                {statesHidden ? (
                    <Icon type='eye-invisible' onClick={showStates} />
                ) : (
                    <Icon type='eye' onClick={hideStates} />
                )}
            </Col>
        </Row>
    );
}

export default React.memo(LabelItemComponent);
