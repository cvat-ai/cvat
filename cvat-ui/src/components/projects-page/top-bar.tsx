// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { PlusOutlined } from '@ant-design/icons';

import SearchField from 'components/search-field/search-field';
import { CombinedState, ProjectsQuery } from 'reducers/interfaces';
import { getProjectsAsync } from 'actions/projects-actions';

export default function TopBarComponent(): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.projects.gettingQuery);
    const dimensions = {
        md: 11,
        lg: 9,
        xl: 8,
        xxl: 8,
    };

    return (
        <Row justify='center' align='middle' className='cvat-projects-top-bar'>
            <Col {...dimensions}>
                <Text className='cvat-title'>Projects</Text>
                <SearchField
                    query={query}
                    instance='project'
                    onSearch={(_query: ProjectsQuery) => dispatch(getProjectsAsync(_query))}
                />
            </Col>
            <Col {...dimensions}>
                <Button
                    size='large'
                    id='cvat-create-project-button'
                    className='cvat-create-project-button'
                    type='primary'
                    onClick={(): void => history.push('/projects/create')}
                    icon={<PlusOutlined />}
                >
                    Create new project
                </Button>
            </Col>
        </Row>
    );
}
