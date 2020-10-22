// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { Row, Col } from 'antd/lib/grid';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import Icon from 'antd/lib/icon';
import Dropdown from 'antd/lib/dropdown';

import getCore from 'cvat-core-wrapper';
import { Project, CombinedState } from 'reducers/interfaces';
import { updateProjectAsync } from 'actions/projects-actions';
import ActionsMenu from 'components/projects-page/actions-menu';
import LabelsEditor from 'components/labels-editor/labels-editor';
import BugTrackerEditor from 'components/task-page/bug-tracker-editor';
import UserSelector from 'components/task-page/user-selector';
import { MenuIcon } from 'icons';

const core = getCore();

interface DetailsComponentProps {
    project: Project;
}

export default function DetailsComponent(props: DetailsComponentProps): JSX.Element {
    const { project } = props;

    const dispatch = useDispatch();
    const registeredUsers = useSelector((state: CombinedState) => state.users.users);
    const [projectName, setProjectName] = useState(project.instance.name);

    return (
        <div className='cvat-project-details'>
            <Row type='flex' justify='space-between'>
                <Col>
                    <Title
                        level={4}
                        editable={{
                            onChange: (value: string): void => {
                                setProjectName(value);
                                project.instance.name = value;
                                dispatch(updateProjectAsync(project.instance));
                            },
                        }}
                        className='cvat-text-color'
                    >
                        {projectName}
                    </Title>
                    <Text type='secondary'>
                        {`Project #${project.instance.id} created`}
                        {project.instance.owner ? ` by ${project.instance.owner.username}` : null}
                        {` on ${moment(project.instance.createdDate).format('MMMM Do YYYY')}`}
                    </Text>
                    <BugTrackerEditor
                        instance={project.instance}
                        onChange={(_project): void => {
                            dispatch(updateProjectAsync(_project));
                        }}
                    />
                </Col>
                <Col>
                    <div className='cvat-project-details-actions'>
                        <Text className='cvat-text-color'>Actions</Text>
                        <Dropdown overlay={<ActionsMenu projectInstance={project.instance} />}>
                            <Icon className='cvat-menu-icon' component={MenuIcon} />
                        </Dropdown>
                    </div>
                    <UserSelector
                        value={project.instance.assignee}
                        users={registeredUsers}
                        onChange={
                            (value) => {
                                let [userInstance] = registeredUsers
                                    .filter((user: any) => user.username === value);

                                if (userInstance === undefined) {
                                    userInstance = null;
                                }

                                project.instance.assignee = userInstance;
                                dispatch(updateProjectAsync(project.instance));
                            }
                        }
                    />
                </Col>
            </Row>
            <LabelsEditor
                labels={project.instance.labels.map(
                    (label: any): string => label.toJSON(),
                )}
                onSubmit={(labels: any[]): void => {
                    project.instance.labels = labels
                        .map((labelData): any => new core.classes.Label(labelData));
                    dispatch(updateProjectAsync(project.instance));
                }}
            />
        </div>
    );
}
