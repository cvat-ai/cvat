// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';

import { StatesOrdering } from 'reducers/interfaces';

interface StatesOrderingSelectorComponentProps {
    statesOrdering: StatesOrdering;
    changeStatesOrdering(value: StatesOrdering): void;
}

function StatesOrderingSelectorComponent(props: StatesOrderingSelectorComponentProps): JSX.Element {
    const { statesOrdering, changeStatesOrdering } = props;

    return (
        <Col>
            <Text strong>Sort by</Text>
            <Select
                className='cvat-objects-sidebar-ordering-selector'
                dropdownClassName='cvat-objects-sidebar-ordering-dropdown'
                value={statesOrdering}
                onChange={changeStatesOrdering}
            >
                <Select.Option key={StatesOrdering.ID_DESCENT} value={StatesOrdering.ID_DESCENT}>
                    {StatesOrdering.ID_DESCENT}
                </Select.Option>
                <Select.Option key={StatesOrdering.ID_ASCENT} value={StatesOrdering.ID_ASCENT}>
                    {StatesOrdering.ID_ASCENT}
                </Select.Option>
                <Select.Option key={StatesOrdering.UPDATED} value={StatesOrdering.UPDATED}>
                    {StatesOrdering.UPDATED}
                </Select.Option>
            </Select>
        </Col>
    );
}

export default React.memo(StatesOrderingSelectorComponent);
