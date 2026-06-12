// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useMemo } from 'react';
import Button from 'antd/lib/button';
import Form, { FormInstance, RuleObject } from 'antd/lib/form';
import Input from 'antd/lib/input';
import {
    QualitySettings,
} from 'cvat-core-wrapper';
import {
    QUALITY_REQUIREMENTS_RAW_FIELD,
    parseRawRequirements,
    requirementToRaw,
    validateRawRequirements as validateParsedRawRequirements,
} from './quality-requirements-utils';

interface Props {
    form: FormInstance;
    settings: QualitySettings;
    disabled: boolean;
}

export default function QualityRequirementsRaw(props: Readonly<Props>): JSX.Element {
    const {
        form,
        settings,
        disabled,
    } = props;

    const currentRequirements = settings.requirements;
    const initialValue = useMemo(() => (
        JSON.stringify(currentRequirements.map(requirementToRaw), null, 2)
    ), [currentRequirements]);

    useEffect(() => {
        form.setFieldsValue({ [QUALITY_REQUIREMENTS_RAW_FIELD]: initialValue });
    }, [form, initialValue]);

    const resetRawRequirements = (): void => {
        form.setFieldsValue({ [QUALITY_REQUIREMENTS_RAW_FIELD]: initialValue });
        form.setFields([{ name: QUALITY_REQUIREMENTS_RAW_FIELD, errors: [] }]);
    };

    const validateRawRequirements = (_: RuleObject, value: string): Promise<void> => {
        try {
            const parsed = parseRawRequirements(value);
            validateParsedRawRequirements(currentRequirements, parsed);
        } catch (error: unknown) {
            return Promise.reject(error);
        }

        return Promise.resolve();
    };

    return (
        <>
            <Form.Item
                name={QUALITY_REQUIREMENTS_RAW_FIELD}
                initialValue={initialValue}
                rules={[{ validator: validateRawRequirements }]}
                preserve
                noStyle
            >
                <Input.TextArea
                    rows={28}
                    className='cvat-quality-requirements-raw-viewer'
                    disabled={disabled}
                />
            </Form.Item>
            <div className='cvat-quality-requirements-raw-actions'>
                <Button
                    type='primary'
                    danger
                    disabled={disabled}
                    onClick={resetRawRequirements}
                >
                    Cancel
                </Button>
            </div>
        </>
    );
}
