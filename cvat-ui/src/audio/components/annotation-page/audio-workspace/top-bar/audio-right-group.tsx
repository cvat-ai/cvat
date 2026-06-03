// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useCallback } from 'react';
import { Col } from 'antd/lib/grid';
import Icon, { InfoCircleOutlined } from '@ant-design/icons';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';

import { FilterIcon, FullscreenIcon, GuideIcon } from 'icons';
import config from 'config';
import { Job, JobStage, JobState } from 'cvat-core-wrapper';
import { Workspace } from 'reducers';

import MDEditor from '@uiw/react-md-editor';

interface Props {
    showStatistics(): void;
    showFilters(): void;
    changeWorkspace(workspace: Workspace): void;
    jobInstance: Job;
    workspace: Workspace;
    annotationFilters: object[];
    initialOpenGuide: boolean;
}

function AudioRightGroup(props: Props): JSX.Element {
    const {
        showStatistics,
        changeWorkspace,
        showFilters,
        workspace,
        jobInstance,
        annotationFilters,
        initialOpenGuide,
    } = props;

    const filters = annotationFilters.length;

    const openGuide = useCallback(() => {
        const PADDING = Math.min(window.screen.availHeight, window.screen.availWidth) * 0.4;
        jobInstance.guide().then((guide) => {
            if (guide) {
                Modal.info({
                    icon: null,
                    width: window.screen.availWidth - PADDING,
                    className: 'cvat-annotation-view-markdown-guide-modal',
                    content: (
                        <MDEditor
                            visibleDragbar={false}
                            data-color-mode='light'
                            height={window.screen.availHeight - PADDING}
                            preview='preview'
                            hideToolbar
                            value={guide.markdown}
                        />
                    ),
                });
            }
        }).catch((error: unknown) => {
            notification.error({
                message: 'Could not receive annotation guide',
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        });
    }, [jobInstance]);

    useEffect(() => {
        const guideId = jobInstance?.guideId;
        if (typeof guideId !== 'number') return;
        if (initialOpenGuide) {
            openGuide();
        } else if (
            jobInstance?.stage === JobStage.ANNOTATION &&
            jobInstance?.state === JobState.NEW
        ) {
            let seenGuides: number[] = [];
            try {
                seenGuides = JSON.parse(localStorage.getItem('seenGuides') || '[]');
                if (!Array.isArray(seenGuides) || seenGuides.some((el) => !Number.isInteger(el))) {
                    throw new Error('Wrong structure stored in local storage');
                }
            } catch (_error: unknown) {
                seenGuides = [];
            }

            if (!seenGuides.includes(guideId)) {
                openGuide();
                const updatedSeenGuides = Array
                    .from(new Set([
                        guideId,
                        ...seenGuides.slice(0, config.LOCAL_STORAGE_SEEN_GUIDES_MEMORY_LIMIT - 1),
                    ]));
                localStorage.setItem('seenGuides', JSON.stringify(updatedSeenGuides));
            }
        }
    }, []);

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
                    onClick={openGuide}
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
                <InfoCircleOutlined />
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
                    popupClassName='cvat-workspace-selector-dropdown'
                    className='cvat-workspace-selector'
                    onChange={changeWorkspace}
                    value={workspace}
                >
                    <Select.Option key={Workspace.AUDIO} value={Workspace.AUDIO}>
                        {Workspace.AUDIO}
                    </Select.Option>
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(AudioRightGroup);
