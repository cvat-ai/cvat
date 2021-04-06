// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import {
    LockFilled, UnlockOutlined, EyeInvisibleFilled, EyeOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props {
    labelName: string;
    labelColor: string;
    labelShortcutKey: string;
    visible: boolean;
    statesHidden: boolean;
    statesLocked: boolean;
    hideStates(): void;
    showStates(): void;
    lockStates(): void;
    unlockStates(): void;
    updateLabelShortcutKey(labelShortcut: string): void;
}

function LabelItemComponent(props: Props): JSX.Element {
    const {
        labelName,
        labelColor,
        visible,
        statesHidden,
        statesLocked,
        labelShortcutKey,
        hideStates,
        showStates,
        lockStates,
        unlockStates,
        updateLabelShortcutKey,
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
        <div className='cvat-objects-sidebar-label-item-wrapper'>
            <div className='cvat-objects-sidebar-label-item-color' style={{ background: `${labelColor}` }} />
            <Row
                align='stretch'
                justify='space-around'
                className={[
                    'cvat-objects-sidebar-label-item',
                    visible ? '' : 'cvat-objects-sidebar-label-item-disabled',
                ].join(' ')}
                style={{ background: `${labelColor}88` }}
            >
                <Col span={13}>
                    <CVATTooltip title={labelName}>
                        <Text strong className='cvat-text'>
                            {labelName}
                        </Text>
                    </CVATTooltip>
                </Col>
                <Col span={4}>
                    <Select
                        size='small'
                        value={labelShortcutKey}
                        onChange={(value: string) => {
                            updateLabelShortcutKey(value);
                        }}
                    >
                        <Select.Option value='—'>—</Select.Option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(
                            (value: number, id: number): JSX.Element => (
                                <Select.Option value={`${value}`} key={id}>
                                    {value}
                                </Select.Option>
                            ),
                        )}
                    </Select>
                </Col>
                <Col span={3} offset={1}>
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
        </div>
    );
}

export default React.memo(LabelItemComponent);
