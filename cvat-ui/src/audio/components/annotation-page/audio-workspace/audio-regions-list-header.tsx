// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import {
    EyeInvisibleFilled, EyeOutlined, LockFilled, UnlockOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';

export enum AudioRegionsOrdering {
    INSERTION = 'Insertion order',
    START_TIME = 'Start time',
    LABEL_NAME = 'Label name',
}

interface Props {
    count: number;
    ordering: AudioRegionsOrdering;
    allLocked: boolean;
    allHidden: boolean;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    onChangeOrdering(value: AudioRegionsOrdering): void;
    onLockAll(): void;
    onUnlockAll(): void;
    onHideAll(): void;
    onShowAll(): void;
}

function AudioRegionsListHeader(props: Props): JSX.Element {
    const {
        count,
        ordering,
        allLocked,
        allHidden,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        onChangeOrdering,
        onLockAll,
        onUnlockAll,
        onHideAll,
        onShowAll,
    } = props;

    return (
        <div className='cvat-audio-regions-list-header'>
            <Row justify='space-between' align='middle'>
                <Col>
                    <Text>{`Items: ${count}`}</Text>
                </Col>
                <Col className='cvat-audio-regions-list-header-actions'>
                    <CVATTooltip title={`Switch lock for all ${switchLockAllShortcut}`}>
                        {allLocked ? (
                            <LockFilled onClick={onUnlockAll} />
                        ) : (
                            <UnlockOutlined onClick={onLockAll} />
                        )}
                    </CVATTooltip>
                    <CVATTooltip title={`Switch hidden for all ${switchHiddenAllShortcut}`}>
                        {allHidden ? (
                            <EyeInvisibleFilled onClick={onShowAll} />
                        ) : (
                            <EyeOutlined onClick={onHideAll} />
                        )}
                    </CVATTooltip>
                </Col>
            </Row>
            <Row className='cvat-audio-regions-list-ordering' align='middle'>
                <Text>Sort by</Text>
                <Select
                    size='small'
                    className='cvat-audio-regions-list-ordering-selector'
                    value={ordering}
                    onChange={onChangeOrdering}
                >
                    {Object.values(AudioRegionsOrdering).map((value) => (
                        <Select.Option key={value} value={value}>
                            {value}
                        </Select.Option>
                    ))}
                </Select>
            </Row>
        </div>
    );
}

export default React.memo(AudioRegionsListHeader);
