// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Text from 'antd/lib/typography/Text';
import Card from 'antd/lib/card';
import Meta from 'antd/lib/card/Meta';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';

import { CombinedState, Project } from 'reducers';
import { useCardHeightHOC } from 'utils/hooks';
import Preview from 'components/common/preview';
import ProjectActionsMenuComponent from './actions-menu';

interface Props {
    projectInstance: Project;
}

const useCardHeight = useCardHeightHOC({
    containerClassName: 'cvat-projects-page',
    siblingClassNames: ['cvat-projects-pagination', 'cvat-projects-page-top-bar'],
    paddings: 40,
    numberOfRows: 3,
});

export default function ProjectItemComponent(props: Props): JSX.Element {
    const {
        projectInstance: instance,
    } = props;

    const history = useHistory();
    const height = useCardHeight();
    const ownerName = instance.owner ? instance.owner.username : null;
    const updated = moment(instance.updatedDate).fromNow();
    const deletes = useSelector((state: CombinedState) => state.projects.activities.deletes);
    const deleted = instance.id in deletes ? deletes[instance.id] : false;

    const onOpenProject = (): void => {
        history.push(`/projects/${instance.id}`);
    };

    const style: React.CSSProperties = { height };
    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    return (
        <Card
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
            className='cvat-projects-project-item-card'
        >
            <Meta
                title={(
                    <span onClick={onOpenProject} className='cvat-projects-project-item-title' aria-hidden>
                        {instance.name}
                    </span>
                )}
                description={(
                    <div className='cvat-projects-project-item-description'>
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
                                <Button className='cvat-project-details-button' type='link' size='large' icon={<MoreOutlined />} />
                            </Dropdown>
                        </div>
                    </div>
                )}
            />
        </Card>
    );
}
