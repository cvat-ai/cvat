// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';
import { PlusOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import Upload from 'antd/lib/upload';

import SearchField from 'components/search-field/search-field';
import { CombinedState, ProjectsQuery } from 'reducers/interfaces';
import { getProjectsAsync, restoreProjectAsync } from 'actions/projects-actions';

export default function TopBarComponent(): JSX.Element {
    const history = useHistory();
    const dispatch = useDispatch();
    const query = useSelector((state: CombinedState) => state.projects.gettingQuery);
    const isImporting = useSelector((state: CombinedState) => state.projects.restoring);

    return (
        <Row className='cvat-projects-page-top-bar' justify='center' align='middle'>
            <Col md={22} lg={18} xl={16} xxl={16}>
                <Row justify='space-between' align='bottom'>
                    <Col>
                        <Text className='cvat-title'>Projects</Text>
                        <SearchField
                            query={query}
                            instance='project'
                            onSearch={(_query: ProjectsQuery) => dispatch(getProjectsAsync(_query))}
                        />
                    </Col>
                    <Col>
                        <Row gutter={8}>
                            <Col>
                                <Upload
                                    accept='.zip'
                                    multiple={false}
                                    showUploadList={false}
                                    beforeUpload={(file: File): boolean => {
                                        dispatch(restoreProjectAsync(file));
                                        return false;
                                    }}
                                    className='cvat-import-project'
                                >
                                    <Button
                                        size='large'
                                        id='cvat-import-project-button'
                                        type='primary'
                                        disabled={isImporting}
                                        icon={<UploadOutlined />}
                                    >
                                        Create from backup
                                        {isImporting && <LoadingOutlined id='cvat-import-project-button-loading' />}
                                    </Button>
                                </Upload>
                            </Col>
                            <Col>
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
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
