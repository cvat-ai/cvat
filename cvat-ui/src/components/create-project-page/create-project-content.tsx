// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    RefObject, useContext, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import Switch from 'antd/lib/switch';
import Select from 'antd/lib/select';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, { FormInstance } from 'antd/lib/form';
import Collapse from 'antd/lib/collapse';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import patterns from 'utils/validation-patterns';
import { CombinedState } from 'reducers/interfaces';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { createProjectAsync } from 'actions/projects-actions';
import CreateProjectContext from './create-project.context';
import { StorageLocation, StorageState } from 'reducers/interfaces';
import CVATTooltip from 'components/common/cvat-tooltip';
import StorageField from 'components/storage/storage';
import StorageForm from 'components/storage/storage-form';
import Space from 'antd/lib/space';

const { Option } = Select;

function NameConfigurationForm({ formRef }: { formRef: RefObject<FormInstance> }): JSX.Element {
    return (
        <Form layout='vertical' ref={formRef}>
            <Form.Item
                name='name'
                hasFeedback
                label='Name'
                rules={[
                    {
                        required: true,
                        message: 'Please, specify a name',
                    },
                ]}
            >
                <Input />
            </Form.Item>
        </Form>
    );
}

function AdaptiveAutoAnnotationForm({ formRef }: { formRef: RefObject<FormInstance> }): JSX.Element {
    const { projectClass, trainingEnabled } = useContext(CreateProjectContext);
    const projectClassesForTraining = ['OD'];
    return (
        <Form layout='vertical' ref={formRef}>
            <Form.Item name='project_class' hasFeedback label='Class'>
                <Select value={projectClass.value} onChange={(v) => projectClass.set(v)}>
                    <Option value=''>--Not Selected--</Option>
                    <Option value='OD'>Detection</Option>
                </Select>
            </Form.Item>

            <Form.Item name='enabled' label='Adaptive auto annotation' initialValue={false}>
                <Switch
                    disabled={!projectClassesForTraining.includes(projectClass.value)}
                    checked={trainingEnabled.value}
                    onClick={() => trainingEnabled.set(!trainingEnabled.value)}
                />
            </Form.Item>

            <Form.Item
                name='host'
                label='Host'
                rules={[
                    {
                        validator: (_, value, callback): void => {
                            if (value && !patterns.validateURL.pattern.test(value)) {
                                callback('Training server host must be url.');
                            } else {
                                callback();
                            }
                        },
                    },
                ]}
            >
                <Input placeholder='https://example.host' disabled={!trainingEnabled.value} />
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name='username' label='Username'>
                        <Input placeholder='UserName' disabled={!trainingEnabled.value} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name='password' label='Password'>
                        <Input.Password placeholder='Pa$$w0rd' disabled={!trainingEnabled.value} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
}

interface AdvancedConfigurationFormProps {
    formRef: RefObject<FormInstance>;
    sourceStorageFormRef: RefObject<FormInstance>;
    targetStorageFormRef: RefObject<FormInstance>;
}

function AdvancedConfigurationForm(props: AdvancedConfigurationFormProps): JSX.Element {
    const { formRef, sourceStorageFormRef, targetStorageFormRef } = props;
        return (
        <Form layout='vertical' ref={formRef}>
            <Form.Item
                name='bug_tracker'
                label='Issue tracker'
                extra='Attach issue tracker where the project is described'
                hasFeedback
                rules={[
                    {
                        validator: (_, value, callback): void => {
                            if (value && !patterns.validateURL.pattern.test(value)) {
                                callback('Issue tracker must be URL');
                            } else {
                                callback();
                            }
                        },
                    },
                ]}
            >
                <Input />
            </Form.Item>
            <Row justify='space-between'>
                <Col span={12}>
                    <StorageForm
                        formRef={sourceStorageFormRef}
                        projectId={null}
                        storageLabel='Source storage'
                        storageDescription='Specify source storage for import resources like annotation, backups'
                        onChangeStorage={(value) => console.log(value)}
                    />
                </Col>
                <Col span={12}>
                    <StorageForm
                        formRef={targetStorageFormRef}
                        projectId={null}
                        storageLabel='Target storage'
                        storageDescription='Specify target storage for export resources like annotation, backups'
                        onChangeStorage={(value) => console.log(value)}
                    />
                </Col>
            </Row>
        </Form>
    );
}

export default function CreateProjectContent(): JSX.Element {
    const [projectLabels, setProjectLabels] = useState<any[]>([]);
    const shouldShowNotification = useRef(false);
    const nameFormRef = useRef<FormInstance>(null);
    const adaptiveAutoAnnotationFormRef = useRef<FormInstance>(null);
    const advancedFormRef = useRef<FormInstance>(null);
    const sourceStorageFormRef = useRef<FormInstance>(null);
    const targetStorageFormRef = useRef<FormInstance>(null);
    const dispatch = useDispatch();
    const history = useHistory();

    const newProjectId = useSelector((state: CombinedState) => state.projects.activities.creates.id);

    const { isTrainingActive } = useContext(CreateProjectContext);

    useEffect(() => {
        if (Number.isInteger(newProjectId) && shouldShowNotification.current) {
            const btn = <Button onClick={() => history.push(`/projects/${newProjectId}`)}>Open project</Button>;

            // Clear new project forms
            if (nameFormRef.current) nameFormRef.current.resetFields();
            if (advancedFormRef.current) advancedFormRef.current.resetFields();
            sourceStorageFormRef.current?.resetFields();
            targetStorageFormRef.current?.resetFields();
            setProjectLabels([]);

            notification.info({
                message: 'The project has been created',
                btn,
                className: 'cvat-notification-create-project-success',
            });
        }

        shouldShowNotification.current = true;
    }, [newProjectId]);

    const onSumbit = async (): Promise<void> => {
        let projectData: Record<string, any> = {};
        if (nameFormRef.current && advancedFormRef.current) {
            const basicValues = await nameFormRef.current.validateFields();
            const advancedValues = await advancedFormRef.current.validateFields();
            const sourceStorageValues = await sourceStorageFormRef.current?.validateFields();
            const targetStorageValues = await targetStorageFormRef.current?.validateFields();

            let sourceStorage = {
                location: sourceStorageValues['location'] || StorageLocation.LOCAL,
                cloud_storage_id: sourceStorageValues['cloudStorageId'] || null,
            };
            let targetStorage = {
                location: targetStorageValues['location'] ||StorageLocation.LOCAL,
                cloud_storage_id: targetStorageValues['cloudStorageId'] || null,
            };

            const adaptiveAutoAnnotationValues = await adaptiveAutoAnnotationFormRef.current?.validateFields();
            projectData = {
                ...projectData,
                ...advancedValues,
                name: basicValues.name,
                source_storage: sourceStorage,
                target_storage: targetStorage,
            };

            if (adaptiveAutoAnnotationValues) {
                projectData.training_project = { ...adaptiveAutoAnnotationValues };
            }
        }

        projectData.labels = projectLabels;

        if (!projectData.name) return;

        dispatch(createProjectAsync(projectData));
    };

    return (
        <Row justify='start' align='middle' className='cvat-create-project-content'>
            <Col span={24}>
                <NameConfigurationForm formRef={nameFormRef} />
            </Col>
            {isTrainingActive.value && (
                <Col span={24}>
                    <AdaptiveAutoAnnotationForm formRef={adaptiveAutoAnnotationFormRef} />
                </Col>
            )}
            <Col span={24}>
                <Text className='cvat-text-color'>Labels:</Text>
                <LabelsEditor
                    labels={projectLabels}
                    onSubmit={(newLabels): void => {
                        setProjectLabels(newLabels);
                    }}
                />
            </Col>
            <Col span={24}>
                <Collapse>
                    <Collapse.Panel key='1' header={<Text className='cvat-title'>Advanced configuration</Text>}>
                        <AdvancedConfigurationForm
                            formRef={advancedFormRef}
                            sourceStorageFormRef={sourceStorageFormRef}
                            targetStorageFormRef={targetStorageFormRef}
                        />
                    </Collapse.Panel>
                </Collapse>
            </Col>
            <Col span={24}>
                <Button type='primary' onClick={onSumbit}>
                    Submit
                </Button>
            </Col>
        </Row>
    );
}
