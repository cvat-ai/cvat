// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { PercentageOutlined } from '@ant-design/icons';
import Radio from 'antd/lib/radio';
import { FrameSelectionMethod } from 'components/create-job-page/job-form';
import { Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';

export interface QualityConfiguration {}

interface Props {
    onChange(values: QualityConfiguration, reset?: boolean): void;
}

enum ValidationMethod {
    NONE = 'none',
    GT = 'gt_job',
}

const initialValues = {
    validation_method: ValidationMethod.NONE,
};

export default function QualityConfigurationForm(props: Props): React.JSX.Element {
    const { onChange } = props;
    const [currentValidationMethod, setCurrentValidationMethod] = useState(ValidationMethod.NONE);

    useEffect(() => {
        onChange(initialValues);
    }, []);

    useEffect(() => {
        if (currentValidationMethod === ValidationMethod.GT) {
            onChange({
                validation_method: ValidationMethod.GT,
                validation_frames_percent: 5,
                frame_selection_method: FrameSelectionMethod.RANDOM,
            }, true);
        } else if (currentValidationMethod === ValidationMethod.NONE) {
            onChange({
                validation_method: ValidationMethod.NONE,
            }, true);
        }
    }, [currentValidationMethod]);

    let paramsBlock: JSX.Element | null = null;
    if (currentValidationMethod === ValidationMethod.GT) {
        paramsBlock = (
            <>
                <Col>
                    <Form.Item
                        name='frame_selection_method'
                        label='Frame selection method'
                        rules={[{ required: true, message: 'Please, specify frame selection method' }]}
                        initialValue={FrameSelectionMethod.RANDOM}
                    >
                        <Select
                            className='cvat-select-frame-selection-method'
                            onChange={(value) => {
                                onChange({ frame_selection_method: value });
                            }}
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
                <Col span={7}>
                    <Form.Item
                        label='Quantity (%)'
                        name='validation_frames_percent'
                        initialValue={5}
                        rules={[
                            {
                                required: true,
                                message: 'The field is required.',
                            },
                        ]}
                    >
                        <Input name='validation_frames_percent' size='large' type='number' min={0} max={100} suffix={<PercentageOutlined />} />
                    </Form.Item>
                </Col>
            </>

        );
    }

    const validationMethodPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.createTaskPage.qualityForm.validationMethods.items,
        props,
        { currentValidationMethod },
    );
    const validationMethodParamsPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.createTaskPage.qualityForm.validationMethods.params,
        props,
        { currentValidationMethod },
    );

    const validationFormItems: [JSX.Element, number][] = [];
    validationFormItems.push([
        (
            <Radio.Button value={ValidationMethod.NONE} key={ValidationMethod.NONE}>
                None
            </Radio.Button>
        ), 10,
    ]);
    validationFormItems.push([
        (
            <Radio.Button value={ValidationMethod.GT} key={ValidationMethod.GT}>
                Ground truth
            </Radio.Button>
        ), 20,
    ]);
    validationFormItems.push(...validationMethodPlugins.map(({ component: Component, weight }, index: number) => (
        [<Component
            key={index}
            targetProps={props}
            targetState={{ currentValidationMethod }}
        />, weight] as [JSX.Element, number]
    )));

    const validationParamsItems: [JSX.Element, number][] = [];
    if (paramsBlock) {
        validationParamsItems.push([
            paramsBlock, 20,
        ]);
    }

    validationParamsItems
        .push(...validationMethodParamsPlugins.map(({ component: Component, weight }, index: number) => (
            [<Component
                key={index}
                targetProps={props}
                targetState={{ currentValidationMethod }}
            />, weight] as [JSX.Element, number]
        )));

    return (
        <Form
            layout='vertical'
            onChange={(e) => {
                console.log(e);
                const { value } = e.target;
                const key = e.target.name;
                if (key !== 'validation_method') {
                    onChange({ [key]: value });
                }
            }}
            initialValues={initialValues}
        >
            <Form.Item
                label='Validation method'
                name='validation_method'
                rules={[{ required: true }]}
            >
                <Radio.Group
                    buttonStyle='solid'
                    name='validation_method'
                    defaultValue={ValidationMethod.NONE}
                    onChange={(e) => {
                        setCurrentValidationMethod(e.target.value);
                    }}
                >

                    { validationFormItems.sort((item1, item2) => item1[1] - item2[1])
                        .map((item) => item[0]) }
                </Radio.Group>
            </Form.Item>
            { validationParamsItems.sort((item1, item2) => item1[1] - item2[1])
                .map((item) => item[0]) }
        </Form>
    );
}
