// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';
import Divider from 'antd/lib/divider';
import notification from 'antd/lib/notification';
import { QuestionCircleOutlined } from '@ant-design/icons';

import ProjectSearch from 'components/create-task-page/project-search-field';
import CVATTooltip from 'components/common/cvat-tooltip';
import { CombinedState } from 'reducers/interfaces';
import { switchMoveTaskModalVisible, moveTaskToProjectAsync } from 'actions/tasks-actions';
import getCore from 'cvat-core-wrapper';
import LabelMapperItem, { LabelMapperItemValue } from './label-mapper-item';

const core = getCore();

export default function MoveTaskModal(): JSX.Element {
    const visible = useSelector((state: CombinedState) => state.tasks.moveTask.modalVisible);
    const task = useSelector((state: CombinedState) => {
        const [taskInstance] = state.tasks.current.filter((_task) => _task.instance.id === state.tasks.moveTask.taskId);
        return taskInstance?.instance;
    });
    const taskUpdating = useSelector((state: CombinedState) => state.tasks.updating);
    const dispatch = useDispatch();

    const [projectId, setProjectId] = useState<number | null>(null);
    const [project, setProject] = useState<any>(null);
    const [labelMap, setLabelMap] = useState<{ [key: string]: LabelMapperItemValue }>({});

    const initValues = (): void => {
        const labelValues: { [key: string]: LabelMapperItemValue } = {};
        if (task) {
            task.labels.forEach((label: any) => {
                labelValues[label.id] = {
                    labelId: label.id,
                    newLabelName: null,
                    clearAttributes: true,
                };
            });
        }
        setLabelMap(labelValues);
    };

    const onCancel = (): void => {
        dispatch(switchMoveTaskModalVisible(false));
        initValues();
        setProject(null);
        setProjectId(null);
    };

    const submitMove = async (): Promise<void> => {
        if (!projectId) {
            notification.error({
                message: 'Project not selected',
            });
            return;
        }
        if (!Object.values(labelMap).every((map) => map.newLabelName !== null)) {
            notification.error({
                message: 'Not all labels mapped',
                description: 'Please choose any action to not mapped labels first',
            });
            return;
        }
        dispatch(
            moveTaskToProjectAsync(
                task,
                projectId,
                Object.values(labelMap).map((map) => ({
                    label_id: map.labelId,
                    new_label_name: map.newLabelName,
                    clear_attributes: map.clearAttributes,
                })),
            ),
        );
        onCancel();
    };

    useEffect(() => {
        if (projectId) {
            core.projects.get({ id: projectId }).then((_project: any) => {
                if (projectId) {
                    setProject(_project[0]);
                    const { labels } = _project[0];
                    const labelValues: { [key: string]: LabelMapperItemValue } = {};
                    Object.entries(labelMap).forEach(([id, label]) => {
                        const taskLabelName = task.labels.filter((_label: any) => _label.id === label.labelId)[0].name;
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
    }, [projectId]);

    useEffect(() => {
        initValues();
    }, [task?.id]);

    return (
        <Modal
            visible={visible}
            onCancel={onCancel}
            onOk={submitMove}
            okButtonProps={{ disabled: taskUpdating }}
            title={(
                <span>
                    {`Move task ${task?.id} to project`}
                    {/* TODO: replace placeholder */}
                    <CVATTooltip title='Some moving process description here'>
                        <QuestionCircleOutlined className='ant-typography-secondary' />
                    </CVATTooltip>
                </span>
            )}
            className='cvat-task-move-modal'
        >
            <Row align='middle'>
                <Col>Project:</Col>
                <Col>
                    <ProjectSearch
                        value={projectId}
                        onSelect={setProjectId}
                        filter={(_project) => _project.id !== task?.projectId}
                    />
                </Col>
            </Row>
            <Divider orientation='left'>Label mapping</Divider>
            {!!Object.keys(labelMap).length &&
                !taskUpdating &&
                task?.labels.map((label: any) => (
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
