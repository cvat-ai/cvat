// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useState,
} from 'react';
import Select from 'antd/lib/select';
import Collapse from 'antd/lib/collapse';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import TextArea from 'antd/lib/input/TextArea';

import { AudioIntervalState, Label, Attribute } from 'cvat-core-wrapper';
import { clamp } from 'utils/math';
import { ColorBy } from 'reducers';
import { AudioIntervalActionShortcuts } from './audio-interval-actions';
import AudioIntervalHeader from './audio-interval-header';

interface AudioRegionDetailsProps {
    interval: AudioIntervalState;
    intervalIndex: number;
    labels: Label[];
    onChangeLabel(labelId: number): void;
    onChangeAttribute(attrID: number, value: string): void;
    colorBy: ColorBy;
    regionColor: string;
    intervalActionShortcuts: AudioIntervalActionShortcuts;
}

function TextAttributeInput({
    attributeID, value, disabled, onChange,
}: {
    attributeID: number;
    value: string;
    disabled: boolean;
    onChange(attrID: number, value: string): void;
}): JSX.Element {
    // Using local value prevents the value to be replaced in the text area on every keystroke
    // It helps keeping the caret position as well as working system shortcuts like undo/redo
    const [localValue, setLocalValue] = useState(value);

    // Keep the draft in sync with changes initiated outside this editor, e.g. undo/redo command.
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    // Update after the local state change to avoid interrupting IME composition.
    // (wrap to internal use effect to avoid issues e.g. with chinese keyboard)
    useEffect(() => {
        if (localValue !== value) {
            onChange(attributeID, localValue);
        }
    }, [localValue]);

    return (
        <TextArea
            rows={4}
            size='small'
            value={localValue}
            disabled={disabled}
            onChange={(event) => {
                setLocalValue(event.target.value);
            }}
        />
    );
}

function AttributeInput({
    attribute, value, disabled, onChange,
}: {
    attribute: Attribute;
    value: string;
    disabled: boolean;
    onChange(attrID: number, val: string): void;
}): JSX.Element {
    if (attribute.inputType === 'checkbox') {
        return (
            <Checkbox
                checked={value === 'true'}
                disabled={disabled}
                onChange={(e) => onChange(attribute.id!, e.target.checked ? 'true' : 'false')}
            >
                {attribute.name}
            </Checkbox>
        );
    }

    if (attribute.inputType === 'radio') {
        return (
            <Radio.Group
                size='small'
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(attribute.id!, e.target.value)}
            >
                {attribute.values.map((v: string) => (
                    <Radio key={v} value={v}>{v}</Radio>
                ))}
            </Radio.Group>
        );
    }

    if (attribute.inputType === 'select') {
        return (
            <Select
                size='small'
                value={value}
                disabled={disabled}
                onChange={(v: string) => onChange(attribute.id!, v)}
                style={{ width: '100%' }}
            >
                {attribute.values.map((v: string) => (
                    <Select.Option key={v} value={v}>{v}</Select.Option>
                ))}
            </Select>
        );
    }

    if (attribute.inputType === 'number') {
        const [min, max, step] = attribute.values.map(Number);
        return (
            <InputNumber
                size='small'
                value={Number(value)}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                onChange={(v) => {
                    if (v !== null) {
                        onChange(attribute.id!, String(clamp(v, min, max)));
                    }
                }}
                style={{ width: '100%' }}
            />
        );
    }

    return (
        <TextAttributeInput
            attributeID={attribute.id!}
            value={value}
            disabled={disabled}
            onChange={onChange}
        />
    );
}

function AudioRegionDetails(props: AudioRegionDetailsProps): JSX.Element {
    const {
        interval,
        intervalIndex,
        labels,
        onChangeLabel,
        onChangeAttribute,
        colorBy,
        regionColor,
        intervalActionShortcuts,
    } = props;

    const isReadonly = !!interval.lock;

    const handleChangeAttribute = useCallback((attrID: number, value: string) => {
        onChangeAttribute(attrID, value);
    }, [onChangeAttribute]);

    const activeLabel = interval.label.id != null ? labels.find((label) => label.id === interval.label.id) : null;
    const attributes: Attribute[] = activeLabel?.attributes ?? [];

    const [expandedByRegion, setExpandedByRegion] = useState<Record<string, string[]>>({});
    const expandedKey = String(interval.clientID);
    const attributeKeys = attributes.map((attribute) => `attr-${attribute.id}`);
    const expandedKeys = expandedByRegion[expandedKey] ?? attributeKeys;

    const handleCollapseChange = useCallback((next: string | string[]) => {
        const arr = Array.isArray(next) ? next : [next];
        setExpandedByRegion((prev) => ({ ...prev, [expandedKey]: arr }));
    }, [expandedKey]);
    return (
        <div
            className='cvat-audio-region-details'
            style={{ '--region-item-color': regionColor } as React.CSSProperties}
        >
            <AudioIntervalHeader
                interval={interval}
                intervalIndex={intervalIndex}
                labels={labels}
                isReadonly={isReadonly}
                showSource
                colorBy={colorBy}
                shortcuts={intervalActionShortcuts}
                isCompact={false}
                onChangeLabel={onChangeLabel}
            />

            <div className='cvat-audio-region-details-content'>
                {attributes.length > 0 && (
                    <Collapse
                        className='cvat-audio-region-attributes-collapse'
                        activeKey={expandedKeys}
                        onChange={handleCollapseChange}
                        items={attributes.map((attribute: Attribute) => ({
                            key: `attr-${attribute.id}`,
                            label: (
                                <div className='cvat-audio-region-attr-header'>
                                    <span className='cvat-audio-region-attr-name'>
                                        {attribute.name}
                                    </span>
                                </div>
                            ),
                            children: (
                                <AttributeInput
                                    attribute={attribute}
                                    value={interval.attributes[attribute.id!] ?? attribute.defaultValue}
                                    disabled={isReadonly}
                                    onChange={handleChangeAttribute}
                                />
                            ),
                        }))}
                    />
                )}
                {attributes.length === 0 && activeLabel && (
                    <div className='cvat-audio-region-no-attributes'>
                        No attributes defined for this label
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(AudioRegionDetails);
