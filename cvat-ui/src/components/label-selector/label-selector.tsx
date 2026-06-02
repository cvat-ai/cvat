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
    withLabelColor?: boolean;
}

const LABEL_COLOR_FALLBACK = '#9CA3AF';

function LabelColorDot({ color }: { color: string }): JSX.Element {
    return (
        <span
            className='cvat-label-color-dot'
            style={{ background: color || LABEL_COLOR_FALLBACK }}
        />
    );
}

export default function LabelSelector(props: Props): JSX.Element {
    const {
        labels, value, onChange, onEnterPress, withLabelColor, ...rest
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
                    {withLabelColor ? (
                        <span className='cvat-label-selector-option'>
                            <LabelColorDot color={label.color} />
                            {label.name}
                        </span>
                    ) : label.name}
                </Select.Option>
            ))}
        </Select>
    );
}
