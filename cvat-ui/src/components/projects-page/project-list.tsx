// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Pagination from 'antd/lib/pagination';

import { getProjectsAsync } from 'actions/projects-actions';
import { CombinedState, SelectedResourceType } from 'reducers';
import { Project } from 'cvat-core-wrapper';
import dimensions from 'utils/dimensions';
import BulkWrapper from 'components/bulk-wrapper';
import ProjectItem from './project-item';

export default function ProjectListComponent(): JSX.Element {
    const dispatch = useDispatch();
    const {
        projectsCount,
        projects,
        deletingProjects,
        gettingQuery,
        tasksQuery,
    } = useSelector((state: CombinedState) => ({
        projectsCount: state.projects.count,
        projects: state.projects.current,
        deletingProjects: state.projects.activities.deletes,
        gettingQuery: state.projects.gettingQuery,
        tasksQuery: state.projects.tasksGettingQuery,
    }), shallowEqual);

    const { page, pageSize } = gettingQuery;

    const changePage = useCallback((_page: number, _pageSize: number) => {
        dispatch(
            getProjectsAsync({
                ...gettingQuery,
                page: _page,
                pageSize: _pageSize,
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

    const projectIdToIndex = new Map<number, number>();
    projects.forEach((p, idx) => projectIdToIndex.set(p.id, idx));

    const selectableProjectIds = projects.map((p) => p.id).filter((id) => !deletingProjects[id]);
    const selectableProjectIdToIndex = new Map<number, number>();
    selectableProjectIds.forEach((id, idx) => selectableProjectIdToIndex.set(id, idx));

    return (
        <>
            <Row justify='center' align='middle' className='cvat-resource-list-wrapper cvat-project-list-content'>
                <Col className='cvat-projects-list' {...dimensions}>
                    <BulkWrapper currentResourceIds={selectableProjectIds} resourceType={SelectedResourceType.PROJECTS}>
                        {(selectProps) => {
                            const defaultProps = { selected: false, onClick: () => false };

                            const renderProjectRow = (projectInstances: Project[]): JSX.Element => (
                                <Row key={projectInstances[0].id} className='cvat-projects-list-row'>
                                    {projectInstances.map((project: Project) => {
                                        const isDeleting = deletingProjects[project.id];
                                        const selectableIndex = isDeleting ?
                                            -1 :
                                            selectableProjectIdToIndex.get(project.id) ?? -1;
                                        const canSelect = !isDeleting && selectableIndex !== -1;

                                        const projectProps = canSelect ?
                                            selectProps(project.id, selectableIndex) :
                                            defaultProps;

                                        return (
                                            <Col span={6} key={project.id}>
                                                <ProjectItem
                                                    key={project.id}
                                                    projectInstance={project}
                                                    {...projectProps}
                                                />
                                            </Col>
                                        );
                                    })}
                                </Row>
                            );
                            return groupedProjects.map(renderProjectRow);
                        }}
                    </BulkWrapper>
                </Col>
            </Row>
            <Row justify='center' align='middle' className='cvat-resource-pagination-wrapper'>
                <Col {...dimensions}>
                    <Pagination
                        className='cvat-projects-pagination'
                        onChange={changePage}
                        total={projectsCount}
                        pageSize={pageSize}
                        pageSizeOptions={[12, 24, 48, 96]}
                        current={page}
                        showQuickJumper
                        showSizeChanger
                    />
                </Col>
            </Row>
        </>
    );
}
