// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';

import { CombinedState } from 'reducers';
import { Project } from 'cvat-core-wrapper';
import { useCardHeightHOC, useContextMenuClick } from 'utils/hooks';
import Preview from 'components/common/preview';
import ResourceCard from 'components/common/resource-card';
import ProjectActionsComponent from './actions-menu';

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-projects-page',
    siblingClassNames: ['cvat-projects-pagination', 'cvat-projects-page-top-bar'],
    paddings: 72,
    minHeight: 200,
    numberOfRows: 3,
});

interface Props {
    projectInstance: Project;
    selected: boolean;
    onClick: (event: React.MouseEvent) => boolean;
}

export default function ProjectItemComponent(props: Props): JSX.Element {
    const {
        projectInstance: instance,
        selected,
        onClick,
    } = props;

    const history = useHistory();
    const height = useCardHeight();
    const { itemRef, handleContextMenuClick, handleContextMenuCapture } = useContextMenuClick<HTMLDivElement>();
    const ownerName = instance.owner?.username;
    const updated = dayjs(instance.updatedDate).fromNow();
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const deletingOrDeleted = instance.id in deletes;
    const projectURL = `/projects/${instance.id}`;

    const onOpenProject = useCallback((event: React.MouseEvent): void => {
        event.stopPropagation();
        const cancel = onClick(event);
        if (!cancel) {
            history.push(projectURL);
        }
    }, [history, onClick, projectURL]);

    const card = (
        <ResourceCard
            cardRef={itemRef}
            id={instance.id}
            preview={(
                <Preview
                    project={instance}
                    loadingClassName='cvat-project-item-loading-preview'
                    emptyPreviewClassName='cvat-project-item-empty-preview'
                    previewWrapperClassName='cvat-projects-project-item-card-preview-wrapper'
                    previewClassName='cvat-projects-project-item-card-preview'
                />
            )}
            title={(
                <Text
                    ellipsis={{ tooltip: instance.name }}
                    className='cvat-projects-project-item-title'
                >
                    {instance.name}
                </Text>
            )}
            descriptions={[
                {
                    label: 'Owner',
                    value: (
                        <Text
                            ellipsis={{ tooltip: ownerName }}
                            className='cvat-resource-card-line'
                        >
                            {ownerName}
                        </Text>
                    ),
                },
                { label: 'Updated', value: updated },
            ]}
            contentClassName='cvat-projects-project-item-description'
            menu={(
                <Button
                    className='cvat-project-details-button cvat-actions-menu-button'
                    type='text'
                    icon={<MoreOutlined />}
                    onClick={handleContextMenuClick}
                />
            )}
            selected={selected}
            isDisabled={deletingOrDeleted}
            className='cvat-projects-project-item-card'
            style={{ height }}
            onClick={onOpenProject}
            onOpenInNewTab={() => window.open(projectURL, '_blank', 'noopener,noreferrer')}
            onContextMenuCapture={handleContextMenuCapture}
        />
    );

    return (
        <ProjectActionsComponent
            projectInstance={instance}
            dropdownTrigger={['contextMenu']}
            triggerElement={card}
        />
    );
}
