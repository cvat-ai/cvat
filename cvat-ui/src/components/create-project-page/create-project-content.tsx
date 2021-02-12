// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {RefObject, useEffect, useRef, useState,} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useHistory} from 'react-router';
import {Col, Row} from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, {FormInstance} from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import patterns from 'utils/validation-patterns';
import {CombinedState} from 'reducers/interfaces';
import LabelsEditor from 'components/labels-editor/labels-editor';
import {createProjectAsync} from 'actions/projects-actions';
import {Switch, Select} from "antd";

const { Option } = Select;


function NameConfigurationForm({formRef}: { formRef: RefObject<FormInstance> }): JSX.Element {
    const [trainingEnabled, setTrainingEnabled] = useState(false);
    const [projectClass, setProjectClass] = useState('');

    useEffect(() => {
        setTrainingEnabled(false);
    }, [projectClass])

    const projectClassesForTraining = ['OD']
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
                <Input/>
            </Form.Item>

            <Form.Item
                name='project_class'
                hasFeedback
                label='Class'
            >
                <Select value={projectClass} onChange={(v) => setProjectClass(v)}>
                    <Option value=''>--Not Selected--</Option>
                    <Option value='OD'>Detection</Option>
                </Select>
            </Form.Item>

            <Form.Item
                name={['training', 'enabled']}
                label='Adaptive auto annotation'
                initialValue={false}
            >
                <Switch
                    disabled={!projectClassesForTraining.includes(projectClass)}
                    checked={trainingEnabled}
                    onClick={() => setTrainingEnabled(!trainingEnabled)}
                />
            </Form.Item>
            <Form.Item
                name={['training', 'host']}
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
                <Input
                    placeholder={'https://example.host'}
                    disabled={!trainingEnabled}
                />
            </Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        name={['training', 'username']}
                        label='Username'
                    >
                        <Input
                            placeholder={'UserName'}
                            disabled={!trainingEnabled}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name={['training', 'password']}
                        label='Password'
                    >
                        <Input.Password
                            placeholder={'Pa$$w0rd'}
                            disabled={!trainingEnabled}
                        />
                    </Form.Item>
                </Col>
            </Row>

        </Form>
    );
}

function AdvanvedConfigurationForm({ formRef }: { formRef: RefObject<FormInstance> }): JSX.Element {
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
    const shouldShowNotification = useRef(false);
    const nameFormRef = useRef<FormInstance>(null);
    const advancedFormRef = useRef<FormInstance>(null);
    const dispatch = useDispatch();
    const history = useHistory();

    const newProjectId = useSelector((state: CombinedState) => state.projects.activities.creates.id);

    useEffect(() => {
        if (Number.isInteger(newProjectId) && shouldShowNotification.current) {
            const btn = <Button onClick={() => history.push(`/projects/${newProjectId}`)}>Open project</Button>;

            // Clear new project forms
            if (nameFormRef.current) nameFormRef.current.resetFields();
            if (advancedFormRef.current) advancedFormRef.current.resetFields();
            setProjectLabels([]);

            notification.info({
                message: 'The project has been created',
                btn,
            });
        }

        shouldShowNotification.current = true;
    }, [newProjectId]);

    const onSumbit = async (): Promise<void> => {
        interface Project {
            [key: string]: any;
        }

        const projectData: Project = {};
        if (nameFormRef.current && advancedFormRef.current) {
            const basicValues = await nameFormRef.current.validateFields();
            const advancedValues = await advancedFormRef.current.validateFields();
            projectData.name = basicValues.name;
            projectData.project_class = basicValues.project_class;
            projectData.training_project = {};
            for (const [field, value] of Object.entries(basicValues.training)) {
                console.log(field, value)
                projectData.training_project[field] = value;
            }
            for (const [field, value] of Object.entries(advancedValues)) {
                projectData[field] = value;
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
                <AdvanvedConfigurationForm formRef={advancedFormRef} />
            </Col>
            <Col span={24}>
                <Button type='primary' onClick={onSumbit}>
                    Submit
                </Button>
            </Col>
        </Row>
    );
}
