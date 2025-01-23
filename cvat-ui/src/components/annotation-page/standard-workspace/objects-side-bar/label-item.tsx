// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import {
    LockFilled, UnlockOutlined, EyeInvisibleFilled, EyeOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

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
            align='stretch'
            justify='space-around'
            className={[
                'cvat-objects-sidebar-label-item',
                visible ? '' : 'cvat-objects-sidebar-label-item-disabled',
            ].join(' ')}
        >
            <Col span={2}>
                <div style={{ background: labelColor }} className='cvat-label-item-color'>
                    {' '}
                </div>
            </Col>
            <Col span={15}>
                <CVATTooltip title={labelName}>
                    <Text strong className='cvat-text'>
                        {labelName}
                    </Text>
                </CVATTooltip>
            </Col>
            <Col span={2} offset={1}>
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
