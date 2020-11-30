// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Select, { OptionProps, SelectProps } from 'antd/lib/select';

interface Props extends SelectProps {
    labels: any[];
    value: any | number | null;
    onChange: (label: any) => void;
}

export default function LabelSelector(props: Props): JSX.Element {
    const {
        labels, value, onChange, ...rest
    } = props;
    const dinamicProps = value ?
        {
            value: typeof value === 'number' ? value : value.id,
        } :
        {};

    return (
        <Select
            {...rest}
            {...dinamicProps}
            showSearch
            filterOption={(input: string, option: React.ReactElement<OptionProps>) => {
                const { children } = option.props;
                if (typeof children === 'string') {
                    return children.toLowerCase().includes(input.toLowerCase());
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
        >
            {labels.map((label: any) => (
                <Select.Option title={label.name} key={label.id} value={label.id}>
                    {label.name}
                </Select.Option>
            ))}
        </Select>
    );
}
