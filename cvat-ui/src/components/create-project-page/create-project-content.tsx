// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useRef, useEffect, RefObject,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, { FormInstance } from 'antd/lib/form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import patterns from 'utils/validation-patterns';
import { CombinedState } from 'reducers/interfaces';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { createProjectAsync } from 'actions/projects-actions';

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
            for (const [field, value] of Object.entries(advancedValues)) {
                projectData[field] = value;
            }
        }

        projectData.labels = projectLabels;

        if (!projectData.name) return;

        dispatch(createProjectAsync(projectData));
    };

    return (
        <Row type='flex' justify='start' align='middle' className='cvat-create-project-content'>
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
