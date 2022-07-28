// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    RefObject, useContext, useRef, useState, useEffect,
} from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import Switch from 'antd/lib/switch';
import Select from 'antd/lib/select';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, { FormInstance } from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import patterns from 'utils/validation-patterns';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { createProjectAsync } from 'actions/projects-actions';
import CreateProjectContext from './create-project.context';

const { Option } = Select;

function NameConfigurationForm(
    { formRef, inputRef }:
    { formRef: RefObject<FormInstance>, inputRef: RefObject<Input> },
):JSX.Element {
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
                <Input ref={inputRef} />
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
                <Select value={projectClass.value} onChange={(v) => projectClass.set?.(v)}>
                    <Option value=''>--Not Selected--</Option>
                    <Option value='OD'>Detection</Option>
                </Select>
            </Form.Item>

            <Form.Item name='enabled' label='Adaptive auto annotation' initialValue={false}>
                <Switch
                    disabled={!projectClassesForTraining.includes(projectClass.value)}
                    checked={trainingEnabled.value}
                    onClick={() => trainingEnabled.set?.(!trainingEnabled.value)}
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

function AdvancedConfigurationForm({ formRef }: { formRef: RefObject<FormInstance> }): JSX.Element {
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
        </Form>
    );
}

export default function CreateProjectContent(): JSX.Element {
    const [projectLabels, setProjectLabels] = useState<any[]>([]);
    const nameFormRef = useRef<FormInstance>(null);
    const nameInputRef = useRef<Input>(null);
    const adaptiveAutoAnnotationFormRef = useRef<FormInstance>(null);
    const advancedFormRef = useRef<FormInstance>(null);
    const dispatch = useDispatch();
    const history = useHistory();

    const { isTrainingActive } = useContext(CreateProjectContext);

    const resetForm = (): void => {
        if (nameFormRef.current) nameFormRef.current.resetFields();
        if (advancedFormRef.current) advancedFormRef.current.resetFields();
        setProjectLabels([]);
    };

    const focusForm = (): void => {
        nameInputRef.current?.focus();
    };

    const sumbit = async (): Promise<any> => {
        try {
            let projectData: Record<string, any> = {};
            if (nameFormRef.current && advancedFormRef.current) {
                const basicValues = await nameFormRef.current.validateFields();
                const advancedValues = await advancedFormRef.current.validateFields();
                const adaptiveAutoAnnotationValues = await adaptiveAutoAnnotationFormRef.current?.validateFields();
                projectData = {
                    ...projectData,
                    ...advancedValues,
                    name: basicValues.name,
                };

                if (adaptiveAutoAnnotationValues) {
                    projectData.training_project = { ...adaptiveAutoAnnotationValues };
                }
            }

            projectData.labels = projectLabels;

            const createdProject = await dispatch(createProjectAsync(projectData));
            return createdProject;
        } catch {
            return false;
        }
    };

    const onSubmitAndOpen = async (): Promise<void> => {
        const createdProject = await sumbit();
        if (createdProject) {
            history.push(`/projects/${createdProject.id}`);
        }
    };

    const onSubmitAndContinue = async (): Promise<void> => {
        const res = await sumbit();
        if (res) {
            resetForm();
            notification.info({
                message: 'The project has been created',
                className: 'cvat-notification-create-project-success',
            });
            focusForm();
        }
    };

    useEffect(() => {
        focusForm();
    }, []);

    return (
        <Row justify='start' align='middle' className='cvat-create-project-content'>
            <Col span={24}>
                <NameConfigurationForm formRef={nameFormRef} inputRef={nameInputRef} />
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
                <AdvancedConfigurationForm formRef={advancedFormRef} />
            </Col>
            <Col span={24}>
                <Row justify='end' gutter={5}>
                    <Col>
                        <Button type='primary' onClick={onSubmitAndOpen}>
                            Submit & Open
                        </Button>
                    </Col>
                    <Col>
                        <Button type='primary' onClick={onSubmitAndContinue}>
                            Submit & Continue
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
