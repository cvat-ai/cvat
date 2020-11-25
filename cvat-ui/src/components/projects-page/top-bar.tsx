// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import SearchField from './search-field';

export default function TopBarComponent(): JSX.Element {
    const history = useHistory();

    return (
        <Row type='flex' justify='center' align='middle' className='cvat-projects-top-bar'>
            <Col md={11} lg={9} xl={8} xxl={7}>
                <Text className='cvat-title'>Projects</Text>
                <SearchField />
            </Col>
            <Col md={{ span: 11 }} lg={{ span: 9 }} xl={{ span: 8 }} xxl={{ span: 7 }}>
                <Button
                    size='large'
                    id='cvat-create-project-button'
                    className='cvat-create-project-button'
                    type='primary'
                    onClick={(): void => history.push('/projects/create')}
                    icon='plus'
                >
                    Create new project
                </Button>
            </Col>
        </Row>
    );
}
