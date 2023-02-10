// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, {
    useState, useEffect, useCallback, useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import notification from 'antd/lib/notification';
import { QuestionCircleOutlined } from '@ant-design/icons';

import ProjectSearch from 'components/create-task-page/project-search-field';
import CVATLoadingSpinner from 'components/common/loading-spinner';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers';
import { switchMoveTaskModalVisible } from 'actions/tasks-actions';
import { getCore, Task, Label } from 'cvat-core-wrapper';
import LabelMapperItem, { LabelMapperItemValue } from './label-mapper-item';

const core = getCore();

export default function MoveTaskModal({
    onUpdateTask,
}: {
    onUpdateTask?: (task: Task) => Promise<void>,
}): JSX.Element {
    const dispatch = useDispatch();
    const visible = useSelector((state: CombinedState) => state.tasks.moveTask.modalVisible);
    const taskId = useSelector((state: CombinedState) => state.tasks.moveTask.taskId);
    const mounted = useRef(false);

    const [taskFetching, setTaskFetching] = useState(false);
    const [taskInstance, setTaskInstance] = useState<Task | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [project, setProject] = useState<any>(null);
    const [labelMap, setLabelMap] = useState<{ [key: string]: LabelMapperItemValue }>({});

    const initValues = useCallback(() => {
        const labelValues: { [key: string]: LabelMapperItemValue } = {};
        if (taskInstance) {
            taskInstance.labels.forEach((label: Label) => {
                const labelId = label.id as number;
                labelValues[labelId] = {
                    labelId,
                    newLabelName: null,
                    clearAttributes: true,
                };
            });
        }

        setLabelMap(labelValues);
    }, [taskInstance]);

    const onCancel = useCallback(() => {
        dispatch(switchMoveTaskModalVisible(false));
        initValues();
        setProject(null);
        setProjectId(null);
    }, [initValues]);

    const submitMove = async (): Promise<void> => {
        if (!taskInstance) {
            throw new Error('Task to move is not specified');
        }

        if (!projectId) {
            notification.error({ message: 'Please, select a project' });
            return;
        }

        if (Object.values(labelMap).some((map) => map.newLabelName === null)) {
            notification.error({
                message: 'Please, specify mapping for all the labels',
            });
            return;
        }

        taskInstance.labels = Object.values(labelMap).map((map) => ({
            label_id: map.labelId,
            new_label_name: map.newLabelName,
            clear_attributes: map.clearAttributes,
        })).map((mapper) => {
            const [label] = taskInstance.labels.filter((_label: any) => mapper.label_id === _label.id);
            label.name = mapper.new_label_name as string;
            return label;
        });

        taskInstance.projectId = projectId;
        setIsUpdating(true);
        if (onUpdateTask) {
            onUpdateTask(taskInstance).finally(() => {
                if (mounted.current) {
                    setIsUpdating(false);
                }
            });
        } else {
            taskInstance.save().finally(() => {
                if (mounted.current) {
                    setIsUpdating(false);
                }
            }).catch((error: Error) => notification.error({
                message: 'Could not update the task',
                description: error.toString(),
            }));
        }

        onCancel();
    };

    useEffect(() => {
        setTaskFetching(true);
        if (visible && Number.isInteger(taskId)) {
            core.tasks.get({ id: taskId })
                .then(([task]: Task[]) => {
                    if (mounted.current) {
                        setTaskInstance(task);
                    }
                })
                .catch((error: Error) => notification.error({
                    message: 'Could not fetch task from the server',
                    description: error.toString(),
                })).finally(() => {
                    if (mounted.current) {
                        setTaskFetching(false);
                    }
                });
        }
    }, [visible]);

    useEffect(() => {
        if (projectId && taskInstance) {
            core.projects.get({ id: projectId }).then((_project: any) => {
                if (projectId) {
                    setProject(_project[0]);
                    const { labels } = _project[0];
                    const labelValues: { [key: string]: LabelMapperItemValue } = {};
                    Object.entries(labelMap).forEach(([id, label]) => {
                        const taskLabelName = taskInstance
                            .labels.filter((_label: any) => _label.id === label.labelId)[0].name;
                        const [autoNewLabel] = labels.filter((_label: any) => _label.name === taskLabelName);
                        labelValues[id] = {
                            labelId: label.labelId,
                            newLabelName: autoNewLabel ? autoNewLabel.name : null,
                            clearAttributes: true,
                        };
                    });
                    setLabelMap(labelValues);
                }
            });
        } else {
            setProject(null);
        }
    }, [projectId, taskInstance]);

    useEffect(() => {
        initValues();
    }, [taskInstance]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    return (
        <Modal
            visible={visible}
            onCancel={onCancel}
            onOk={submitMove}
            okButtonProps={{ disabled: isUpdating }}
            title={(
                <span>
                    {`Move task ${taskInstance?.id} to project`}
                    {/* TODO: replace placeholder */}
                    <CVATTooltip title='Some moving process description here'>
                        <QuestionCircleOutlined className='ant-typography-secondary' />
                    </CVATTooltip>
                </span>
            )}
            className='cvat-task-move-modal'
        >
            { taskFetching && <CVATLoadingSpinner size='large' /> }
            <Row align='middle'>
                <Col>Project:</Col>
                <Col>
                    <ProjectSearch
                        value={projectId}
                        onSelect={setProjectId}
                        filter={(_project) => _project.id !== taskInstance?.projectId}
                    />
                </Col>
            </Row>
            <Divider orientation='left'>Label mapping</Divider>
            {!!Object.keys(labelMap).length &&
                !isUpdating &&
                taskInstance?.labels.map((label: any) => (
                    <LabelMapperItem
                        label={label}
                        key={label.id}
                        projectLabels={project?.labels}
                        value={labelMap[label.id]}
                        labelMappers={Object.values(labelMap)}
                        onChange={(value) => {
                            setLabelMap({
                                ...labelMap,
                                [value.labelId]: value,
                            });
                        }}
                    />
                ))}
        </Modal>
    );
}
