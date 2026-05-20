// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';

import { JobType } from 'cvat-core/src/enums';
import { Task } from 'cvat-core-wrapper';
import { createJobAsync } from 'actions/jobs-actions';
import { FrameSelectionMethod, JobData, JobFormData } from './job-form';

interface Props {
    task: Task;
}

function AudioJobForm(props: Props): JSX.Element {
    const { task } = props;
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const history = useHistory();
    const [fetching, setFetching] = useState(false);

    const submit = useCallback(async (): Promise<any> => {
        try {
            const values: JobFormData = await form.validateFields();
            const data: JobData = {
                taskID: task.id,
                frameSelectionMethod: FrameSelectionMethod.RANDOM,
                type: values.type,
            };

            const createdJob = await dispatch(createJobAsync(data));
            return createdJob;
        } catch (_e) {
            return false;
        }
    }, [task]);

    const onSubmit = async (): Promise<void> => {
        try {
            setFetching(true);
            const createdJob = await submit();
            if (createdJob) {
                history.push(`/tasks/${task.id}/jobs/${createdJob.id}`);
            }
        } finally {
            setFetching(false);
        }
    };

    return (
        <Row className='cvat-create-job-form-wrapper'>
            <Col span={24}>
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{ type: JobType.GROUND_TRUTH }}
                >
                    <Col>
                        <Form.Item
                            name='type'
                            label='Job type'
                            rules={[{ required: true, message: 'Please, specify Job type' }]}
                        >
                            <Select virtual={false} className='cvat-select-job-type'>
                                <Select.Option value={JobType.GROUND_TRUTH}>
                                    Ground truth
                                </Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Form>
            </Col>
            <Col span={24} className='cvat-create-job-actions'>
                <Row justify='end'>
                    <Col>
                        <Button
                            className='cvat-submit-job-button'
                            type='primary'
                            onClick={onSubmit}
                            loading={fetching}
                            disabled={fetching}
                        >
                            Submit
                        </Button>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(AudioJobForm);
