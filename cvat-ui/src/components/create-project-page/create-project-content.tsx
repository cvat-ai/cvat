// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState,
    useRef,
    useEffect,
    Component,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Col, Row } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Form, { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import notification from 'antd/lib/notification';

import { CombinedState } from 'reducers/interfaces';
import LabelsEditor from 'components/labels-editor/labels-editor';
import { createProjectAsync } from 'actions/projects-actions';

type NameFormRefType = Component<FormComponentProps<any>, any, any> & WrappedFormUtils;

const ProjectNameEditor = Form.create<FormComponentProps>()(
    (props: FormComponentProps): JSX.Element => {
        const { form } = props;
        const { getFieldDecorator } = form;

        return (
            <Form
                onSubmit={(e): void => e.preventDefault()}
            >
                <Form.Item hasFeedback label={<span>Name</span>}>
                    {getFieldDecorator('name', {
                        rules: [{
                            required: true,
                            message: 'Please, specify a name',
                        }],
                    })(
                        <Input />,
                    )}
                </Form.Item>
            </Form>
        );
    },
);

export default function CreateProjectContent(): JSX.Element {
    const [projectLabels, setProjectLabels] = useState<any[]>([]);
    const nameFormRef = useRef<NameFormRefType>(null);
    const dispatch = useDispatch();
    const history = useHistory();

    const newProjectId = useSelector(
        (state: CombinedState) => state.projects.activities.creates.id,
    );
    const createProjectError = useSelector(
        (state: CombinedState) => state.projects.activities.creates.error,
    );

    useEffect(() => {
        if (Number.isInteger(newProjectId)) {
            const btn = (
                <Button
                    onClick={() => history.push(`/projects/${newProjectId}`)}
                >
                    Open task
                </Button>
            );

            // Clear new project form
            if (nameFormRef.current) nameFormRef.current.resetFields();
            setProjectLabels([]);

            notification.info({
                message: 'The task has been created',
                btn,
            });
        }
    }, [newProjectId]);

    useEffect(() => {
        if (createProjectError) {
            notification.error({
                message: 'Could not create a task',
                description: createProjectError,
            });
        }
    }, [createProjectError]);

    const onSumbit = (): void => {
        let projectName = '';
        if (nameFormRef.current !== null) {
            nameFormRef.current.validateFields((error, value) => {
                if (!error) {
                    projectName = value.name;
                }
            });
        }

        if (!projectName) return;

        dispatch(createProjectAsync({
            name: projectName,
            labels: projectLabels,
        }));
    };

    return (
        <Row type='flex' justify='start' align='middle' className='cvat-create-task-content'>
            <Col span={24}>
                <ProjectNameEditor
                    ref={nameFormRef}
                />
            </Col>
            <Col span={24}>
                <Text className='cvat-text-color'>Labels:</Text>
                <LabelsEditor
                    labels={projectLabels}
                    onSubmit={
                        (newLabels): void => {
                            setProjectLabels(newLabels);
                        }
                    }
                />
            </Col>
            <Col span={6} offset={18}>
                <Button
                    type='primary'
                    onClick={onSumbit}
                >
                    Submit
                </Button>
            </Col>
        </Row>
    );
}
