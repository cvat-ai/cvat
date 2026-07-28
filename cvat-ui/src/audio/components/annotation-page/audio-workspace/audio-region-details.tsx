// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import Select from 'antd/lib/select';
import Collapse from 'antd/lib/collapse';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import TextArea from 'antd/lib/input/TextArea';
import Popover from 'antd/lib/popover';
import Tooltip from 'antd/lib/tooltip';
import { EditOutlined } from '@ant-design/icons';

import { AudioIntervalState, Label, Attribute } from 'cvat-core-wrapper';
import { ActiveControl } from 'reducers';
import { clamp } from 'utils/math';
import { formatTimeShort, formatMilliseconds } from 'audio/utils/format-audio-time';
import { type TextareaFocusBookmark, useTextareaFocusBookmark } from 'audio/hooks/use-textarea-focus-bookmark';

interface AudioRegionDetailsProps {
    interval: AudioIntervalState;
    intervalIndex: number;
    labels: Label[];
    activeControl: ActiveControl;
    trackDurationSeconds: number;
    onChangeLabel(labelId: number): void;
    onChangeAttribute(attrID: number, value: string): void;
}

function canRestoreOutsideOverlay(event: KeyboardEvent): boolean {
    return !(event.target instanceof Element && event.target.closest(
        '.ant-modal, .ant-popover, .ant-dropdown, .ant-select-dropdown',
    ));
}

function TextAttributeInput({
    attributeID, value, disabled, onChange, textareaFocusBookmark,
}: {
    attributeID: number;
    value: string;
    disabled: boolean;
    onChange(attrID: number, value: string): void;
    textareaFocusBookmark: TextareaFocusBookmark | null;
}): JSX.Element {
    // Using local value prevents the value to be replaced in the text area on every keystroke
    // It helps keeping the caret position as well as working system shortcuts like undo/redo
    const [localValue, setLocalValue] = useState(value);

    // Keep the draft in sync with changes initiated outside this editor, e.g. undo/redo command.
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value);
        }
    }, [value]);

    // Update after the local state change to avoid interrupting IME composition.
    // (wrap to internal use effect to avoid issues e.g. with chinese keyboard)
    useEffect(() => {
        if (localValue !== value) {
            onChange(attributeID, localValue);
        }
    }, [localValue]);

    const hasFocusBookmark = textareaFocusBookmark?.element.getAttribute('data-cvat-attribute-id') === String(attributeID);

    return (
        <div className='cvat-audio-region-textarea'>
            <TextArea
                rows={4}
                size='small'
                value={localValue}
                disabled={disabled}
                data-cvat-attribute-id={attributeID}
                onChange={(event) => {
                    setLocalValue(event.target.value);
                }}
            />
            {hasFocusBookmark ? (
                <Tooltip title='Shortcuts are active. Press Esc in Cursor mode to resume editing here.'>
                    <span
                        className='cvat-audio-region-textarea-bookmark-caret'
                        style={{
                            left: textareaFocusBookmark.marker.left,
                            top: textareaFocusBookmark.marker.top,
                            height: textareaFocusBookmark.marker.height,
                        }}
                    />
                </Tooltip>
            ) : null}
        </div>
    );
}

function AttributeInput({
    attribute, value, disabled, onChange, textareaFocusBookmark,
}: {
    attribute: Attribute;
    value: string;
    disabled: boolean;
    onChange(attrID: number, val: string): void;
    textareaFocusBookmark: TextareaFocusBookmark | null;
}): JSX.Element {
    if (attribute.inputType === 'checkbox') {
        return (
            <Checkbox
                checked={value === 'true'}
                disabled={disabled}
                onChange={(e) => onChange(attribute.id!, e.target.checked ? 'true' : 'false')}
            >
                {attribute.name}
            </Checkbox>
        );
    }

    if (attribute.inputType === 'radio') {
        return (
            <Radio.Group
                size='small'
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(attribute.id!, e.target.value)}
            >
                {attribute.values.map((v: string) => (
                    <Radio key={v} value={v}>{v}</Radio>
                ))}
            </Radio.Group>
        );
    }

    if (attribute.inputType === 'select') {
        return (
            <Select
                size='small'
                value={value}
                disabled={disabled}
                onChange={(v: string) => onChange(attribute.id!, v)}
                style={{ width: '100%' }}
            >
                {attribute.values.map((v: string) => (
                    <Select.Option key={v} value={v}>{v}</Select.Option>
                ))}
            </Select>
        );
    }

    if (attribute.inputType === 'number') {
        const [min, max, step] = attribute.values.map(Number);
        return (
            <InputNumber
                size='small'
                value={Number(value)}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                onChange={(v) => {
                    if (v !== null) {
                        onChange(attribute.id!, String(clamp(v, min, max)));
                    }
                }}
                style={{ width: '100%' }}
            />
        );
    }

    return (
        <TextAttributeInput
            attributeID={attribute.id!}
            value={value}
            disabled={disabled}
            onChange={onChange}
            textareaFocusBookmark={textareaFocusBookmark}
        />
    );
}

