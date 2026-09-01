// Copyright (C) CVAT.ai Corporation
// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import Text from 'antd/lib/typography/Text';
import Select, { SelectProps } from 'antd/lib/select';

import CVATTooltip from 'components/common/cvat-tooltip';

interface Props extends SelectProps<string> {
    labels: any[];
    value: any | number | null;
    onChange: (label: any) => void;
    onEnterPress?: (labelID: number) => void;
    tooltip?: React.ReactNode;
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

interface LabelContentProps {
    label: any;
    tooltip?: string;
}

function LabelContent({ label, tooltip }: LabelContentProps): JSX.Element {
    return (
        <span className='cvat-label-selector-option'>
            <LabelColorDot color={label.color} />
            <Text
                ellipsis={tooltip ? {
                    tooltip: {
                        title: tooltip,
                        placement: 'right',
                    },
                } : true}
            >
                {label.name}
            </Text>
        </span>
    );
}

export default function LabelSelector(props: Props): JSX.Element {
    const {
        labels, value, onChange, onEnterPress, onDropdownVisibleChange, tooltip, ...rest
    } = props;
    const dynamicProps = value ?
        {
            value: typeof value === 'number' ? value : value.id,
        } :
        {};

    const [enterPressed, setEnterPressed] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (enterPressed && onEnterPress) {
            onEnterPress(value);
            setEnterPressed(false);
        }
    }, [value, enterPressed]);

    const selector = (
        <Select
            virtual={false}
            {...rest}
            {...dynamicProps}
            optionLabelProp='label'
            showSearch
            filterOption={(input: string, option) => {
                if (option) {
                    const { labelName } = option.props;
                    if (typeof labelName === 'string') {
                        return labelName.toLowerCase().includes(input.toLowerCase());
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
            onDropdownVisibleChange={(open) => {
                setDropdownOpen(open);
                onDropdownVisibleChange?.(open);
            }}
        >
            {labels.map((label: any) => (
                <Select.Option
                    key={label.id}
                    value={label.id}
                    labelName={label.name}
                    label={<LabelContent label={label} />}
                >
                    <LabelContent label={label} tooltip={label.name} />
                </Select.Option>
            ))}
        </Select>
    );

    return tooltip ? (
        <CVATTooltip title={dropdownOpen ? null : tooltip}>
            {selector}
        </CVATTooltip>
    ) : selector;
}
