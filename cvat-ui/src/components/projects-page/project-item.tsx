// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Empty from 'antd/lib/empty';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';

import { CombinedState, Project } from 'reducers/interfaces';
import ProjectActionsMenuComponent from './actions-menu';

interface Props {
    projectInstance: Project;
}

export default function ProjectItemComponent(props: Props): JSX.Element {
    const { projectInstance } = props;

    const history = useHistory();
    const ownerName = projectInstance.owner ? projectInstance.owner.username : null;
    const updated = moment(projectInstance.updatedDate).fromNow();
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const deleted = projectInstance.id in deletes ? deletes[projectInstance.id] : false;

    let projectPreview = null;
    if (projectInstance.tasks.length) {
        // prettier-ignore
        projectPreview = useSelector((state: CombinedState) => (
            state.tasks.current.find((task) => task.instance.id === projectInstance.tasks[0].id)?.preview
        ));
    }

    const onOpenProject = (): void => {
        history.push(`/projects/${projectInstance.id}`);
    };

    const style: React.CSSProperties = {};

    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <Card
            cover={
                projectPreview ? (
                    <img
                        className='cvat-projects-project-item-card-preview'
                        src={projectPreview}
                        alt='Preview'
                        onClick={onOpenProject}
                        aria-hidden
                    />
                ) : (
                    <div className='cvat-projects-project-item-card-preview' onClick={onOpenProject} aria-hidden>
                        <Empty description='No tasks' />
                    </div>
                )
            }
            size='small'
            style={style}
            className='cvat-projects-project-item-card'
        >
            <Meta
                title={(
                    <span onClick={onOpenProject} className='cvat-projects-project-item-title' aria-hidden>
                        {projectInstance.name}
                    </span>
                )}
                description={(
                    <div className='cvat-porjects-project-item-description'>
                        <div>
                            {ownerName && (
                                <>
                                    <Text type='secondary'>{`Created ${ownerName ? `by ${ownerName}` : ''}`}</Text>
                                    <br />
                                </>
                            )}
                            <Text type='secondary'>{`Last updated ${updated}`}</Text>
                        </div>
                        <div>
                            <Dropdown overlay={<ProjectActionsMenuComponent projectInstance={projectInstance} />}>
                                <Button type='link' size='large' icon='more' />
                            </Dropdown>
                        </div>
                    </div>
                )}
            />
        </Card>
    );
}
