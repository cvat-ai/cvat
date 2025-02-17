// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useDispatch } from 'react-redux';
import { Row, Col } from 'antd/lib/grid';
import Form from 'antd/lib/form';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import InputNumber from 'antd/lib/input-number';
import Space from 'antd/lib/space';
import { QuestionCircleOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';

import { JobType } from 'cvat-core/src/enums';
import { Task } from 'cvat-core-wrapper';
import { createJobAsync } from 'actions/jobs-actions';

export enum FrameSelectionMethod {
    RANDOM = 'random_uniform',
    RANDOM_PER_JOB = 'random_per_job',
}

interface JobDataMutual {
    taskID: number;
    frameSelectionMethod: FrameSelectionMethod;
    type: JobType;
    seed?: number;
}

export interface JobData extends JobDataMutual {
    frameCount?: number;
    framesPerJobCount?: number;
}

export interface JobFormData extends JobDataMutual {
    quantity: number;
    frameCount: number;
}

interface Props {
    task: Task;
}

const defaultQuantity = 5;

function JobForm(props: Props): JSX.Element {
    const { task } = props;
    const { size: taskSize, segmentSize } = task;
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const history = useHistory();
    const [fetching, setFetching] = useState(false);
    const [frameSelectionMethod, setFrameSelectionMethod] = useState(FrameSelectionMethod.RANDOM);

    const submit = useCallback(async (): Promise<any> => {
        try {
            const values: JobFormData = await form.validateFields();
            const data: JobData = {
                taskID: task.id,
                frameSelectionMethod: values.frameSelectionMethod,
                type: values.type,
                seed: values.seed,
                ...(values.frameSelectionMethod === FrameSelectionMethod.RANDOM ?
                    { frameCount: values.frameCount } : { framesPerJobCount: values.frameCount }
                ),
            };

            const createdJob = await dispatch(createJobAsync(data));
            return createdJob;
        } catch (e) {
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

    const sizeBase = (): number => {
        if (frameSelectionMethod === FrameSelectionMethod.RANDOM) {
            return taskSize;
        }
        return segmentSize;
    };

    const quantityFromFrameCount = (value: number): number => Math.floor((value / sizeBase()) * 100);
    const frameCountFromQuantity = (value: number): number => Math.round((value * sizeBase()) / 100);

    const onQuantityChange = useCallback((value: number | null) => {
        if (value) {
            const newFrameCount = frameCountFromQuantity(value);
            form.setFieldsValue({
                frameCount: newFrameCount,
            });
        }
    }, [taskSize, frameSelectionMethod, segmentSize]);

    const onFrameCountChange = useCallback((value: number | null) => {
        if (value) {
            const newQuantity = quantityFromFrameCount(value);
            form.setFieldsValue({
                quantity: newQuantity,
            });
        }
    }, [taskSize, frameSelectionMethod, segmentSize]);

    useEffect(() => {
        const currentQuantity = form.getFieldValue('quantity');
        onQuantityChange(currentQuantity);
    }, [form, frameSelectionMethod]);

    const description = 'A representative set, 5-15% of randomly chosen frames is recommended';

    return (
        <Row className='cvat-create-job-form-wrapper'>
            <Col span={24}>
                <Form
                    form={form}
                    layout='vertical'
                    initialValues={{
                        type: JobType.GROUND_TRUTH,
                        frameSelectionMethod: FrameSelectionMethod.RANDOM,
                        quantity: defaultQuantity,
                        frameCount: frameCountFromQuantity(defaultQuantity),
                    }}
                >
                    <Col>
                        <Form.Item
                            name='type'
                            label='Job type'
                            rules={[{ required: true, message: 'Please, specify Job type' }]}
                        >
                            <Select
                                virtual={false}
                                className='cvat-select-job-type'
                            >
                                <Select.Option value={JobType.GROUND_TRUTH}>
                                    Ground truth
                                </Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name='frameSelectionMethod'
                            label='Frame selection method'
                            rules={[{ required: true, message: 'Please, specify frame selection method' }]}
                        >
                            <Select
                                virtual={false}
                                className='cvat-select-frame-selection-method'
                                onChange={setFrameSelectionMethod}
                            >
                                <Select.Option value={FrameSelectionMethod.RANDOM}>
                                    Random
                                </Select.Option>
                                <Select.Option value={FrameSelectionMethod.RANDOM_PER_JOB}>
                                    Random per job
                                </Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Row justify='space-between'>
                            <Col>
                                <Form.Item
                                    name='quantity'
                                    label={(
                                        <Space>
                                            {frameSelectionMethod === FrameSelectionMethod.RANDOM ?
                                                'Quantity' : 'Quantity per job'}
                                            <CVATTooltip title={description}>
                                                <QuestionCircleOutlined
                                                    style={{ opacity: 0.5 }}
                                                />
                                            </CVATTooltip>
                                        </Space>
                                    )}
                                    rules={[{ required: true, message: 'Please, specify quantity' }]}
                                >
                                    <InputNumber
                                        className='cvat-input-frame-quantity'
                                        min={1}
                                        max={100}
                                        size='middle'
                                        onChange={onQuantityChange}
                                    />
                                </Form.Item>

                            </Col>
                            <Col>
                                <Row>
                                    <Col>
                                        <Form.Item
                                            name='frameCount'
                                            label={(
                                                <Space>
                                                    Frame count
                                                    <CVATTooltip title={description}>
                                                        <QuestionCircleOutlined
                                                            style={{ opacity: 0.5 }}
                                                        />
                                                    </CVATTooltip>
                                                </Space>
                                            )}
                                            rules={[{ required: true, message: 'Please, specify frame count' }]}
                                        >
                                            <InputNumber
                                                className='cvat-input-frame-count'
                                                min={1}
                                                max={taskSize}
                                                size='middle'
                                                onChange={onFrameCountChange}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Col>
                            <Col>
                                <Form.Item
                                    name='seed'
                                    label='Seed'
                                >
                                    <InputNumber
                                        className='cvat-input-seed'
                                        size='middle'
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
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

export default React.memo(JobForm);
