// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import { MoreOutlined } from '@ant-design/icons';
import Progress from 'antd/lib/progress';
import Badge from 'antd/lib/badge';
import { Task, RQStatus, Request } from 'cvat-core-wrapper';
import Preview from 'components/common/preview';
import { ActiveInference, PluginComponent } from 'reducers';
import StatusMessage from 'components/requests-page/request-status';
import { useContextMenuClick, useIsMounted } from 'utils/hooks';
import AutomaticAnnotationProgress from './automatic-annotation-progress';
import TaskActionsComponent from './actions-menu';

export interface TaskItemProps {
    taskInstance: any;
    deleted: boolean;
    activeInference: ActiveInference | null;
    activeRequest: Request | null;
    ribbonPlugins: PluginComponent[];
    cancelAutoAnnotation(): void;
    updateTaskInState(task: Task): void;
    selected: boolean;
    onClick: () => void;
}

interface ImportingState {
    state: RQStatus | null;
    message: string;
    progress: number;
}

function TaskItemComponent(props: TaskItemProps): JSX.Element {
    const {
        taskInstance,
        deleted,
        activeInference,
        activeRequest,
        ribbonPlugins,
        cancelAutoAnnotation,
        updateTaskInState,
        selected,
        onClick,
    } = props;

    const isMounted = useIsMounted();
    const { itemRef, handleContextMenuClick, handleContextMenuCapture } = useContextMenuClick<HTMLDivElement>();

    const [importingState, setImportingState] = useState<ImportingState | null>(
        taskInstance.size > 0 ? null : {
            state: null,
            message: 'Request current progress',
            progress: 0,
        },
    );

    useEffect(() => {
        if (importingState !== null && activeRequest !== null) {
            setImportingState({
                message: activeRequest.message,
                progress: Math.floor((activeRequest.progress ?? 0) * 100),
                state: activeRequest.status,
            });

            taskInstance.listenToCreate(activeRequest.id, {
                callback: (request: Request) => {
                    if (isMounted()) {
                        setImportingState({
                            message: request.message,
                            progress: Math.floor((request.progress ?? 0) * 100),
                            state: request.status,
                        });
                    }
                },
                initialRequest: activeRequest,
            }).then((createdTask: Task) => {
                if (isMounted()) {
                    setImportingState(null);

                    setTimeout(() => {
                        if (isMounted()) {
                            if (taskInstance.size !== createdTask.size) {
                                updateTaskInState(createdTask);
                            }
                        }
                    }, 1000);
                }
            }).catch(() => {});
        }
    }, []);

    const style: React.CSSProperties = {};
    if (deleted) {
        style.pointerEvents = 'none';
        style.opacity = 0.5;
    }

    const { id } = taskInstance;
    const owner = taskInstance.owner ? taskInstance.owner.username : null;
    const updated = dayjs(taskInstance.updatedDate).fromNow();
    const created = dayjs(taskInstance.createdDate).format('MMMM Do YYYY');

    const ribbonItems = ribbonPlugins
        .filter((plugin) => plugin.data.shouldBeRendered(props, { importingState }))
        .map((plugin) => ({ component: plugin.component, weight: plugin.data.weight }));

    const renderProgress = (): JSX.Element => {
        if (importingState) {
            return (
                <Col span={7}>
                    <Row>
                        <Col span={24} className='cvat-task-item-progress-wrapper'>
                            <div>
                                <StatusMessage status={importingState.state} message={importingState.message} />
                            </div>
                            {importingState.state !== RQStatus.FAILED && (
                                <Progress
                                    percent={importingState.progress}
                                    strokeColor='#1890FF'
                                    size='small'
                                />
                            )}
                        </Col>
                    </Row>
                </Col>
            );
        }

        const numOfJobs = taskInstance.progress.totalJobs;
        const numOfCompleted = taskInstance.progress.completedJobs;
        const numOfValidation = taskInstance.progress.validationJobs;
        const numOfAnnotation = taskInstance.progress.annotationJobs;
        const jobsProgress = ((numOfCompleted + numOfValidation) * 100) / numOfJobs;

        return (
            <Col span={7}>
                <Row>
                    <Col span={24} className='cvat-task-item-progress-wrapper'>
                        <div>
                            {numOfCompleted > 0 && (
                                <Text strong className='cvat-task-completed-progress'>
                                    {`\u2022 ${numOfCompleted} done `}
                                </Text>
                            )}
                            {numOfValidation > 0 && (
                                <Text strong className='cvat-task-validation-progress'>
                                    {`\u2022 ${numOfValidation} on review `}
                                </Text>
                            )}
                            {numOfAnnotation > 0 && (
                                <Text strong className='cvat-task-annotation-progress'>
                                    {`\u2022 ${numOfAnnotation} annotating `}
                                </Text>
                            )}
                            <Text strong type='secondary'>
                                {`\u2022 ${numOfJobs} total`}
                            </Text>
                        </div>
                        <Progress
                            percent={jobsProgress}
                            success={{ percent: (numOfCompleted * 100) / numOfJobs }}
                            strokeColor='#1890FF'
                            showInfo={false}
                            size='small'
                        />
                    </Col>
                </Row>
                <AutomaticAnnotationProgress
                    activeInference={activeInference}
                    cancelAutoAnnotation={cancelAutoAnnotation}
                />
            </Col>
        );
    };

    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    const row = (
        <Row
            ref={itemRef}
            className={`cvat-tasks-list-item${selected ? ' cvat-item-selected' : ''}`}
            justify='center'
            align='top'
            style={style}
            onClick={onClick}
            onContextMenuCapture={handleContextMenuCapture}
        >
            <Col span={4}>
                <Preview
                    task={taskInstance}
                    loadingClassName='cvat-task-item-loading-preview'
                    emptyPreviewClassName='cvat-task-item-empty-preview'
                    previewWrapperClassName='cvat-task-item-preview-wrapper'
                    previewClassName='cvat-task-item-preview'
                />
            </Col>
            <Col span={10} className='cvat-task-item-description'>
                <Text ellipsis={{ tooltip: taskInstance.name }}>
                    <Text strong type='secondary' className='cvat-item-task-id'>{`#${id}: `}</Text>
                    <Text strong className='cvat-item-task-name'>{taskInstance.name}</Text>
                </Text>
                <br />
                {owner && (
                    <>
                        <Text type='secondary'>{`Created ${owner ? `by ${owner}` : ''} on ${created}`}</Text>
                        <br />
                    </>
                )}
                <Text type='secondary'>{`Last updated ${updated}`}</Text>
            </Col>
            {renderProgress()}
            <Col span={3}>
                <Row justify='end'>
                    <Col>
                        <Link to={`/tasks/${id}`}>
                            <Button
                                disabled={!!importingState}
                                className='cvat-item-open-task-button'
                                type='primary'
                                size='large'
                                ghost
                            >
                                Open
                            </Button>
                        </Link>
                    </Col>
                </Row>
                <Row justify='end'>
                    <Col className='cvat-item-open-task-actions'>
                        <div
                            onClick={handleContextMenuClick}
                            className='cvat-task-item-actions-button cvat-actions-menu-button'
                        >
                            <Text className='cvat-text-color'>Actions</Text>
                            <MoreOutlined className='cvat-menu-icon' />
                        </div>
                    </Col>
                </Row>
            </Col>
        </Row>
    );

    return (
        <Badge.Ribbon
            style={{ visibility: ribbonItems.length ? 'visible' : 'hidden' }}
            className='cvat-task-item-ribbon'
            placement='start'
            text={(
                <div>
                    {ribbonItems.sort((item1, item2) => item1.weight - item2.weight)
                        .map((item) => item.component).map((Component, index) => (
                            <Component key={index} targetProps={props} targetState={{ importingState }} />
                        ))}
                </div>
            )}
        >
            <TaskActionsComponent
                dropdownTrigger={['contextMenu']}
                taskInstance={taskInstance}
                triggerElement={row}
            />
        </Badge.Ribbon>
    );
}

export default React.memo(TaskItemComponent);
