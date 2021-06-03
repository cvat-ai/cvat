// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import { PlusOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Text from 'antd/lib/typography/Text';
import Upload from 'antd/lib/upload';

import SearchTooltip from 'components/search-tooltip/search-tooltip';

interface VisibleTopBarProps {
    onSearch: (value: string) => void;
    onFileUpload(file: File): void;
    searchValue: string;
    taskImporting: boolean;
}

export default function TopBarComponent(props: VisibleTopBarProps): JSX.Element {
    const {
        searchValue, onSearch, onFileUpload, taskImporting,
    } = props;

    const history = useHistory();

    return (
        <Row className='cvat-tasks-page-top-bar' justify='center' align='middle'>
            <Col md={22} lg={18} xl={16} xxl={14}>
                <Row justify='space-between' align='bottom'>
                    <Col>
                        <Text className='cvat-title'>Tasks</Text>
                        <SearchTooltip instance='task'>
                            <Input.Search
                                className='cvat-task-page-search-task'
                                defaultValue={searchValue}
                                onSearch={onSearch}
                                size='large'
                                placeholder='Search'
                            />
                        </SearchTooltip>
                    </Col>
                    <Col>
                        <Row gutter={8}>
                            <Col>
                                <Upload
                                    accept='.zip'
                                    multiple={false}
                                    showUploadList={false}
                                    beforeUpload={(file: File): boolean => {
                                        onFileUpload(file);
                                        return false;
                                    }}
                                >
                                    <Button
                                        size='large'
                                        id='cvat-import-task-button'
                                        type='primary'
                                        disabled={taskImporting}
                                        icon={<UploadOutlined />}
                                    >
                                        Import Task
                                        {taskImporting && <LoadingOutlined id='cvat-import-task-button-loading' />}
                                    </Button>
                                </Upload>
                            </Col>
                            <Col>
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
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
