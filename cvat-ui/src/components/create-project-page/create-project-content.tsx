// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useRef, useEffect, Component,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import patterns from 'utils/validation-patterns';
import { CombinedState } from 'reducers/interfaces';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { createProjectAsync } from 'actions/projects-actions';

type FormRefType = Component<FormComponentProps<any>, any, any> & WrappedFormUtils;

const ProjectNameEditor = Form.create<FormComponentProps>()(
    (props: FormComponentProps): JSX.Element => {
        const { form } = props;
        const { getFieldDecorator } = form;

        return (
            <Form onSubmit={(e): void => e.preventDefault()}>
                <Form.Item hasFeedback label={<span>Name</span>}>
                    {getFieldDecorator('name', {
                        rules: [
                            {
                                required: true,
                                message: 'Please, specify a name',
                            },
                        ],
                    })(<Input />)}
                </Form.Item>
            </Form>
        );
    },
);

const AdvanvedConfigurationForm = Form.create<FormComponentProps>()(
    (props: FormComponentProps): JSX.Element => {
        const { form } = props;
        const { getFieldDecorator } = form;

        return (
            <Form onSubmit={(e): void => e.preventDefault()}>
                <Form.Item
                    label={<span>Issue tracker</span>}
                    extra='Attach issue tracker where the project is described'
                    hasFeedback
                >
                    {getFieldDecorator('bug_tracker', {
                        rules: [
                            {
                                validator: (_, value, callback): void => {
                                    if (value && !patterns.validateURL.pattern.test(value)) {
                                        callback('Issue tracker must be URL');
                                    } else {
                                        callback();
                                    }
                                },
                            },
                        ],
                    })(<Input />)}
                </Form.Item>
            </Form>
        );
    },
);

export default function CreateProjectContent(): JSX.Element {
    const [projectLabels, setProjectLabels] = useState<any[]>([]);
    const shouldShowNotification = useRef(false);
    const nameFormRef = useRef<FormRefType>(null);
    const advancedFormRef = useRef<FormRefType>(null);
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

    const onSumbit = (): void => {
        interface Project {
            [key: string]: any;
        }

        const projectData: Project = {};
        if (nameFormRef.current !== null) {
            nameFormRef.current.validateFields((error, value) => {
                if (!error) {
                    projectData.name = value.name;
                }
            });
        }

        if (advancedFormRef.current !== null) {
            advancedFormRef.current.validateFields((error, values) => {
                if (!error) {
                    for (const [field, value] of Object.entries(values)) {
                        projectData[field] = value;
                    }
                }
            });
        }

        projectData.labels = projectLabels;

        if (!projectData.name) return;

        dispatch(createProjectAsync(projectData));
    };

    return (
        <Row type='flex' justify='start' align='middle' className='cvat-create-project-content'>
            <Col span={24}>
                <ProjectNameEditor ref={nameFormRef} />
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
                <AdvanvedConfigurationForm ref={advancedFormRef} />
            </Col>
            <Col span={24}>
                <Button type='primary' onClick={onSumbit}>
                    Submit
                </Button>
            </Col>
        </Row>
    );
}
