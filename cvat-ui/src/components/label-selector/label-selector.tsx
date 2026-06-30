// Copyright (C) CVAT.ai Corporation
// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Select, { SelectProps } from 'antd/lib/select';

interface Props extends SelectProps<string> {
    labels: any[];
    value: any | number | null;
    onChange: (label: any) => void;
    onEnterPress?: (labelID: number) => void;
}

function LabelColorDot({ color }: { color?: string }): JSX.Element | null {
    if (!color) {
        return null;
    }

    return (
        <span
            className='cvat-label-color-dot'
            style={{ background: color }}
        />
    );
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
            filterOption={(input: string, option) => {
                if (option) {
                    const { title } = option.props;
                    if (typeof title === 'string') {
                        return title.toLowerCase().includes(input.toLowerCase());
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
                    <span className='cvat-label-selector-option'>
                        <LabelColorDot color={label.color} />
                        {label.name}
                    </span>
                </Select.Option>
            ))}
        </Select>
    );
}
