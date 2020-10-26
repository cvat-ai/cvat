// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import AnnotationsFiltersInput from 'components/annotation-page/annotations-filters-input';
import StatesOrderingSelector from 'components/annotation-page/standard-workspace/objects-side-bar/states-ordering-selector';
import { StatesOrdering } from 'reducers/interfaces';

interface Props {
    statesCollapsed: boolean;
    statesOrdering: StatesOrdering;
    changeStatesOrdering(value: StatesOrdering): void;
    collapseAllStates(): void;
    expandAllStates(): void;
}

function ObjectListHeader(props: Props): JSX.Element {
    const {
        statesCollapsed, statesOrdering, changeStatesOrdering, collapseAllStates, expandAllStates,
    } = props;

    return (
        <div className='cvat-objects-sidebar-states-header'>
            <Row>
                <Col>
                    <AnnotationsFiltersInput />
                </Col>
            </Row>
            <Row type='flex' justify='space-between' align='middle'>
                <Col span={2}>
                    <Tooltip title='Expand/collapse all' mouseLeaveDelay={0}>
                        {statesCollapsed ? (
                            <Icon type='caret-down' onClick={expandAllStates} />
                        ) : (
                            <Icon type='caret-up' onClick={collapseAllStates} />
                        )}
                    </Tooltip>
                </Col>
                <StatesOrderingSelector statesOrdering={statesOrdering} changeStatesOrdering={changeStatesOrdering} />
            </Row>
        </div>
    );
}

export default React.memo(ObjectListHeader);
