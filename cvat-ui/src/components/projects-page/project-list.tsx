// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { getProjectsAsync } from 'actions/projects-actions';
import { CombinedState } from 'reducers/interfaces';
import ProjectItem from './project-item';

export default function ProjectListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const projectsCount = useSelector((state: CombinedState) => state.projects.count);
    const { page } = useSelector((state: CombinedState) => state.projects.gettingQuery);
    const projectInstances = useSelector((state: CombinedState) => state.projects.current);
    const gettingQuery = useSelector((state: CombinedState) => state.projects.gettingQuery);

    function changePage(p: number): void {
        dispatch(
            getProjectsAsync({
                ...gettingQuery,
                page: p,
            }),
        );
    }

    return (
        <>
            <Row type='flex' justify='center' align='middle'>
                <Col className='cvat-projects-list' md={22} lg={18} xl={16} xxl={14}>
                    <Row gutter={[8, 8]}>
                        {projectInstances.map(
                            (instance: any): JSX.Element => (
                                <Col xs={8} sm={8} xl={6} key={instance.id}>
                                    <ProjectItem projectInstance={instance} />
                                </Col>
                            ),
                        )}
                    </Row>
                </Col>
            </Row>
            <Row type='flex' justify='center' align='middle'>
                <Col md={22} lg={18} xl={16} xxl={14}>
                    <Pagination
                        className='cvat-projects-pagination'
                        onChange={changePage}
                        total={projectsCount}
                        pageSize={12}
                        current={page}
                        showQuickJumper
                    />
                </Col>
            </Row>
        </>
    );
}
