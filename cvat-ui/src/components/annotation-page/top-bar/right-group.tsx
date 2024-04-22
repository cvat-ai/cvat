// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';
import { Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';

import {
    FilterIcon, FullscreenIcon, GuideIcon, InfoIcon,
} from 'icons';
import { DimensionType } from 'cvat-core-wrapper';
import { CombinedState, Workspace } from 'reducers';

import MDEditor from '@uiw/react-md-editor';

interface Props {
    workspace: Workspace;
    showStatistics(): void;
    showFilters(): void;
    changeWorkspace(workspace: Workspace): void;
    jobInstance: any;
}

function RightGroup(props: Props): JSX.Element {
    const {
        showStatistics,
        changeWorkspace,
        workspace,
        jobInstance,
        showFilters,
    } = props;

    const annotationFilters = useSelector((state: CombinedState) => state.annotation.annotations.filters);
    const filters = annotationFilters.length;

    return (
        <Col className='cvat-annotation-header-right-group'>
            <Button
                type='link'
                className='cvat-annotation-header-fullscreen-button cvat-annotation-header-button'
                onClick={(): void => {
                    if (window.document.fullscreenEnabled) {
                        if (window.document.fullscreenElement) {
                            window.document.exitFullscreen();
                        } else {
                            window.document.documentElement.requestFullscreen();
                        }
                    }
                }}
            >
                <Icon component={FullscreenIcon} />
                Fullscreen
            </Button>
            { jobInstance.guideId !== null && (
                <Button
                    type='link'
                    className='cvat-annotation-header-guide-button cvat-annotation-header-button'
                    onClick={async (): Promise<void> => {
                        const PADDING = Math.min(window.screen.availHeight, window.screen.availWidth) * 0.4;
                        try {
                            const guide = await jobInstance.guide();
                            Modal.info({
                                icon: null,
                                width: window.screen.availWidth - PADDING,
                                className: 'cvat-annotation-view-markdown-guide-modal',
                                content: (
                                    <>
                                        <MDEditor
                                            visibleDragbar={false}
                                            data-color-mode='light'
                                            height={window.screen.availHeight - PADDING}
                                            preview='preview'
                                            hideToolbar
                                            value={guide.markdown}
                                        />
                                    </>
                                ),
                            });
                        } catch (error: any) {
                            notification.error({
                                message: 'Could not receive annotation guide',
                                description: error.toString(),
                            });
                        }
                    }}
                >
                    <Icon component={GuideIcon} />
                    Guide
                </Button>
            )}
            <Button
                type='link'
                className='cvat-annotation-header-info-button cvat-annotation-header-button'
                onClick={showStatistics}
            >
                <Icon component={InfoIcon} />
                Info
            </Button>
            <Button
                type='link'
                className={`cvat-annotation-header-filters-button cvat-annotation-header-button ${filters ?
                    'filters-armed' : ''
                }`}
                onClick={showFilters}
            >
                <Icon component={FilterIcon} />
                Filters
            </Button>
            <div>
                <Select
                    dropdownClassName='cvat-workspace-selector-dropdown'
                    className='cvat-workspace-selector'
                    onChange={changeWorkspace}
                    value={workspace}
                >
                    {Object.values(Workspace).map((ws) => {
                        if (jobInstance.dimension === DimensionType.DIMENSION_3D) {
                            if (ws === Workspace.STANDARD) {
                                return null;
                            }
                            return (
                                <Select.Option disabled={ws !== Workspace.STANDARD3D} key={ws} value={ws}>
                                    {ws}
                                </Select.Option>
                            );
                        }
                        if (ws !== Workspace.STANDARD3D) {
                            return (
                                <Select.Option key={ws} value={ws}>
                                    {ws}
                                </Select.Option>
                            );
                        }
                        return null;
                    })}
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(RightGroup);
