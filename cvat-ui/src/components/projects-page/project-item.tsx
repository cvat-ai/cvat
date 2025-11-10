// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Badge from 'antd/lib/badge';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';

import { CombinedState } from 'reducers';
import { Project } from 'cvat-core-wrapper';
import { useCardHeightHOC, usePlugins, useContextMenuClick } from 'utils/hooks';
import Preview from 'components/common/preview';
import ProjectActionsComponent from './actions-menu';

interface Props {
    projectInstance: Project;
    selected: boolean;
    onClick: (event: React.MouseEvent) => boolean;
}

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-projects-page',
    siblingClassNames: ['cvat-projects-pagination', 'cvat-projects-page-top-bar'],
    paddings: 72,
    minHeight: 200,
    numberOfRows: 3,
});

export default function ProjectItemComponent(props: Props): JSX.Element {
    const {
        projectInstance: instance,
        selected,
        onClick,
    } = props;

    const history = useHistory();
    const ribbonPlugins = usePlugins((state: CombinedState) => state.plugins.components.projectItem.ribbon, props);
    const height = useCardHeight();
    const { itemRef, handleContextMenuClick } = useContextMenuClick<HTMLDivElement>();
    const ownerName = instance.owner ? instance.owner.username : null;
    const updated = dayjs(instance.updatedDate).fromNow();
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const deleted = instance.id in deletes ? deletes[instance.id] : false;

    const onOpenProject = useCallback((event: React.MouseEvent): void => {
        const cancel = onClick(event);
        if (!cancel) {
            history.push(`/projects/${instance.id}`);
        }
    }, [history, instance, onClick]);

    const style: React.CSSProperties = { height };
    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    const cardClassName = `cvat-projects-project-item-card${selected ? ' cvat-item-selected' : ''}`;

    return (
        <Badge.Ribbon
            style={{ visibility: ribbonPlugins.length ? 'visible' : 'hidden' }}
            className='cvat-project-item-ribbon'
            placement='start'
            text={(
                <div>
                    {ribbonPlugins.sort((item1, item2) => item1.weight - item2.weight)
                        .map((item) => item.component).map((Component, index) => (
                            <Component key={index} targetProps={props} />
                        ))}
                </div>
            )}
        >
            <ProjectActionsComponent
                projectInstance={instance}
                dropdownTrigger={['contextMenu']}
                triggerElement={(
                    <Card
                        ref={itemRef}
                        cover={(
                            <Preview
                                project={instance}
                                loadingClassName='cvat-project-item-loading-preview'
                                emptyPreviewClassName='cvat-project-item-empty-preview'
                                previewWrapperClassName='cvat-projects-project-item-card-preview-wrapper'
                                previewClassName='cvat-projects-project-item-card-preview'
                                onClick={onOpenProject}
                            />
                        )}
                        size='small'
                        style={style}
                        className={cardClassName}
                        hoverable
                        onClick={onClick}
                    >
                        <Meta
                            title={(
                                <Text
                                    ellipsis={{ tooltip: instance.name }}
                                    onClick={onOpenProject}
                                    className='cvat-projects-project-item-title'
                                    aria-hidden
                                >
                                    {instance.name}
                                </Text>
                            )}
                            description={(
                                <div className='cvat-projects-project-item-description'>
                                    <div>
                                        {ownerName && (
                                            <>
                                                <Text type='secondary'>
                                            Created
                                                    {ownerName ? ` by ${ownerName}` : ''}
                                                </Text>
                                                <br />
                                            </>
                                        )}
                                        <Text type='secondary'>{`Last updated ${updated}`}</Text>
                                    </div>
                                    <div>
                                        <Button
                                            className='cvat-project-details-button cvat-actions-menu-button'
                                            type='link'
                                            size='large'
                                            icon={<MoreOutlined />}
                                            onClick={handleContextMenuClick}
                                        />
                                    </div>
                                </div>
                            )}
                        />
                    </Card>
                )}
            />
        </Badge.Ribbon>
    );
}
