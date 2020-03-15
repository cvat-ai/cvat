// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import {
    Col,
    Row,
    Button,
    Input,
} from 'antd';

import Text from 'antd/lib/typography/Text';

interface VisibleTopBarProps {
    onSearch: (value: string) => void;
    searchValue: string;
}

function TopBarComponent(props: VisibleTopBarProps & RouteComponentProps): JSX.Element {
    const {
        searchValue,
        history,
        onSearch,
    } = props;

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Text strong>Default project</Text>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col md={11} lg={9} xl={8} xxl={7}>
                    <Text className='cvat-title'>Tasks</Text>
                    <Input.Search
                        defaultValue={searchValue}
                        onSearch={onSearch}
                        size='large'
                        placeholder='Search'
                    />
                </Col>
                <Col
                    md={{ span: 11 }}
                    lg={{ span: 9 }}
                    xl={{ span: 8 }}
                    xxl={{ span: 7 }}
                >
                    <Button
                        size='large'
                        id='cvat-create-task-button'
                        type='primary'
                        onClick={
                            (): void => history.push('/tasks/create')
                        }
                    >
                         Create new task
                    </Button>
                </Col>
            </Row>
        </>
    );
}

export default withRouter(TopBarComponent);
