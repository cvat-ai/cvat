// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import Input from 'antd/lib/input';
import Form from 'antd/lib/form';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { PercentageOutlined } from '@ant-design/icons';
import Radio from 'antd/lib/radio';

export interface QualityConfiguration {
}

interface Props {
    onChange(values: QualityConfiguration): void;
}

enum ValidationMethod {
    NONE = 'none',
    GT = 'gt_job',
}

export default function QualityConfigurationForm(props: Props): React.JSX.Element {
    const { onChange } = props;
    const [currentValidationMethod, setCurrentValidationMethod] = useState(ValidationMethod.NONE);

    let paramsBlock: JSX.Element | null = null;
    if (currentValidationMethod === ValidationMethod.GT) {
        paramsBlock = (
            <Form.Item
                label='Quantity (%)'
                name='validation_frames_percent'
            >
                <Input name='validation_frames_percent' size='large' type='number' min={5} max={100} suffix={<PercentageOutlined />} />
            </Form.Item>
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
    validationParamsItems.push([
        paramsBlock, 20,
    ]);
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
                const { value } = e.target;
                const key = e.target.name;
                onChange({ [key]: value });
            }}
        >
            <Form.Item
                label='Validation method'
                name='validation_method'
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
