// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useRef } from 'react';
import { Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';

import config from 'config';
import { clamp } from 'utils/math';
import TextArea, { TextAreaRef } from 'antd/lib/input/TextArea';

interface Props {
    readonly: boolean;
    attrInputType: string;
    attrValues: string[];
    attrValue: string;
    attrName: string;
    attrID: number;
    changeAttribute(attrID: number, value: string): void;
}

function attrIsTheSame(prevProps: Props, nextProps: Props): boolean {
    return (
        nextProps.readonly === prevProps.readonly &&
        nextProps.attrID === prevProps.attrID &&
        nextProps.attrValue === prevProps.attrValue &&
        nextProps.attrName === prevProps.attrName &&
        nextProps.attrInputType === prevProps.attrInputType &&
        nextProps.attrValues
            .map((value: string, id: number): boolean => prevProps.attrValues[id] === value)
            .every((value: boolean): boolean => value)
    );
}

function ItemAttributeComponent(props: Props): JSX.Element {
    const {
        attrInputType, attrValues, attrValue,
        attrName, attrID, readonly, changeAttribute,
    } = props;

    const attrNameStyle: React.CSSProperties = { wordBreak: 'break-word', lineHeight: '1em', fontSize: 12 };
    const ref = useRef<TextAreaRef>(null);
    const [selectionStart, setSelectionStart] = useState<number>(attrValue.length);
    const [localAttrValue, setAttributeValue] = useState(attrValue);

    useEffect(() => {
        // attribute value updated from inside the app (for example undo/redo)
        if (attrValue !== localAttrValue) {
            setAttributeValue(attrValue);
        }
    }, [attrValue]);

    useEffect(() => {
        // wrap to internal use effect to avoid issues
        // with chinese keyboard
        // https://github.com/cvat-ai/cvat/pull/6916
        if (localAttrValue !== attrValue) {
            changeAttribute(attrID, localAttrValue);
        }
    }, [localAttrValue]);

    useEffect(() => {
        const textArea = ref?.current?.resizableTextArea?.textArea;
        if (textArea instanceof HTMLTextAreaElement) {
            textArea.selectionStart = selectionStart;
            textArea.selectionEnd = selectionStart;
        }
    }, [attrValue]);

    if (attrInputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox
                    className='cvat-object-item-checkbox-attribute'
                    checked={localAttrValue === 'true'}
                    disabled={readonly}
                    onChange={(event: CheckboxChangeEvent): void => {
                        setAttributeValue(event.target.checked ? 'true' : 'false');
                    }}
                >
                    <Text style={attrNameStyle} className='cvat-text'>
                        {attrName}
                    </Text>
                </Checkbox>
            </Col>
        );
    }

    if (attrInputType === 'radio') {
        return (
            <Col span={24}>
                <fieldset className='cvat-object-item-radio-attribute'>
                    <legend>
                        <Text style={attrNameStyle} className='cvat-text'>
                            {attrName}
                        </Text>
                    </legend>
                    <Radio.Group
                        disabled={readonly}
                        size='small'
                        value={localAttrValue}
                        onChange={(event: RadioChangeEvent): void => {
                            setAttributeValue(event.target.value);
                        }}
                    >
                        {attrValues.map(
                            (value: string): JSX.Element => (
                                <Radio key={value} value={value}>
                                    {value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value}
                                </Radio>
                            ),
                        )}
                    </Radio.Group>
                </fieldset>
            </Col>
        );
    }

    if (attrInputType === 'select') {
        return (
            <>
                <Col span={8} style={attrNameStyle}>
                    <Text className='cvat-text'>{attrName}</Text>
                </Col>
                <Col span={16}>
                    <Select
                        disabled={readonly}
                        size='small'
                        onChange={(value: string): void => {
                            setAttributeValue(value);
                        }}
                        value={localAttrValue}
                        className='cvat-object-item-select-attribute'
                    >
                        {attrValues.map(
                            (value: string): JSX.Element => (
                                <Select.Option key={value} value={value}>
                                    {value === config.UNDEFINED_ATTRIBUTE_VALUE ? config.NO_BREAK_SPACE : value}
                                </Select.Option>
                            ),
                        )}
                    </Select>
                </Col>
            </>
        );
    }

    if (attrInputType === 'number') {
        const [min, max, step] = attrValues.map((value: string): number => +value);
        return (
            <>
                <Col span={8} style={attrNameStyle}>
                    <Text className='cvat-text'>{attrName}</Text>
                </Col>
                <Col span={16}>
                    <InputNumber
                        disabled={readonly}
                        size='small'
                        onChange={(value: number | null): void => {
                            if (value !== null) {
                                setAttributeValue(`${clamp(+value, min, max)}`);
                            }
                        }}
                        value={+localAttrValue}
                        className='cvat-object-item-number-attribute'
                        min={min}
                        max={max}
                        step={step}
                    />
                </Col>
            </>
        );
    }

    return (
        <>
            <Col span={8} style={attrNameStyle}>
                <Text className='cvat-text'>{attrName}</Text>
            </Col>
            <Col span={16}>
                <TextArea
                    ref={ref}
                    size='small'
                    disabled={readonly}
                    style={{
                        height: Math.min(120, attrValue.split('\n').length * 24),
                        minHeight: Math.min(120, attrValue.split('\n').length * 24),
                    }}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        if (ref.current?.resizableTextArea?.textArea) {
                            setSelectionStart(ref.current.resizableTextArea.textArea.selectionStart);
                        }
                        setAttributeValue(event.target.value);
                    }}
                    value={localAttrValue}
                    className='cvat-object-item-text-attribute'
                />
            </Col>
        </>
    );
}

export default React.memo(ItemAttributeComponent, attrIsTheSame);
