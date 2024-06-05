// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { getProjectsAsync } from 'actions/projects-actions';
import { CombinedState, Project } from 'reducers';
import dimensions from 'utils/dimensions';
import ProjectItem from './project-item';

export default function ProjectListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const projectsCount = useSelector((state: CombinedState) => state.projects.count);
    const projects = useSelector((state: CombinedState) => state.projects.current);
    const gettingQuery = useSelector((state: CombinedState) => state.projects.gettingQuery);
    const tasksQuery = useSelector((state: CombinedState) => state.projects.tasksGettingQuery);
    const { page } = gettingQuery;

    const changePage = useCallback((p: number) => {
        dispatch(
            getProjectsAsync({
                ...gettingQuery,
                page: p,
            }, tasksQuery),
        );
    }, [gettingQuery]);

    const groupedProjects = projects.reduce(
        (acc: Project[][], storage: Project, index: number): Project[][] => {
            if (index && index % 4) {
                acc[acc.length - 1].push(storage);
            } else {
                acc.push([storage]);
            }
            return acc;
        },
        [],
    );

    return (
        <>
            <Row justify='center' align='middle' className='cvat-project-list-content'>
                <Col className='cvat-projects-list' {...dimensions}>
                    {groupedProjects.map(
                        (projectInstances: Project[]): JSX.Element => (
                            <Row key={projectInstances[0].id}>
                                {projectInstances.map((project: Project) => (
                                    <Col span={6} key={project.id}>
                                        <ProjectItem key={project.id} projectInstance={project} />
                                    </Col>
                                ))}
                            </Row>
                        ),
                    )}
                </Col>
            </Row>
            <Row justify='center' align='middle'>
                <Col {...dimensions}>
                    <Pagination
                        className='cvat-projects-pagination'
                        onChange={changePage}
                        showSizeChanger={false}
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
