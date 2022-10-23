// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col, RowProps } from 'antd/lib/grid';
import Spin from 'antd/lib/spin';

import { getProjectsLazyAsync } from 'actions/projects-actions';
import { CombinedState, Project } from 'reducers';
import { useOnScreen } from 'utils/hooks';
import ProjectItem from './project-item';

export interface ProjectListComponentProps extends RowProps {
    amount?: number; // the number of projects given by the API on one page
}

export default function ProjectListComponent({ amount = 12, ...props }: ProjectListComponentProps): JSX.Element {
    const dispatch = useDispatch();
    const projectsCount = useSelector((state: CombinedState) => state.projects.count);
    const projects = useSelector((state: CombinedState) => state.projects.current);
    const gettingQuery = useSelector((state: CombinedState) => state.projects.gettingQuery);
    const tasksQuery = useSelector((state: CombinedState) => state.projects.tasksGettingQuery);
    const fetching = useSelector((state: CombinedState) => state.projects.fetching);
    const [lastPage, setlastPage] = useState<number>(1);
    const loaderRef = React.useRef<HTMLDivElement | null>(null);
    const loaderIsVisible = useOnScreen(loaderRef);

    useEffect(() => {
        if (!fetching && loaderIsVisible && lastPage <= Math.ceil(projectsCount / amount)) {
            dispatch(
                getProjectsLazyAsync(
                    {
                        ...gettingQuery,
                        page: lastPage + 1,
                    },
                    tasksQuery,
                ),
            );
            setlastPage(lastPage + 1);
        }
    }, [loaderIsVisible]);

    const dimensions = {
        md: 22,
        lg: 18,
        xl: 16,
        xxl: 16,
    };

    return (
        <Row className='cvat-project-list-content' {...props}>
            <Row justify='center' align='middle'>
                <Col className='cvat-projects-list' {...dimensions}>
                    {projects.map(
                        (project: Project): JSX.Element => (
                            <ProjectItem key={project.instance.id} projectInstance={project} />
                        ),
                    )}
                </Col>
            </Row>
            {lastPage < Math.ceil(projectsCount / amount) && (
                <Row justify='center' ref={loaderRef} align='middle' {...dimensions} className='cvat-project-list-loader'>
                    <Spin size='large' className='cvat-spinner' />
                </Row>
            )}
        </Row>
    );
}
