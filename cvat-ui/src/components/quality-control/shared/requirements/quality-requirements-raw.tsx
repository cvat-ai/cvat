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

    const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
        try {
            const pastedRequirements = parseRawRequirements(event.clipboardData.getData('text'));
            const baseRequirementIDs = new Map<number, number>();

            for (const requirement of pastedRequirements) {
                if (!requirement.is_base || typeof requirement.id !== 'number') {
                    continue;
                }

                const targetBaseRequirement = currentRequirements.find((currentRequirement) => (
                    currentRequirement.isBase && currentRequirement.annotationType === requirement.annotation_type
                ));
                if (targetBaseRequirement) {
                    baseRequirementIDs.set(requirement.id, targetBaseRequirement.id);
                }
            }

            const transformedRequirements = pastedRequirements.map((requirement) => {
                if (requirement.is_base) {
                    return {
                        ...requirement,
                        id: typeof requirement.id === 'number' ?
                            baseRequirementIDs.get(requirement.id) :
                            undefined,
                    };
                }

                return {
                    ...requirement,
                    id: undefined,
                    parent_requirement: typeof requirement.parent_requirement === 'number' ?
                        baseRequirementIDs.get(requirement.parent_requirement) ?? requirement.parent_requirement :
                        requirement.parent_requirement,
                };
            });
            const pastedValue = JSON.stringify(transformedRequirements, null, 2);
            const { selectionStart, selectionEnd } = event.currentTarget;
            const currentValue = form.getFieldValue(QUALITY_REQUIREMENTS_RAW_FIELD) as string ?? '';

            form.setFieldsValue({
                [QUALITY_REQUIREMENTS_RAW_FIELD]: (
                    currentValue.slice(0, selectionStart) + pastedValue + currentValue.slice(selectionEnd)
                ),
            });
            event.preventDefault();
        } catch (_error: unknown) {
            // Keep the original pasted text so the form validator can report its syntax error.
        }
    };

    return (
        <>
            <Form.Item
                name={QUALITY_REQUIREMENTS_RAW_FIELD}
                initialValue={initialValue}
                rules={[{ validator: validateRawRequirements }]}
                preserve
            >
                <Input.TextArea
                    rows={28}
                    className='cvat-quality-requirements-raw-viewer'
                    disabled={disabled}
                    onPaste={onPaste}
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
