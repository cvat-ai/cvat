import React, { useCallback, useState } from 'react';
import Select from 'antd/lib/select';
import Collapse from 'antd/lib/collapse';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import InputNumber from 'antd/lib/input-number';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import { EditOutlined } from '@ant-design/icons';

import { AudioRegion } from 'reducers';
import { Label, Attribute } from 'cvat-core-wrapper';
import { clamp } from 'utils/math';
import { formatTimeShort } from 'utils/format-audio-time';

interface AudioRegionDetailsProps {
    region: AudioRegion;
    regionIndex: number;
    labels: Label[];
    onChangeLabel(labelId: number): void;
    onChangeAttribute(attrID: number, value: string): void;
}

function formatDuration(seconds: number): string {
    const total = Math.max(0, seconds);
    if (total < 60) return `${total.toFixed(1)}s`;
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${mins}m ${secs}s`;
}

function AttributeInput({
    attribute, value, disabled, onChange,
}: {
    attribute: Attribute;
    value: string;
    disabled: boolean;
    onChange(attrID: number, val: string): void;
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
        <Input.TextArea
            rows={4}
            size='small'
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(attribute.id!, e.target.value)}
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
        region,
        regionIndex,
        labels,
        onChangeLabel,
        onChangeAttribute,
    } = props;

    const activeLabel = region.labelId != null ?
        labels.find((l) => l.id === region.labelId) : null;

    const isReadonly = !!region.locked;
    const duration = Math.max(0, region.end - region.start);

    const handleChangeAttribute = useCallback((attrID: number, value: string) => {
        onChangeAttribute(attrID, value);
    }, [onChangeAttribute]);

    const attributes: Attribute[] = activeLabel?.attributes ?? [];

    const [expandedByRegion, setExpandedByRegion] = useState<Record<string, string[]>>({});
    const expandedKeys = expandedByRegion[region.id] ?? [];

    const handleCollapseChange = useCallback((next: string | string[]) => {
        const arr = Array.isArray(next) ? next : [next];
        setExpandedByRegion((prev) => ({ ...prev, [region.id]: arr }));
    }, [region.id]);

    return (
        <div className='cvat-audio-region-details'>
            <div className='cvat-audio-region-details-header'>
                <span className='cvat-audio-region-details-index'>
                    {regionIndex + 1}
                </span>
                {labels.length > 0 && (
                    <LabelSelectorTrigger
                        labels={labels}
                        activeLabel={activeLabel}
                        isReadonly={isReadonly}
                        onChangeLabel={onChangeLabel}
                    />
                )}
                {region.source && (
                    <span
                        className='cvat-audio-region-details-source'
                        title={`Source: ${region.source}`}
                    >
                        {region.source}
                    </span>
                )}
                <span className='cvat-audio-region-details-time-range'>
                    {`${formatTimeShort(region.start)} \u2013 ${formatTimeShort(region.end)}`}
                </span>
                <span className='cvat-audio-region-details-duration'>
                    {`(${formatDuration(duration)})`}
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
                                    value={region.attributes[attribute.id!] ?? attribute.defaultValue}
                                    disabled={isReadonly}
                                    onChange={handleChangeAttribute}
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
