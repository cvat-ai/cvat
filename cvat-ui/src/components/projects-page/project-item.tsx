// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Empty from 'antd/lib/empty';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';

import { CombinedState, Project } from 'reducers/interfaces';
import ProjectActionsMenuComponent from './actions-menu';

interface Props {
    projectInstance: Project;
}

export default function ProjectItemComponent(props: Props): JSX.Element {
    const {
        projectInstance: { instance, preview },
    } = props;

    const [height, setHeight] = useState('');
    const history = useHistory();
    const ownerName = instance.owner ? instance.owner.username : null;
    const updated = moment(instance.updatedDate).fromNow();
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const deleted = instance.id in deletes ? deletes[instance.id] : false;

    const onOpenProject = (): void => {
        history.push(`/projects/${instance.id}`);
    };

    const style: React.CSSProperties = {};

    const NUMBER_OF_RAWS = 3;
    useEffect(() => {
        const resize = (): void => {
            const container = window.document.getElementsByClassName('cvat-projects-page')[0];
            const topBar = window.document.getElementsByClassName('cvat-projects-top-bar')[0];
            const pagination = window.document.getElementsByClassName('cvat-projects-pagination')[0];
            if (container && topBar && pagination) {
                const { clientHeight: containerHeight } = container;
                const { clientHeight: topBarHeight } = topBar;
                const { clientHeight: paginationHeight } = pagination;
                const paddings = 40;
                const cardHeight = (containerHeight - (topBarHeight + paginationHeight + paddings)) / NUMBER_OF_RAWS;
                setHeight(`${Math.round(cardHeight)}px`);
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, []);

    style.height = height;

    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <Card
            cover={
                preview ? (
                    <img
                        className='cvat-projects-project-item-card-preview'
                        src={preview}
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
                        {instance.name}
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
                            <Dropdown overlay={<ProjectActionsMenuComponent projectInstance={instance} />}>
                                <Button type='link' size='large' icon={<MoreOutlined />} />
                            </Dropdown>
                        </div>
                    </div>
                )}
            />
        </Card>
    );
}
