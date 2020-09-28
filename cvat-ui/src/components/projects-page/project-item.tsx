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

import { CombinedState } from 'reducers/interfaces';
import ProjectActionsMenuComponent from './actions-menu';

interface Props {
    projectInstance: any;
}

export default function ProjectItemComponent(props: Props): JSX.Element {
    const { projectInstance: { instance } } = props;

    const history = useHistory();
    const ownerName = instance.owner ? instance.owner.username : null;
    const updated = moment(instance.updatedDate).fromNow();
    const deleted = useSelector((state: CombinedState) => {
        const { deletes } = state.projects.activities;
        return instance.id in deletes ? deletes[instance.id] : false;
    });

    const onOpenProject = (): void => {
        history.push(`/projects/${instance.id}`);
    };

    const style: React.CSSProperties = {};

    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <Card
            cover={<Empty description='No tasks' />}
            size='small'
            style={style}
            className='cvat-projects-project-item-card'
        >
            <Meta
                title={(
                    <span
                        onClick={onOpenProject}
                        className='cvat-projects-project-item-title'
                        aria-hidden
                    >
                        {instance.name}
                    </span>
                )}

                description={(
                    <div className='cvat-porjects-project-item-description'>
                        <div>
                            { ownerName
                            && (
                                <>
                                    <Text type='secondary'>
                                        {`Created ${ownerName ? `by ${ownerName}` : ''}`}
                                    </Text>
                                    <br />
                                </>
                            )}
                            <Text type='secondary'>{`Last updated ${updated}`}</Text>
                        </div>
                        <div>
                            <Dropdown
                                overlay={
                                    <ProjectActionsMenuComponent projectInstance={instance} />
                                }
                            >
                                <Button type='link' size='small'>Actions</Button>
                            </Dropdown>
                        </div>
                    </div>
                )}
            />
        </Card>
    );
}