function LabelSelectorTrigger({
    labels, activeLabel, isReadonly, onChangeLabel,
}: {
    labels: Label[];
    activeLabel: Label | null | undefined;
    isReadonly: boolean;
    onChangeLabel(labelId: number): void;
}): JSX.Element {
    const [open, setOpen] = useState(false);

    const popoverContent = (
        <div className='cvat-audio-region-label-popover-content'>
            {labels.map((label) => (
                <div
                    key={label.id}
                    role='button'
                    tabIndex={0}
                    className={`cvat-audio-region-label-option${
                        label.id === activeLabel?.id ? ' cvat-audio-region-label-option--active' : ''
                    }`}
                    onClick={() => {
                        if (label.id != null) {
                            onChangeLabel(label.id);
                            setOpen(false);
                        }
                    }}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && label.id != null) {
                            onChangeLabel(label.id);
                            setOpen(false);
                        }
                    }}
                >
                    <span
                        className='cvat-audio-region-label-option-color'
                        style={{ backgroundColor: label.color || '#9CA3AF' }}
                    />
                    <span className='cvat-audio-region-label-option-name'>{label.name}</span>
                </div>
            ))}
        </div>
    );

    return (
        <Popover
            content={popoverContent}
            trigger='click'
            placement='bottomLeft'
            open={!isReadonly && open}
            onOpenChange={(visible) => !isReadonly && setOpen(visible)}
            overlayClassName='cvat-audio-region-label-popover'
        >
            <div
                className='cvat-audio-region-label-trigger'
                role='button'
                tabIndex={0}
            >
                <span
                    className='cvat-audio-region-label-color'
                    style={{ backgroundColor: activeLabel?.color || '#9CA3AF' }}
                />
                <span className='cvat-audio-region-label-trigger-name'>
                    {activeLabel?.name || 'No label'}
                </span>
                {!isReadonly && (
                    <EditOutlined className='cvat-audio-region-label-edit-icon' />
                )}
            </div>
        </Popover>
    );
}

function AudioRegionDetails(props: AudioRegionDetailsProps): JSX.Element {
    const {
        interval,
        intervalIndex,
        labels,
        activeControl,
        trackDurationSeconds,
        onChangeLabel,
        onChangeAttribute,
    } = props;

    const activeLabel = interval.label.id != null ?
        labels.find((l) => l.id === interval.label.id) : null;

    const isReadonly = !!interval.lock;
    const bookmarkScope = `${interval.clientID}:${interval.label.id}:${isReadonly}`;
    const startMs = interval.start;
    const endMs = interval.stop ?? (trackDurationSeconds ? trackDurationSeconds * 1000 : interval.start);
    const durationMs = Math.max(0, endMs - startMs);
    const startSeconds = startMs / 1000;
    const endSeconds = endMs / 1000;

    const handleChangeAttribute = useCallback((attrID: number, value: string) => {
        onChangeAttribute(attrID, value);
    }, [onChangeAttribute]);

    const attributes: Attribute[] = activeLabel?.attributes ?? [];

    const [expandedByRegion, setExpandedByRegion] = useState<Record<string, string[]>>({});
    const detailsRef = useRef<HTMLDivElement>(null);
    const canRestoreTextareaFocusBookmark = useCallback((event: KeyboardEvent) => (
        activeControl === ActiveControl.CURSOR && canRestoreOutsideOverlay(event)
    ), [activeControl]);
    const { bookmark: textareaFocusBookmark } = useTextareaFocusBookmark(
        detailsRef,
        canRestoreTextareaFocusBookmark,
        bookmarkScope,
    );

    const handleEscape = useCallback((event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
            const { activeElement } = window.document;
            if (activeElement instanceof HTMLElement && detailsRef.current?.contains(activeElement)) {
                event.preventDefault();
                event.stopPropagation();
                activeElement.blur();
            }
        }
    }, []);
    const expandedKey = String(interval.clientID);
    const attributeKeys = attributes.map((attribute) => `attr-${attribute.id}`);
    const expandedKeys = expandedByRegion[expandedKey] ?? attributeKeys;

    const handleCollapseChange = useCallback((next: string | string[]) => {
        const arr = Array.isArray(next) ? next : [next];
        setExpandedByRegion((prev) => ({ ...prev, [expandedKey]: arr }));
    }, [expandedKey]);

    return (
        <div ref={detailsRef} className='cvat-audio-region-details' onKeyDownCapture={handleEscape}>
            <div className='cvat-audio-region-details-header'>
                <span className='cvat-audio-region-details-index'>
                    {intervalIndex + 1}
                </span>
                {labels.length > 0 && (
                    <LabelSelectorTrigger
                        labels={labels}
                        activeLabel={activeLabel}
                        isReadonly={isReadonly}
                        onChangeLabel={onChangeLabel}
                    />
                )}
                {interval.source && (
                    <span
                        className='cvat-audio-region-details-source'
                        title={`Source: ${interval.source}`}
                    >
                        {interval.source}
                    </span>
                )}
                <span className='cvat-audio-region-details-time-range'>
                    {`${formatTimeShort(startSeconds)} \u2013 ${formatTimeShort(endSeconds)}`}
                </span>
                <span className='cvat-audio-region-details-duration'>
                    {`(${formatMilliseconds(durationMs)})`}
                </span>
            </div>

            <div className='cvat-audio-region-details-content'>
                {attributes.length > 0 && (
                    <Collapse
                        className='cvat-audio-region-attributes-collapse'
                        activeKey={expandedKeys}
                        onChange={handleCollapseChange}
                        items={attributes.map((attribute: Attribute) => ({
                            key: `attr-${attribute.id}`,
                            label: (
                                <div className='cvat-audio-region-attr-header'>
                                    <span className='cvat-audio-region-attr-name'>
                                        {attribute.name}
                                    </span>
                                </div>
                            ),
                            children: (
                                <AttributeInput
                                    attribute={attribute}
                                    value={interval.attributes[attribute.id!] ?? attribute.defaultValue}
                                    disabled={isReadonly}
                                    onChange={handleChangeAttribute}
                                    textareaFocusBookmark={textareaFocusBookmark}
                                />
                            ),
                        }))}
                    />
                )}
                {attributes.length === 0 && activeLabel && (
                    <div className='cvat-audio-region-no-attributes'>
                        No attributes defined for this label
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(AudioRegionDetails);
