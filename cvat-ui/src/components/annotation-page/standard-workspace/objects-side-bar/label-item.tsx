// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Icon,
    Popover,
    Button,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import ColorChanger from 'components/annotation-page/standard-workspace/objects-side-bar/color-changer';

interface Props {
    labelName: string;
    labelColor: string;
    labelColors: string[];
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    hideStates(): void;
    showStates(): void;
    lockStates(): void;
    unlockStates(): void;
    changeColor(color: string): void;
}

function LabelItemComponent(props: Props): JSX.Element {
    const {
        labelName,
        labelColor,
        labelColors,
        visible,
        statesHidden,
        statesLocked,
        hideStates,
        showStates,
        lockStates,
        unlockStates,
        changeColor,
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
                <Popover
                    placement='left'
                    trigger='click'
                    content={(
                        <ColorChanger
                            onChange={changeColor}
                            colors={labelColors}
                        />
                    )}
                >
                    <Button style={{ background: labelColor }} className='cvat-label-item-color-button' />
                </Popover>
            </Col>
            <Col span={14}>
                <Text strong className='cvat-text'>{labelName}</Text>
            </Col>
            <Col span={3}>
                { statesLocked
                    ? <Icon type='lock' onClick={unlockStates} />
                    : <Icon type='unlock' onClick={lockStates} />}
            </Col>
            <Col span={3}>
                { statesHidden
                    ? <Icon type='eye-invisible' onClick={showStates} />
                    : <Icon type='eye' onClick={hideStates} />}
            </Col>
        </Row>
    );
}

export default React.memo(LabelItemComponent);
