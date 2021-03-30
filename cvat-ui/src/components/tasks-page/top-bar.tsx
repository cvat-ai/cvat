// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { PlusOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';

import CVATTooltip from 'components/common/cvat-tooltip';

interface VisibleTopBarProps {
    onSearch: (value: string) => void;
    searchValue: string;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const { searchValue, onSearch } = props;

    const history = useHistory();

    return (
        <>
            <Row justify='center' align='middle'>
                <Col md={11} lg={9} xl={8} xxl={7}>
                    <Text className='cvat-title'>Tasks</Text>
                    <CVATTooltip
                        overlayClassName='cvat-tasks-search-tooltip'
                        title={(
                            <>
                                <Paragraph>
                                    <Text strong>owner: admin</Text>
                                    <Text>
                                        all tasks created by the user who has the substring
                                        <q>admin</q>
                                        in their username
                                    </Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text strong>assignee: employee</Text>
                                    <Text>
                                        all tasks which are assigned to a user who has the substring
                                        <q>admin</q>
                                        in their username
                                    </Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text strong>name: training</Text>
                                    <Text>
                                        all tasks with the substring
                                        <q>training</q>
                                        in its name
                                    </Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text strong>mode: annotation</Text>
                                    <Text>
                                        annotation tasks are tasks with images, interpolation tasks are tasks with
                                        videos
                                    </Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text strong>status: annotation</Text>
                                    <Text>annotation, validation, or completed</Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text strong>id: 5</Text>
                                    <Text>the task with id 5</Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text>
                                        Filters can be combined (to the exclusion of id) using the keyword AND. Example:
                                        <Text type='warning'>
                                            <q>mode: interpolation AND owner: admin</q>
                                        </Text>
                                    </Text>
                                </Paragraph>
                                <Paragraph>
                                    <Text type='success'>Search within all the string fields by default</Text>
                                </Paragraph>
                            </>
                        )}
                    >
                        <Input.Search
                            className='cvat-task-page-search-task'
                            defaultValue={searchValue}
                            onSearch={onSearch}
                            size='large'
                            placeholder='Search'
                        />
                    </CVATTooltip>
                </Col>
                <Col md={{ span: 11 }} lg={{ span: 9 }} xl={{ span: 8 }} xxl={{ span: 7 }}>
                    <Button
                        size='large'
                        id='cvat-create-task-button'
                        type='primary'
                        onClick={(): void => history.push('/tasks/create')}
                        icon={<PlusOutlined />}
                    >
                        Create new task
                    </Button>
                </Col>
            </Row>
        </>
    );
}
