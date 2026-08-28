// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Select from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Input from 'antd/lib/input';
import Alert from 'antd/lib/alert';

import config from 'config';
import { clamp } from 'utils/math';
import {
    Attribute, ObjectState, ObjectType,
} from 'cvat-core-wrapper';

interface Props {
    open: boolean;
    states: ObjectState[];
    attributes: Attribute[];
    onApply(values: Record<number, string>): void;
    onClose(): void;
}

function SelectionAttributesEditor(props: Props): JSX.Element {
    const {
        open, states, attributes, onApply, onClose,
    } = props;
    const [changes, setChanges] = React.useState<Record<number, string>>({});

    React.useEffect(() => {
        if (open) setChanges({});
    }, [open]);

    const setValue = (attributeID: number, value: string): void => {
        setChanges((current) => ({ ...current, [attributeID]: value }));
    };
    const displayValue = (value: string): string => (
        value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value
    );
    const commonValue = (attributeID: number): string | undefined => {
        const [firstState] = states;
        const value = firstState?.attributes[attributeID];
        return states.every((state: ObjectState): boolean => state.attributes[attributeID] === value) ?
            value : undefined;
    };
    const containsMutableTracks = states.some((state: ObjectState): boolean => (
        state.objectType === ObjectType.TRACK
    )) && attributes.some((attribute: Attribute): boolean => attribute.mutable);

    return (
        <Modal
            open={open}
            title={`Edit attributes for ${states.length} objects`}
            okText='Apply'
            okButtonProps={{ disabled: !Object.keys(changes).length }}
            onOk={(): void => onApply(changes)}
            onCancel={onClose}
            destroyOnClose
            width={520}
        >
            {containsMutableTracks && (
                <Alert
                    type='info'
                    showIcon
                    message='Mutable track attributes are applied at the current frame.'
                    style={{ marginBottom: 16 }}
                />
            )}
            <Form layout='vertical'>
                {attributes.map((attribute: Attribute): JSX.Element => {
                    const attributeID = attribute.id as number;
                    const initialValue = commonValue(attributeID);
                    const changed = Object.hasOwn(changes, attributeID);
                    const value = changed ? changes[attributeID] : initialValue;
                    const mixed = !changed && typeof initialValue === 'undefined';

                    if (attribute.inputType === 'checkbox') {
                        return (
                            <Form.Item key={attributeID}>
                                <Checkbox
                                    checked={value === 'true'}
                                    indeterminate={mixed}
                                    onChange={(event: CheckboxChangeEvent): void => {
                                        setValue(attributeID, event.target.checked ? 'true' : 'false');
                                    }}
                                >
                                    {attribute.name}
                                </Checkbox>
                            </Form.Item>
                        );
                    }

                    if (attribute.inputType === 'radio') {
                        return (
                            <Form.Item
                                key={attributeID}
                                label={attribute.name}
                                extra={mixed ? 'Multiple values' : undefined}
                            >
                                <Radio.Group
                                    value={value}
                                    onChange={(event: RadioChangeEvent): void => {
                                        setValue(attributeID, event.target.value);
                                    }}
                                >
                                    {attribute.values.map((option: string) => (
                                        <Radio key={option} value={option}>
                                            {displayValue(option)}
                                        </Radio>
                                    ))}
                                </Radio.Group>
                            </Form.Item>
                        );
                    }

                    if (attribute.inputType === 'select') {
                        return (
                            <Form.Item key={attributeID} label={attribute.name}>
                                <Select
                                    value={value}
                                    placeholder={mixed ? 'Multiple values' : undefined}
                                    onChange={(selected: string): void => setValue(attributeID, selected)}
                                    options={attribute.values.map((option: string) => ({
                                        value: option,
                                        label: displayValue(option),
                                    }))}
                                />
                            </Form.Item>
                        );
                    }

                    if (attribute.inputType === 'number') {
                        const [min, max, step] = attribute.values.map((option: string): number => +option);
                        return (
                            <Form.Item key={attributeID} label={attribute.name}>
                                <InputNumber
                                    value={typeof value === 'undefined' ? null : +value}
                                    placeholder={mixed ? 'Multiple values' : undefined}
                                    min={min}
                                    max={max}
                                    step={step}
                                    style={{ width: '100%' }}
                                    onChange={(number: number | null): void => {
                                        if (number !== null) setValue(attributeID, `${clamp(number, min, max)}`);
                                    }}
                                />
                            </Form.Item>
                        );
                    }

                    return (
                        <Form.Item key={attributeID} label={attribute.name}>
                            <Input.TextArea
                                value={value ?? ''}
                                placeholder={mixed ? 'Multiple values' : undefined}
                                autoSize={{ minRows: 1, maxRows: 5 }}
                                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                                    setValue(attributeID, event.target.value);
                                }}
                            />
                        </Form.Item>
                    );
                })}
            </Form>
        </Modal>
    );
}

export default React.memo(SelectionAttributesEditor);
