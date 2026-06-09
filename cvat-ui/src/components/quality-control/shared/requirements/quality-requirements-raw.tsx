// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useMemo, useState } from 'react';
import Button from 'antd/lib/button';
import Form, { RuleObject } from 'antd/lib/form';
import Input from 'antd/lib/input';
import Modal from 'antd/lib/modal';
import notification from 'antd/lib/notification';
import { Store } from 'antd/lib/form/interface';
import {
    getCore,
    QualityRequirement,
    QualitySettings,
} from 'cvat-core-wrapper';
import {
    ANNOTATION_TYPES,
    METRICS,
    RequirementRawData,
    rawToSaveFields,
    requirementToRaw,
} from './quality-requirements-utils';

const core = getCore();

interface Props {
    settings: QualitySettings;
    disabled: boolean;
    onReload: () => Promise<void>;
}

function replaceTrailingCommas(value: string): string {
    return value.replace(/,{1}[\s]*}/g, '}').replace(/,{1}[\s]*]/g, ']');
}

function parseRawRequirements(value: string): RequirementRawData[] {
    const parsed = JSON.parse(replaceTrailingCommas(value));
    if (!Array.isArray(parsed)) {
        throw new Error('Field is expected to be a JSON array');
    }

    return parsed;
}

function validateRequirementNames(requirements: RequirementRawData[]): void {
    const names = requirements.map((requirement: RequirementRawData): string => (
        typeof requirement.name === 'string' ? requirement.name.trim() : ''
    ));

    if (names.some((name: string): boolean => !name)) {
        throw new Error('Requirement name is required');
    }

    if (new Set(names).size !== names.length) {
        throw new Error('Requirement name must be unique');
    }
}

function validateKnownValues(requirements: RequirementRawData[]): void {
    for (const requirement of requirements) {
        if (requirement.annotation_type && !ANNOTATION_TYPES.includes(requirement.annotation_type)) {
            throw new Error(`Unknown annotation type "${requirement.annotation_type}"`);
        }

        if (requirement.metric && !METRICS.includes(requirement.metric)) {
            throw new Error(`Unknown metric "${requirement.metric}"`);
        }

        if (
            requirement.required_score !== null &&
            typeof requirement.required_score !== 'undefined' &&
            (typeof requirement.required_score !== 'number' ||
                requirement.required_score < 0 ||
                requirement.required_score > 1)
        ) {
            throw new Error('Required score must be a number from 0 to 1');
        }
    }
}

function validateDefaultRequirementsArePresent(
    currentRequirements: QualityRequirement[],
    parsedRequirements: RequirementRawData[],
): void {
    const parsedIds = new Set(parsedRequirements
        .map((requirement: RequirementRawData): number | undefined => requirement.id)
        .filter((id: number | undefined): id is number => typeof id === 'number'));

    const removedDefault = currentRequirements.find((requirement: QualityRequirement): boolean => (
        requirement.isDefault && typeof requirement.id === 'number' && !parsedIds.has(requirement.id)
    ));

    if (removedDefault) {
        throw new Error(`Default requirement "${removedDefault.name}" cannot be removed`);
    }
}

export default function QualityRequirementsRaw(props: Readonly<Props>): JSX.Element {
    const {
        settings,
        disabled,
        onReload,
    } = props;

    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    const currentRequirements = settings.requirements;
    const initialValue = useMemo(() => (
        JSON.stringify(currentRequirements.map(requirementToRaw), null, 2)
    ), [currentRequirements]);

    useEffect(() => {
        form.setFieldsValue({ requirements: initialValue });
    }, [form, initialValue]);

    const resetRawRequirements = (): void => {
        form.setFieldsValue({ requirements: initialValue });
        form.setFields([{ name: 'requirements', errors: [] }]);
    };

    const validateRawRequirements = (_: RuleObject, value: string): Promise<void> => {
        try {
            const parsed = parseRawRequirements(value);
            validateRequirementNames(parsed);
            validateKnownValues(parsed);
            validateDefaultRequirementsArePresent(currentRequirements, parsed);
        } catch (error: unknown) {
            return Promise.reject(error);
        }

        return Promise.resolve();
    };

    const applyRawRequirements = async (requirements: RequirementRawData[]): Promise<void> => {
        const currentById = new Map<number, QualityRequirement>();
        for (const requirement of currentRequirements) {
            if (typeof requirement.id === 'number') {
                currentById.set(requirement.id, requirement);
            }
        }

        const parsedIds = new Set(requirements
            .map((requirement: RequirementRawData): number | undefined => requirement.id)
            .filter((id: number | undefined): id is number => typeof id === 'number'));

        const requirementsToDelete = currentRequirements.filter((requirement: QualityRequirement): boolean => (
            typeof requirement.id === 'number' && !parsedIds.has(requirement.id) && !requirement.isDefault
        ));

        for (const requirement of requirementsToDelete) {
            await requirement.delete();
        }

        for (const rawRequirement of requirements) {
            if (typeof rawRequirement.id === 'number' && currentById.has(rawRequirement.id)) {
                await currentById.get(rawRequirement.id)?.save(rawToSaveFields(rawRequirement) as any);
            } else {
                await core.analytics.quality.requirements.create({
                    ...rawToSaveFields(rawRequirement),
                    settings_id: rawRequirement.settings_id ?? settings.id,
                });
            }
        }
    };

    const submitRawRequirements = async (values: Store): Promise<void> => {
        const parsed = parseRawRequirements(values.requirements);

        const runSubmit = async (): Promise<void> => {
            try {
                setSubmitting(true);
                await applyRawRequirements(parsed);
                await onReload();
                notification.info({ message: 'Requirements have been updated' });
            } catch (error: unknown) {
                notification.error({
                    message: 'Could not update requirements',
                    description: error instanceof Error ? error.message : '',
                });
                throw error;
            } finally {
                setSubmitting(false);
            }
        };

        const currentIds = new Set(currentRequirements
            .map((requirement: QualityRequirement): number | undefined => requirement.id)
            .filter((id: number | undefined): id is number => typeof id === 'number'));
        const parsedIds = new Set(parsed
            .map((requirement: RequirementRawData): number | undefined => requirement.id)
            .filter((id: number | undefined): id is number => typeof id === 'number'));
        const hasDeletedRequirements = [...currentIds].some((id: number): boolean => !parsedIds.has(id));

        if (hasDeletedRequirements) {
            Modal.confirm({
                title: 'Delete removed requirements?',
                content: 'Requirements missing from the raw JSON will be deleted.',
                okText: 'Delete and save',
                okButtonProps: { danger: true },
                onOk: runSubmit,
            });
        } else {
            await runSubmit();
        }
    };

    return (
        <Form
            form={form}
            layout='vertical'
            onFinish={submitRawRequirements}
            disabled={disabled || submitting}
        >
            <Form.Item
                name='requirements'
                initialValue={initialValue}
                rules={[{ validator: validateRawRequirements }]}
            >
                <Input.TextArea
                    rows={28}
                    className='cvat-quality-requirements-raw-viewer'
                />
            </Form.Item>
            <div className='cvat-quality-requirements-raw-actions'>
                <Button
                    type='primary'
                    htmlType='submit'
                    loading={submitting}
                    disabled={disabled}
                >
                    Apply
                </Button>
                <Button
                    type='primary'
                    danger
                    disabled={disabled || submitting}
                    onClick={resetRawRequirements}
                >
                    Cancel
                </Button>
            </div>
        </Form>
    );
}
