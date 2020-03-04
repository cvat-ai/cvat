// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Row,
    Col,
    Icon,
    Select,
} from 'antd';

import Text from 'antd/lib/typography/Text';
import { SelectValue } from 'antd/lib/select';

import { StatesOrdering } from 'reducers/interfaces';


interface StatesOrderingSelectorComponentProps {
    statesOrdering: StatesOrdering;
    changeStatesOrdering(value: StatesOrdering): void;
}

function StatesOrderingSelectorComponent(props: StatesOrderingSelectorComponentProps): JSX.Element {
    const {
        statesOrdering,
        changeStatesOrdering,
    } = props;

    return (
        <Col span={16}>
            <Text strong>Sort by</Text>
            <Select value={statesOrdering} onChange={changeStatesOrdering}>
                <Select.Option
                    key={StatesOrdering.ID_DESCENT}
                    value={StatesOrdering.ID_DESCENT}
                >
                    {StatesOrdering.ID_DESCENT}
                </Select.Option>
                <Select.Option
                    key={StatesOrdering.ID_ASCENT}
                    value={StatesOrdering.ID_ASCENT}
                >
                    {StatesOrdering.ID_ASCENT}
                </Select.Option>
                <Select.Option
                    key={StatesOrdering.UPDATED}
                    value={StatesOrdering.UPDATED}
                >
                    {StatesOrdering.UPDATED}
                </Select.Option>
            </Select>
        </Col>
    );
}

const StatesOrderingSelector = React.memo(StatesOrderingSelectorComponent);

interface Props {
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    statesOrdering: StatesOrdering;
    annotationsFilters: string[];
    annotationsFiltersHistory: string[];
    changeStatesOrdering(value: StatesOrdering): void;
    changeAnnotationsFilters(value: SelectValue): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
}

function ObjectListHeader(props: Props): JSX.Element {
    const {
        annotationsFilters,
        annotationsFiltersHistory,
        statesHidden,
        statesLocked,
        statesCollapsed,
        statesOrdering,
        changeStatesOrdering,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        hideAllStates,
        showAllStates,
        changeAnnotationsFilters,
    } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row>
                <Col>
                    <Select
                        allowClear
                        value={annotationsFilters}
                        mode='tags'
                        style={{ width: '100%' }}
                        placeholder={(
                            <>
                                <Icon type='filter' />
                                <span style={{ marginLeft: 5 }}>Annotations filter</span>
                            </>
                        )}
                        onChange={changeAnnotationsFilters}
                    >
                        {annotationsFiltersHistory.map((element: string): JSX.Element => (
                            <Select.Option key={element} value={element}>{element}</Select.Option>
                        ))}
                    </Select>
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={2}>
                    { statesLocked
                        ? <Icon type='lock' onClick={unlockAllStates} />
                        : <Icon type='unlock' onClick={lockAllStates} />}
                </Col>
                <Col span={2}>
                    { statesHidden
                        ? <Icon type='eye-invisible' onClick={showAllStates} />
                        : <Icon type='eye' onClick={hideAllStates} />}
                </Col>
                <Col span={2}>
                    { statesCollapsed
                        ? <Icon type='caret-down' onClick={expandAllStates} />
                        : <Icon type='caret-up' onClick={collapseAllStates} />}
                </Col>
                <StatesOrderingSelector
                    statesOrdering={statesOrdering}
                    changeStatesOrdering={changeStatesOrdering}
                />
            </Row>
        </div>
    );
}

export default React.memo(ObjectListHeader);
