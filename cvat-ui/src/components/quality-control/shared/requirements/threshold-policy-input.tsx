// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useId, useState } from 'react';
import Form from 'antd/lib/form';
import InputNumber from 'antd/lib/input-number';

export const formatThresholdCoordinate = (value: number): string => (
    Number.isFinite(value) ? value.toLocaleString(undefined, {
        maximumFractionDigits: 2, useGrouping: false,
    }) : ''
);

export const thresholdPercent = (value: number): number => Number((value * 100).toPrecision(15));

export const thresholdValueError = (value: number): string => (
    Number.isFinite(value) && value >= 0 && value <= 1 ? '' : 'IoU must be between 0 and 100%.'
);

interface Props {
    id: string;
    label: string;
    value: number;
    error: string;
    disabled: boolean;
    percentage?: boolean;
    onFocus?: () => void;
    onChange: (value: number | null) => void;
    onCommit: () => void;
}

export default function ThresholdPolicyInput(props: Readonly<Props>): JSX.Element {
    const {
        id, label, value, error, disabled, percentage = false, onFocus, onChange, onCommit,
    } = props;
    const errorID = useId();
    const [focused, setFocused] = useState(false);
    const displayed = percentage ? thresholdPercent(value) : value;
    const format = useCallback((number: number | undefined, info: { userTyping: boolean; input: string }): string => {
        if (info.userTyping) return info.input;
        if (number === null || number === undefined || String(number) === '') return '';
        return focused ? String(number) : formatThresholdCoordinate(Number(number));
    }, [focused]);

    return (
        <Form.Item className='cvat-threshold-policy-field'
            validateStatus={error ? 'error' : undefined}
            help={error ? <span id={errorID} role='alert'>{error}</span> : null}>
            <InputNumber
                id={id}
                aria-label={label}
                aria-invalid={!!error}
                aria-describedby={error ? errorID : undefined}
                value={Number.isFinite(displayed) ? displayed : null}
                min={0}
                max={percentage ? 100 : undefined}
                step={1}
                changeOnBlur={false}
                disabled={disabled}
                formatter={format}
                parser={(input) => (input?.trim() ? Number(input.replace(',', '.')) : NaN)}
                onFocus={() => { setFocused(true); onFocus?.(); }}
                onBlur={() => { setFocused(false); onCommit(); }}
                onChange={(number) => onChange(number === null || !percentage ? number : number / 100)}
                onInput={(text) => {
                    const number = text.trim() ? Number(text.replace(',', '.')) : NaN;
                    // InputNumber does not emit onChange for text outside its min/max range.
                    if (!Number.isFinite(number) || number < 0 || (percentage && number > 100)) {
                        onChange(Number.isFinite(number) ? number / (percentage ? 100 : 1) : null);
                    }
                }}
                onKeyDownCapture={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.blur();
                    }
                }}
            />
        </Form.Item>
    );
}
