// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import { useSelector } from 'react-redux';

import { FilterIcon, FullscreenIcon, GuideIcon, InfoIcon } from 'icons';
import { DimensionType, getCore } from 'cvat-core-wrapper';
import { CombinedState, Workspace } from 'reducers';
import { Modal } from 'antd';
import GuidePage from 'components/md-guide/guide-page';
import MDEditor from '@uiw/react-md-editor';

const core = getCore();

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

    const filters = useSelector((state: CombinedState) => state.annotation.annotations.filters);

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
                        const PADDING = 400;
                        const guide = await core.guides.get({ id: jobInstance.guideId });
                        Modal.info({
                            icon: null,
                            width: window.screen.availWidth - PADDING,
                            content: (
                                <>
                                    <MDEditor visibleDragbar={false} data-color-mode='light' height={window.screen.availHeight - PADDING} preview='preview' hideToolbar value={guide.markdown} />
                                </>
                            ),
                        });

                        // todo: handle loading, handle error
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
                className={`cvat-annotation-header-filters-button cvat-annotation-header-button ${filters.length ?
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
