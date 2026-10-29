// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useId } from 'react';
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

const parseThresholdCoordinate = (input: string | number | null | undefined, percentage = false): number | null => {
    const text = String(input ?? '').trim().replace(',', '.');
    const number = text ? Number(text) : NaN;
    return Number.isFinite(number) ? number / (percentage ? 100 : 1) : null;
};

const canInsertCoordinate = (input: HTMLInputElement, text: string): boolean => {
    const next = (input.value.slice(0, input.selectionStart) + text + input.value.slice(input.selectionEnd))
        .trim().replace(',', '.');
    const parts = next.split('.');
    return /^[+-]?[\d.]*$/.test(next) && parts.length <= 2 && (parts[1]?.length ?? 0) <= 2;
};

const formatInputCoordinate = (number: number | undefined, info: { userTyping: boolean; input: string }): string => {
    if (info.userTyping) return info.input;
    if (number === null || number === undefined || String(number) === '') return '';
    return formatThresholdCoordinate(Number(number));
};

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
    const displayed = percentage ? thresholdPercent(value) : value;

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
                precision={2}
                changeOnBlur={false}
                disabled={disabled}
                formatter={formatInputCoordinate}
                parser={(input) => parseThresholdCoordinate(input) ?? NaN}
                onFocus={onFocus}
                onBlur={onCommit}
                onBeforeInput={(event: React.CompositionEvent<HTMLInputElement>) => {
                    if (event.data && !canInsertCoordinate(event.currentTarget, event.data)) event.preventDefault();
                }}
                onPaste={(event) => {
                    if (!canInsertCoordinate(event.currentTarget, event.clipboardData.getData('text'))) {
                        event.preventDefault();
                    }
                }}
                onChange={(number) => onChange(parseThresholdCoordinate(number, percentage))}
                onInput={(text) => {
                    const number = parseThresholdCoordinate(text, percentage);
                    // InputNumber does not emit onChange for text outside its min/max range.
                    if (number === null || number < 0 || (percentage && number > 1)) {
                        onChange(number);
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
