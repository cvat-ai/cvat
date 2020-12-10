// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useRef } from 'react';
import { Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';

import consts from 'consts';
import { clamp } from 'utils/math';

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
        attrInputType, attrValues, attrValue, attrName, attrID, readonly, changeAttribute,
    } = props;

    const attrNameStyle: React.CSSProperties = { wordBreak: 'break-word', lineHeight: '1em' };

    if (attrInputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox
                    className='cvat-object-item-checkbox-attribute'
                    checked={attrValue === 'true'}
                    disabled={readonly}
                    onChange={(event: CheckboxChangeEvent): void => {
                        const value = event.target.checked ? 'true' : 'false';
                        changeAttribute(attrID, value);
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
                        value={attrValue}
                        onChange={(event: RadioChangeEvent): void => {
                            changeAttribute(attrID, event.target.value);
                        }}
                    >
                        {attrValues.map(
                            (value: string): JSX.Element => (
                                <Radio key={value} value={value}>
                                    {value === consts.UNDEFINED_ATTRIBUTE_VALUE ? consts.NO_BREAK_SPACE : value}
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
                            changeAttribute(attrID, value);
                        }}
                        value={attrValue}
                        className='cvat-object-item-select-attribute'
                    >
                        {attrValues.map(
                            (value: string): JSX.Element => (
                                <Select.Option key={value} value={value}>
                                    {value === consts.UNDEFINED_ATTRIBUTE_VALUE ? consts.NO_BREAK_SPACE : value}
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
                        onChange={(value: number | undefined | string): void => {
                            if (typeof value !== 'undefined') {
                                changeAttribute(attrID, `${clamp(+value, min, max)}`);
                            }
                        }}
                        value={+attrValue}
                        className='cvat-object-item-number-attribute'
                        min={min}
                        max={max}
                        step={step}
                    />
                </Col>
            </>
        );
    }

    const ref = useRef<Input>(null);
    const [selection, setSelection] = useState<{
        start: number | null;
        end: number | null;
        direction: 'forward' | 'backward' | 'none' | null;
    }>({
        start: null,
        end: null,
        direction: null,
    });

    useEffect(() => {
        if (ref.current && ref.current.input) {
            ref.current.input.selectionStart = selection.start;
            ref.current.input.selectionEnd = selection.end;
            ref.current.input.selectionDirection = selection.direction;
        }
    }, [attrValue]);

    return (
        <>
            <Col span={8} style={attrNameStyle}>
                <Text className='cvat-text'>{attrName}</Text>
            </Col>
            <Col span={16}>
                <Input
                    ref={ref}
                    size='small'
                    disabled={readonly}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        if (ref.current && ref.current.input) {
                            setSelection({
                                start: ref.current.input.selectionStart,
                                end: ref.current.input.selectionEnd,
                                direction: ref.current.input.selectionDirection,
                            });
                        }

                        changeAttribute(attrID, event.target.value);
                    }}
                    value={attrValue}
                    className='cvat-object-item-text-attribute'
                />
            </Col>
        </>
    );
}

export default React.memo(ItemAttributeComponent, attrIsTheSame);
