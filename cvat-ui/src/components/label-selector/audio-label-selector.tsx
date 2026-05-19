// Copyright (C) CVAT.ai Corporation
// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useMemo, useState } from 'react';
import Select, { SelectProps, DefaultOptionType } from 'antd/lib/select';

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

export default function AudioLabelSelector(props: Props): JSX.Element {
    const {
        labels, value, onChange, onEnterPress, withLabelColor, ...rest
    } = props;
    const dynamicProps = value ?
        { value: typeof value === 'number' ? value : value.id } :
        {};

    const [enterPressed, setEnterPressed] = useState(false);

    useEffect(() => {
        if (enterPressed && onEnterPress) {
            onEnterPress(value);
            setEnterPressed(false);
        }
    }, [value, enterPressed]);

    const options = useMemo<DefaultOptionType[]>(() => (
        labels.map((label: any) => ({
            value: label.id,
            title: label.name,
            label: withLabelColor ? (
                <span className='cvat-label-selector-option'>
                    <LabelColorDot color={label.color} />
                    {label.name}
                </span>
            ) : label.name,
        }))
    ), [labels, withLabelColor]);

    return (
        <Select
            virtual={false}
            {...rest}
            {...dynamicProps}
            showSearch
            optionFilterProp='title'
            defaultValue={labels[0].id}
            options={options}
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
        />
    );
}
