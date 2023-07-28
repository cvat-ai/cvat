// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Select, { SelectProps } from 'antd/lib/select';
// eslint-disable-next-line import/no-extraneous-dependencies
import { OptionData, OptionGroupData } from 'rc-select/lib/interface';

interface Props extends SelectProps<string> {
    labels: any[];
    value: any | number | null;
    onChange: (label: any) => void;
    onEnterPress?: (labelID: number) => void;
}

export default function LabelSelector(props: Props): JSX.Element {
    const {
        labels, value, onChange, onEnterPress, ...rest
    } = props;
    const dynamicProps = value ?
        {
            value: typeof value === 'number' ? value : value.id,
        } :
        {};

    const [enterPressed, setEnterPressed] = useState(false);

    useEffect(() => {
        if (enterPressed && onEnterPress) {
            onEnterPress(value);
            setEnterPressed(false);
        }
    }, [value, enterPressed]);

    return (
        <Select
            virtual={false}
            {...rest}
            {...dynamicProps}
            showSearch
            filterOption={(input: string, option?: OptionData | OptionGroupData) => {
                if (option) {
                    const { children } = option.props;
                    if (typeof children === 'string') {
                        return children.toLowerCase().includes(input.toLowerCase());
                    }
                }

                return false;
            }}
            defaultValue={labels[0].id}
            onChange={(newValue: string) => {
                const [label] = labels.filter((_label: any): boolean => _label.id === +newValue);
                if (label) {
                    onChange(label);
                } else {
                    throw new Error(`Label with id ${newValue} was not found within the list`);
                }
            }}
            onInputKeyDown={(event) => {
                if (onEnterPress) {
                    setEnterPressed(event.key === 'Enter');
                }
            }}
        >
            {labels.map((label: any) => (
                <Select.Option title={label.name} key={label.id} value={label.id}>
                    {label.name}
                </Select.Option>
            ))}
        </Select>
    );
}
